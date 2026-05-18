import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  EventForm,
  defaultFormValues,
  buildIsoFromValues,
  type EventFormValues,
} from "./EventForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  userId: string;
}

export function AddEventSheet({ open, onOpenChange, householdId, userId }: Props) {
  const [values, setValues] = useState<EventFormValues>(defaultFormValues());
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const onSubmit = async () => {
    if (!values.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    setSaving(true);
    const iso = buildIsoFromValues(values);
    const { error } = await supabase.from("events").insert({
      title: values.title.trim(),
      description: values.description.trim() || null,
      preparation_notes: values.preparation_notes.trim() || null,
      all_day: values.allDay,
      category: values.category,
      source: "manual",
      household_id: householdId,
      created_by: userId,
      ...iso,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Event added");
    qc.invalidateQueries({ queryKey: ["events"] });
    setValues(defaultFormValues());
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] rounded-t-3xl p-0 flex flex-col md:max-w-lg md:mx-auto"
      >
        <SheetHeader className="px-6 pt-6 pb-2 text-left">
          <SheetTitle className="font-serif text-2xl">Add event</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <EventForm value={values} onChange={setValues} />
        </div>
        <SheetFooter className="px-6 py-4 border-t border-border bg-background">
          <Button
            onClick={onSubmit}
            disabled={saving}
            className="w-full h-12 rounded-xl text-base"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Add to calendar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
