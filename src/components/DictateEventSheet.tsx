import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mic, MicOff, Sparkles, Trash2, PencilLine, Upload } from "lucide-react";
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
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseDictation } from "@/lib/parseDictation";
import type { ParsedEvent, ParseConfidence } from "@/lib/parseFlyer";
import { SHARED_HOUSEHOLD_ID, type EventCategory, type EventPriority } from "@/lib/hearth";
import { CategoryPicker } from "./CategoryPicker";
import { PriorityPicker } from "./PriorityPicker";
import { AddEventSheet } from "./AddEventSheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (date: Date) => void;
}

type Stage = "record" | "parsing" | "confirm";

interface DraftEvent {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  category: EventCategory;
  priority: EventPriority;
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
    priority: "normal",
    description: p.description ?? "",
    preparation_notes: p.preparation_notes ?? "",
  };
}

const CONFIDENCE_STYLES: Record<ParseConfidence, string> = {
  high: "bg-emerald-100 text-emerald-900 border-emerald-200",
  medium: "bg-amber-100 text-amber-900 border-amber-200",
  low: "bg-rose-100 text-rose-900 border-rose-200",
};

// Browser Web Speech API
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function DictateEventSheet({ open, onOpenChange, onSaved }: Props) {
  const [stage, setStage] = useState<Stage>("record");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [drafts, setDrafts] = useState<DraftEvent[]>([]);
  const [confidence, setConfidence] = useState<ParseConfidence>("medium");
  const [rawText, setRawText] = useState("");
  const [saving, setSaving] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const [supported, setSupported] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDescription, setManualDescription] = useState("");
  const qc = useQueryClient();

  useEffect(() => {
    setSupported(!!getSpeechRecognition());
  }, []);

  const reset = () => {
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    setStage("record");
    setListening(false);
    setTranscript("");
    setInterim("");
    setDrafts([]);
    setConfidence("medium");
    setRawText("");
  };

  const onClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const startListening = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      toast.error("Voice input isn't supported on this browser. Try Chrome or Safari.");
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let finalT = "";
      let interimT = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalT += r[0].transcript;
        else interimT += r[0].transcript;
      }
      if (finalT) setTranscript((t) => (t + " " + finalT).trim());
      setInterim(interimT);
    };
    rec.onerror = (e: any) => {
      console.error("[dictation] error", e);
      if (e?.error === "not-allowed") {
        toast.error("Microphone permission denied.");
      }
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch (err) {
      console.error("[dictation] start failed", err);
      toast.error("Couldn't start microphone");
    }
  };

  const stopListening = () => {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  };

  const submitTranscript = async () => {
    const text = (transcript + " " + interim).trim();
    if (!text) {
      toast.error("Say something first");
      return;
    }
    stopListening();
    setStage("parsing");
    const result = await parseDictation(text);
    setConfidence(result.confidence);
    setRawText(result.raw_text_observed ?? "");
    setDrafts(result.events.map(parsedToDraft));
    setStage("confirm");
  };

  const switchToManual = () => {
    const text = (transcript + " " + interim).trim();
    onOpenChange(false);
    reset();
    setTimeout(() => {
      setManualOpen(true);
    }, 150);
    // pass through description via state
    setManualDescription(text);
  };
  const [manualDescription, setManualDescription] = useState("");

  const updateDraft = (i: number, patch: Partial<DraftEvent>) =>
    setDrafts((d) => d.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeDraft = (i: number) => setDrafts((d) => d.filter((_, idx) => idx !== i));

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
        household_id: SHARED_HOUSEHOLD_ID,
        title: d.title.trim(),
        description: d.description.trim() || null,
        preparation_notes: d.preparation_notes.trim() || null,
        all_day: d.allDay,
        category: d.category,
        priority: d.priority,
        source: "dictation",
        start_datetime: start.toISOString(),
        end_datetime: end ? end.toISOString() : null,
      };
    });
    const { error } = await supabase.from("events").insert(rows);
    setSaving(false);
    if (error) {
      console.error("[DictateEventSheet] insert failed", error);
      toast.error(error.message || "Couldn't save events");
      return;
    }
    toast.success(drafts.length === 1 ? "Event added" : `${drafts.length} events added`);
    qc.invalidateQueries({ queryKey: ["events"] });
    const earliest = rows
      .map((r) => new Date(r.start_datetime))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (earliest) onSaved?.(earliest);
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
              {stage === "confirm" ? "Confirm events" : "Dictate event"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {stage === "record" && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Tap the mic and say what you want to schedule — like "Soccer practice tomorrow at 4pm" or "Parent-teacher conference next Thursday at 6:30."
                </p>

                <div className="flex flex-col items-center gap-4 py-6">
                  <button
                    onClick={listening ? stopListening : startListening}
                    disabled={!supported}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lift ${
                      listening
                        ? "bg-destructive text-destructive-foreground animate-pulse"
                        : "bg-primary text-primary-foreground hover:scale-105"
                    } ${!supported ? "opacity-50 cursor-not-allowed" : ""}`}
                    aria-label={listening ? "Stop recording" : "Start recording"}
                  >
                    {listening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                  </button>
                  <div className="text-xs text-muted-foreground">
                    {listening ? "Listening… tap to stop" : supported ? "Tap to start" : "Voice not supported here"}
                  </div>
                </div>

                {(transcript || interim) && (
                  <div className="rounded-2xl border border-border bg-card p-4 min-h-[80px]">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                      Transcript
                    </div>
                    <p className="text-sm leading-relaxed">
                      {transcript}
                      {interim && <span className="text-muted-foreground"> {interim}</span>}
                    </p>
                  </div>
                )}

                {!supported && (
                  <Textarea
                    placeholder="Type what you want to schedule…"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={4}
                    className="rounded-xl resize-none"
                  />
                )}
              </div>
            )}

            {stage === "parsing" && (
              <div className="flex flex-col items-center justify-center py-16 gap-5">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span className="font-medium">Understanding what you said…</span>
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-xs italic">
                  "{(transcript + " " + interim).trim()}"
                </p>
              </div>
            )}

            {stage === "confirm" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    {drafts.length > 0
                      ? `Got ${drafts.length} ${drafts.length === 1 ? "event" : "events"}. Edit anything that looks off.`
                      : "No events extracted."}
                  </p>
                  <Badge variant="outline" className={`${CONFIDENCE_STYLES[confidence]} border`}>
                    AI confidence: {confidence}
                  </Badge>
                </div>

                {showLowFallback && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                    <div className="text-sm font-medium text-amber-900">
                      Couldn't pull out clean event details
                    </div>
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
                  <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-4">
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
                      <Label>Priority</Label>
                      <PriorityPicker
                        value={d.priority}
                        onChange={(p) => updateDraft(i, { priority: p })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Preparation notes</Label>
                      <Textarea
                        value={d.preparation_notes}
                        onChange={(e) => updateDraft(i, { preparation_notes: e.target.value })}
                        rows={2}
                        className="rounded-xl resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {stage === "record" && (
            <div className="px-6 py-4 border-t border-border bg-background">
              <Button
                onClick={submitTranscript}
                disabled={!(transcript || interim).trim()}
                className="w-full h-12 rounded-xl text-base"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Schedule with AI
              </Button>
            </div>
          )}

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
        onSaved={onSaved}
      />
    </>
  );
}
