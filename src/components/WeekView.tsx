import { useEffect, useMemo, useRef } from "react";
import { startOfWeek, addDays, isSameDay, format } from "date-fns";
import { Plus } from "lucide-react";
import { EventCard } from "./EventCard";
import { CATEGORY_STYLES, type HearthEvent } from "@/lib/hearth";

interface WeekViewProps {
  events: HearthEvent[];
  weekStart: Date;
  activeDay?: Date;
  onEventClick: (event: HearthEvent) => void;
  onEmptyDayAdd?: (date: Date) => void;
}

export function WeekView({
  events,
  weekStart,
  activeDay,
  onEventClick,
  onEmptyDayAdd,
}: WeekViewProps) {
  const today = new Date();
  const monday = startOfWeek(weekStart, { weekStartsOn: 1 });
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

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

  useEffect(() => {
    if (!activeDay) return;
    const key = format(activeDay, "yyyy-MM-dd");
    const el = refs.current[key];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeDay]);

  return (
    <div className="px-4 md:px-6 py-3 space-y-3">
      {days.map(({ date, events: dayEvents }) => {
        const isToday = isSameDay(date, today);
        const dominant = dayEvents[0]?.category;
        const accentBar = dominant ? CATEGORY_STYLES[dominant].dot : "bg-border";
        const key = format(date, "yyyy-MM-dd");
        return (
          <div
            key={key}
            ref={(el) => {
              refs.current[key] = el;
            }}
            className={`relative overflow-hidden rounded-2xl border transition-all scroll-mt-24 ${
              isToday
                ? "bg-card border-primary/30 shadow-soft"
                : "bg-card/70 border-border/60"
            }`}
          >
            <span
              className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${accentBar} opacity-70`}
              aria-hidden
            />
            <div className="flex items-baseline gap-3 pl-6 pr-5 pt-4 pb-2">
              <div
                className={`font-serif text-3xl font-semibold leading-none tabular-nums ${
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
              {dayEvents.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
                </span>
              )}
            </div>
            <div className="pl-4 pr-3 pb-3 pt-1 space-y-1.5">
              {dayEvents.length === 0 ? (
                <button
                  onClick={() => onEmptyDayAdd?.(date)}
                  className="w-full text-left px-3 py-3 rounded-xl border border-dashed border-border/70 text-xs text-muted-foreground/70 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add something to {format(date, "EEEE")}
                </button>
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
