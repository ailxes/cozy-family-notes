import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, Sparkles, Trash2, Camera, PencilLine } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseFlyer, type ParsedEvent, type ParseConfidence } from "@/lib/parseFlyer";
import { SHARED_HOUSEHOLD_ID, type EventCategory } from "@/lib/hearth";
import { CategoryPicker } from "./CategoryPicker";
import { AddEventSheet } from "./AddEventSheet";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Stage = "pick" | "parsing" | "confirm";

interface DraftEvent {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  category: EventCategory;
  description: string;
  preparation_notes: string;
}

function parsedToDraft(p: ParsedEvent): DraftEvent {
  const s = new Date(p.start_datetime);
  const e = p.end_datetime ? new Date(p.end_datetime) : new Date(s.getTime() + 60 * 60 * 1000);
  return {
    title: p.title,
    date: format(s, "yyyy-MM-dd"),
    startTime: format(s, "HH:mm"),
    endTime: format(e, "HH:mm"),
    allDay: p.all_day ?? false,
    category: p.category,
    description: p.description ?? "",
    preparation_notes: p.preparation_notes ?? "",
  };
}

const CONFIDENCE_STYLES: Record<ParseConfidence, string> = {
  high: "bg-emerald-100 text-emerald-900 border-emerald-200",
  medium: "bg-amber-100 text-amber-900 border-amber-200",
  low: "bg-rose-100 text-rose-900 border-rose-200",
};

export function UploadFlyerSheet({ open, onOpenChange }: Props) {
  const householdId = SHARED_HOUSEHOLD_ID;
  const fileInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftEvent[]>([]);
  const [confidence, setConfidence] = useState<ParseConfidence>("medium");
  const [rawText, setRawText] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDescription, setManualDescription] = useState<string>("");
  const qc = useQueryClient();

  const reset = () => {
    setStage("pick");
    setImagePreview(null);
    setImageUrl(null);
    setDrafts([]);
    setConfidence("medium");
    setRawText("");
  };

  const onClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const switchToManual = () => {
    setManualDescription(rawText || "");
    onOpenChange(false);
    reset();
    // Open manual sheet after a tick so the upload sheet finishes closing
    setTimeout(() => setManualOpen(true), 150);
  };

  const onPick = async (file: File) => {
    setImagePreview(URL.createObjectURL(file));
    setStage("parsing");

    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${householdId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("flyers")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("flyers").getPublicUrl(path);
      setImageUrl(pub.publicUrl);

      await supabase.from("uploaded_images").insert({
        household_id: householdId,
        storage_path: path,
      });

      const result = await parseFlyer(path, householdId);
      setConfidence(result.confidence);
      setRawText(result.raw_text_observed ?? "");
      setDrafts(result.events.map(parsedToDraft));
      setStage("confirm");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
      reset();
    }
  };

  const updateDraft = (i: number, patch: Partial<DraftEvent>) => {
    setDrafts((d) => d.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  };

  const removeDraft = (i: number) => {
    setDrafts((d) => d.filter((_, idx) => idx !== i));
  };

  const onConfirm = async () => {
    if (drafts.length === 0) return;
    setSaving(true);
    const rows = drafts.map((d) => {
      const start = d.allDay
        ? new Date(`${d.date}T00:00:00`)
        : new Date(`${d.date}T${d.startTime}:00`);
      const end = d.allDay
        ? null
        : d.endTime
        ? new Date(`${d.date}T${d.endTime}:00`)
        : null;
      return {
        household_id: householdId,
        title: d.title.trim(),
        description: d.description.trim() || null,
        preparation_notes: d.preparation_notes.trim() || null,
        all_day: d.allDay,
        category: d.category,
        source: "photo_upload",
        source_image_url: imageUrl,
        start_datetime: start.toISOString(),
        end_datetime: end ? end.toISOString() : null,
      };
    });
    const { error } = await supabase.from("events").insert(rows);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      drafts.length === 1 ? "Event added" : `${drafts.length} events added`,
    );
    qc.invalidateQueries({ queryKey: ["events"] });
    onClose(false);
  };

  const showLowFallback = stage === "confirm" && (confidence === "low" || drafts.length === 0);

  return (
    <>
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="h-[92vh] rounded-t-3xl p-0 flex flex-col md:max-w-lg md:mx-auto"
      >
        <SheetHeader className="px-6 pt-6 pb-2 text-left">
          <SheetTitle className="font-serif text-2xl">
            {stage === "confirm" ? "Confirm events" : "Upload flyer"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {stage === "pick" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Snap a photo of a school flyer or screenshot. We'll pull out the
                dates and details for you to confirm.
              </p>
              <button
                onClick={() => fileInput.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-2xl py-12 px-6 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-secondary/50 transition-colors"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <div className="font-medium">Take a photo or choose one</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, or HEIC
                  </div>
                </div>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPick(f);
                }}
              />
            </div>
          )}

          {stage === "parsing" && (
            <div className="flex flex-col items-center justify-center py-16 gap-5">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Uploading"
                  className="w-40 h-40 rounded-2xl object-cover border border-border opacity-70"
                />
              )}
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span className="font-medium">Reading your flyer...</span>
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                This can take a few seconds while AI finds dates, times, and what to bring.
              </p>
            </div>
          )}

          {stage === "confirm" && (
            <div className="space-y-6">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Source flyer"
                  className="w-full max-h-48 object-cover rounded-xl border border-border"
                />
              )}

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {drafts.length > 0
                    ? `Found ${drafts.length} ${drafts.length === 1 ? "event" : "events"}. Edit anything that looks off.`
                    : "No events extracted."}
                </p>
                <Badge variant="outline" className={`${CONFIDENCE_STYLES[confidence]} border`}>
                  AI confidence: {confidence}
                </Badge>
              </div>

              {showLowFallback && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <div className="text-sm font-medium text-amber-900">
                    Couldn't extract clean events
                  </div>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    Try a clearer, well-lit photo — or add the event manually.
                  </p>
                  {rawText && (
                    <div className="text-xs text-amber-900/80 italic border-l-2 border-amber-300 pl-3">
                      "{rawText}"
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={switchToManual}
                    className="w-full h-10 rounded-xl"
                  >
                    <PencilLine className="w-4 h-4 mr-2" />
                    Switch to manual add
                  </Button>
                </div>
              )}

              {drafts.map((d, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Event {i + 1}
                    </span>
                    {drafts.length > 1 && (
                      <button
                        onClick={() => removeDraft(i)}
                        className="text-muted-foreground hover:text-destructive p-1"
                        aria-label="Remove event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={d.title}
                      onChange={(e) => updateDraft(i, { title: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={d.date}
                      onChange={(e) => updateDraft(i, { date: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5">
                    <Label className="cursor-pointer">All day</Label>
                    <Switch
                      checked={d.allDay}
                      onCheckedChange={(v) => updateDraft(i, { allDay: v })}
                    />
                  </div>
                  {!d.allDay && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Start</Label>
                        <Input
                          type="time"
                          value={d.startTime}
                          onChange={(e) => updateDraft(i, { startTime: e.target.value })}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End</Label>
                        <Input
                          type="time"
                          value={d.endTime}
                          onChange={(e) => updateDraft(i, { endTime: e.target.value })}
                          className="h-11 rounded-xl"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <CategoryPicker
                      value={d.category}
                      onChange={(c) => updateDraft(i, { category: c })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preparation notes</Label>
                    <Textarea
                      value={d.preparation_notes}
                      onChange={(e) =>
                        updateDraft(i, { preparation_notes: e.target.value })
                      }
                      rows={2}
                      className="rounded-xl resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {stage === "confirm" && drafts.length > 0 && (
          <div className="px-6 py-4 border-t border-border bg-background">
            <Button
              onClick={onConfirm}
              disabled={saving}
              className="w-full h-12 rounded-xl text-base"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Add to calendar
                </>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>

    <AddEventSheet
      open={manualOpen}
      onOpenChange={setManualOpen}
      defaultDescription={manualDescription}
    />
    </>
  );
}
