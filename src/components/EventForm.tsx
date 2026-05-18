import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CategoryPicker } from "./CategoryPicker";
import { PriorityPicker } from "./PriorityPicker";
import { type EventCategory, type EventPriority } from "@/lib/hearth";

export interface EventFormValues {
  title: string;
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  allDay: boolean;
  category: EventCategory;
  priority: EventPriority;
  description: string;
  preparation_notes: string;
}

interface EventFormProps {
  value: EventFormValues;
  onChange: (v: EventFormValues) => void;
}

export function defaultFormValues(): EventFormValues {
  const now = new Date();
  const date = format(now, "yyyy-MM-dd");
  const startTime = format(now, "HH:mm");
  const end = new Date(now.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    date,
    startTime,
    endTime: format(end, "HH:mm"),
    allDay: false,
    category: "school",
    priority: "normal",
    description: "",
    preparation_notes: "",
  };
}

export function valuesFromIso(
  startIso: string,
  endIso: string | null,
  allDay: boolean,
): { date: string; startTime: string; endTime: string } {
  const s = new Date(startIso);
  const e = endIso ? new Date(endIso) : new Date(s.getTime() + 60 * 60 * 1000);
  return {
    date: format(s, "yyyy-MM-dd"),
    startTime: allDay ? "09:00" : format(s, "HH:mm"),
    endTime: allDay ? "10:00" : format(e, "HH:mm"),
  };
}

export function buildIsoFromValues(v: EventFormValues): {
  start_datetime: string;
  end_datetime: string | null;
} {
  if (v.allDay) {
    const start = new Date(`${v.date}T00:00:00`);
    return { start_datetime: start.toISOString(), end_datetime: null };
  }
  const start = new Date(`${v.date}T${v.startTime}:00`);
  const end = v.endTime ? new Date(`${v.date}T${v.endTime}:00`) : null;
  return {
    start_datetime: start.toISOString(),
    end_datetime: end ? end.toISOString() : null,
  };
}

export function EventForm({ value, onChange }: EventFormProps) {
  const [v, setV] = useState(value);

  useEffect(() => setV(value), [value]);

  const update = (patch: Partial<EventFormValues>) => {
    const next = { ...v, ...patch };
    setV(next);
    onChange(next);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={v.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="What's happening?"
          className="h-11 rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={v.date}
          onChange={(e) => update({ date: e.target.value })}
          className="h-11 rounded-xl"
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
        <Label htmlFor="all-day" className="cursor-pointer">
          All day
        </Label>
        <Switch
          id="all-day"
          checked={v.allDay}
          onCheckedChange={(checked) => update({ allDay: checked })}
        />
      </div>

      {!v.allDay && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="start">Start</Label>
            <Input
              id="start"
              type="time"
              value={v.startTime}
              onChange={(e) => update({ startTime: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">End</Label>
            <Input
              id="end"
              type="time"
              value={v.endTime}
              onChange={(e) => update({ endTime: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Category</Label>
        <CategoryPicker
          value={v.category}
          onChange={(c) => update({ category: c })}
        />
      </div>

      <div className="space-y-2">
        <Label>Priority</Label>
        <PriorityPicker
          value={v.priority}
          onChange={(p) => update({ priority: p })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc">Description</Label>
        <Textarea
          id="desc"
          value={v.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Optional details"
          rows={3}
          className="rounded-xl resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prep">Preparation notes</Label>
        <Textarea
          id="prep"
          value={v.preparation_notes}
          onChange={(e) => update({ preparation_notes: e.target.value })}
          placeholder='e.g. "Wear yellow", "Bring $5"'
          rows={2}
          className="rounded-xl resize-none"
        />
      </div>
    </div>
  );
}
