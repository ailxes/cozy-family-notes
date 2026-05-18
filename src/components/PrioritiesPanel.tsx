import { useQuery } from "@tanstack/react-query";
import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SHARED_HOUSEHOLD_ID, type HearthEvent } from "@/lib/hearth";

interface Props {
  onSelect: (event: HearthEvent) => void;
}

function whenLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE MMM d");
}

export function PrioritiesPanel({ onSelect }: Props) {
  const { data } = useQuery({
    queryKey: ["events", "priorities"],
    queryFn: async (): Promise<HearthEvent[]> => {
      const since = startOfDay(new Date()).toISOString();
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("household_id", SHARED_HOUSEHOLD_ID)
        .eq("priority", "high")
        .gte("start_datetime", since)
        .order("start_datetime")
        .limit(5);
      if (error) throw error;
      return (data ?? []) as HearthEvent[];
    },
  });

  const items = data ?? [];

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-3 w-full md:w-72 shrink-0">
      <div className="flex items-center gap-2 px-1 pb-2">
        <Flag className="w-3.5 h-3.5 text-prio-high" />
        <h2 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          Top reminders
        </h2>
      </div>
      {items.length === 0 ? (
        <p className="px-1 py-2 text-xs text-muted-foreground">
          No high priorities. Mark events as high priority and they'll appear here.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => onSelect(e)}
                className="w-full text-left flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/70 transition-colors"
              >
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-prio-high shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{e.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {whenLabel(e.start_datetime)}
                    {!e.all_day && ` · ${format(new Date(e.start_datetime), "h:mm a")}`}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
