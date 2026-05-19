import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Loader2, Pencil, X, Camera } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  EventForm,
  buildIsoFromValues,
  valuesFromIso,
  type EventFormValues,
} from "./EventForm";
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  type HearthEvent,
} from "@/lib/hearth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  event: HearthEvent | null;
  onOpenChange: (open: boolean) => void;
}

export function EventDrawer({ event, onOpenChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<EventFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (event) {
      const times = valuesFromIso(event.start_datetime, event.end_datetime, event.all_day);
      setValues({
        title: event.title,
        ...times,
        allDay: event.all_day,
        category: event.category,
        priority: event.priority ?? "normal",
        description: event.description ?? "",
        preparation_notes: event.preparation_notes ?? "",
      });
      setEditing(false);
    }
  }, [event]);

  const onSave = async () => {
    if (!event || !values) return;
    if (!values.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    setSaving(true);
    const iso = buildIsoFromValues(values);
    const { error } = await supabase
      .from("events")
      .update({
        title: values.title.trim(),
        description: values.description.trim() || null,
        preparation_notes: values.preparation_notes.trim() || null,
        all_day: values.allDay,
        category: values.category,
        priority: values.priority,
        ...iso,
      })
      .eq("id", event.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Event updated");
    qc.invalidateQueries({ queryKey: ["events"] });
    setEditing(false);
    onOpenChange(false);
  };

  const onDelete = async () => {
    if (!event) return;
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Event deleted");
    qc.invalidateQueries({ queryKey: ["events"] });
    setConfirmDelete(false);
    onOpenChange(false);
  };

  if (!event) return null;

  const styles = CATEGORY_STYLES[event.category];
  const start = new Date(event.start_datetime);
  const end = event.end_datetime ? new Date(event.end_datetime) : null;

  return (
    <>
      <Drawer open={!!event} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[92vh] rounded-t-3xl p-0 flex flex-col md:max-w-lg md:mx-auto">
          <DrawerHeader className="px-6 pt-2 pb-2 flex-row items-center justify-between space-y-0 text-left">
            <DrawerTitle className="font-serif text-2xl">
              {editing ? "Edit event" : "Event details"}
            </DrawerTitle>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
                aria-label="Edit"
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {editing && values ? (
              <EventForm value={values} onChange={setValues} />
            ) : (
              <div className="space-y-5">
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles.bg} ${styles.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                    {CATEGORY_LABELS[event.category]}
                  </span>
                </div>
                <h2 className="font-serif text-3xl font-semibold leading-tight">
                  {event.title}
                </h2>
                <div className="space-y-1">
                  <div className="text-base font-medium">
                    {format(start, "EEEE, MMMM d")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {event.all_day
                      ? "All day"
                      : `${format(start, "h:mm a")}${end ? ` – ${format(end, "h:mm a")}` : ""}`}
                  </div>
                </div>
                {event.description && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                      Details
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {event.description}
                    </p>
                  </div>
                )}
                {event.preparation_notes && (
                  <div className="rounded-xl bg-accent/40 p-4">
                    <div className="text-xs uppercase tracking-wider text-accent-foreground font-medium mb-1.5">
                      Preparation
                    </div>
                    <p className="text-sm leading-relaxed text-accent-foreground whitespace-pre-wrap">
                      {event.preparation_notes}
                    </p>
                  </div>
                )}
                {event.source_image_url && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                      <Camera className="w-3 h-3" /> Original flyer
                    </div>
                    <img
                      src={event.source_image_url}
                      alt="Source flyer"
                      className="w-full rounded-xl border border-border"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border bg-background flex gap-3">
            {editing ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  className="h-12 rounded-xl"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  onClick={onSave}
                  disabled={saving}
                  className="flex-1 h-12 rounded-xl text-base"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="flex-1 h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete event
              </Button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove it from your family calendar. This action can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
