import { useMemo } from "react";
import { startOfWeek, addDays, isSameDay, format } from "date-fns";
import { EventCard } from "./EventCard";
import type { HearthEvent } from "@/lib/hearth";

interface WeekViewProps {
  events: HearthEvent[];
  weekStart: Date;
  onEventClick: (event: HearthEvent) => void;
}

export function WeekView({ events, weekStart, onEventClick }: WeekViewProps) {
  const today = new Date();
  const monday = startOfWeek(weekStart, { weekStartsOn: 1 });

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i);
      const dayEvents = events
        .filter((e) => isSameDay(new Date(e.start_datetime), date))
        .sort((a, b) => {
          if (a.all_day && !b.all_day) return -1;
          if (!a.all_day && b.all_day) return 1;
          return (
            new Date(a.start_datetime).getTime() -
            new Date(b.start_datetime).getTime()
          );
        });
      return { date, events: dayEvents };
    });
  }, [monday, events]);

  return (
    <div className="px-4 md:px-6 py-5 space-y-3">
      {days.map(({ date, events: dayEvents }) => {
        const isToday = isSameDay(date, today);
        return (
          <div
            key={date.toISOString()}
            className={`rounded-2xl border transition-colors ${
              isToday
                ? "bg-card border-primary/30 shadow-soft"
                : "bg-card/60 border-border/60"
            }`}
          >
            <div className="flex items-baseline gap-3 px-5 pt-4 pb-2">
              <div
                className={`font-serif text-2xl font-semibold leading-none ${
                  isToday ? "text-primary" : "text-foreground"
                }`}
              >
                {format(date, "d")}
              </div>
              <div className="flex flex-col">
                <span
                  className={`text-xs uppercase tracking-wider font-medium ${
                    isToday ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {format(date, "EEEE")}
                  {isToday && " · Today"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(date, "MMMM")}
                </span>
              </div>
            </div>
            <div className="px-3 pb-3 pt-1 space-y-1.5">
              {dayEvents.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground/70 italic">
                  Nothing scheduled
                </div>
              ) : (
                dayEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick(event)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
