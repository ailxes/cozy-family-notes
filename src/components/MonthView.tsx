import { useMemo } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CATEGORY_STYLES, type HearthEvent } from "@/lib/hearth";

interface Props {
  monthStart: Date;
  today: Date;
  events: HearthEvent[];
  onDayClick: (date: Date) => void;
}

export function MonthView({ monthStart, today, events, onDayClick }: Props) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthStart]);

  const byDay = useMemo(() => {
    const map = new Map<string, HearthEvent[]>();
    for (const e of events) {
      const k = format(new Date(e.start_datetime), "yyyy-MM-dd");
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.start_datetime).getTime() -
          new Date(b.start_datetime).getTime(),
      );
    }
    return map;
  }, [events]);

  const weekHeads = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="px-4 md:px-6 py-3">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekHeads.map((d) => (
          <div
            key={d}
            className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-center"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const key = format(date, "yyyy-MM-dd");
          const dayEvents = byDay.get(key) ?? [];
          const inMonth = isSameMonth(date, monthStart);
          const isToday = isSameDay(date, today);
          return (
            <button
              key={key}
              onClick={() => onDayClick(date)}
              className={`relative aspect-square sm:aspect-[4/5] rounded-xl border p-1.5 text-left transition-all hover:border-primary/40 hover:bg-secondary/40 flex flex-col gap-1 overflow-hidden ${
                isToday
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/60 bg-card/60"
              } ${inMonth ? "" : "opacity-40"}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold tabular-nums ${
                    isToday ? "text-primary" : "text-foreground"
                  }`}
                >
                  {format(date, "d")}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[9px] text-muted-foreground tabular-nums">
                    {dayEvents.length}
                  </span>
                )}
              </div>
              <div className="flex-1 flex flex-col gap-0.5 min-h-0">
                {dayEvents.slice(0, 3).map((e) => {
                  const s = CATEGORY_STYLES[e.category];
                  return (
                    <div
                      key={e.id}
                      className={`text-[10px] truncate rounded px-1 py-0.5 ${s.bg} ${s.text}`}
                    >
                      {e.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-muted-foreground px-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
