import { useMemo, useRef } from "react";
import { format, isSameDay } from "date-fns";
import { Plus, ChevronLeft } from "lucide-react";
import { EventCard } from "./EventCard";
import { CATEGORY_STYLES, type HearthEvent } from "@/lib/hearth";

interface Props {
  date: Date;
  today: Date;
  events: HearthEvent[];
  onEventClick: (event: HearthEvent) => void;
  onEmptyAdd?: (date: Date) => void;
  onBack: () => void;
}

const SWIPE_THRESHOLD = 60;

export function DayView({
  date,
  today,
  events,
  onEventClick,
  onEmptyAdd,
  onBack,
}: Props) {
  const dayEvents = useMemo(() => {
    return events
      .filter((e) => isSameDay(new Date(e.start_datetime), date))
      .sort((a, b) => {
        if (a.all_day && !b.all_day) return -1;
        if (!a.all_day && b.all_day) return 1;
        return (
          new Date(a.start_datetime).getTime() -
          new Date(b.start_datetime).getTime()
        );
      });
  }, [date, events]);

  const isToday = isSameDay(date, today);
  const dominant = dayEvents[0]?.category;
  const accentBar = dominant ? CATEGORY_STYLES[dominant].dot : "bg-border";

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) onBack();
  };

  return (
    <div
      className="px-4 md:px-6 py-3"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to month
      </button>

      <div
        className={`relative overflow-hidden rounded-2xl border ${
          isToday
            ? "bg-card border-primary/30 shadow-soft"
            : "bg-card/70 border-border/60"
        }`}
      >
        <span
          className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${accentBar} opacity-70`}
          aria-hidden
        />
        <div className="flex items-baseline gap-3 pl-6 pr-5 pt-5 pb-3">
          <div
            className={`font-serif text-4xl font-semibold leading-none tabular-nums ${
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
              {format(date, "MMMM yyyy")}
            </span>
          </div>
          {dayEvents.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
            </span>
          )}
        </div>
        <div className="pl-4 pr-3 pb-4 pt-1 space-y-1.5">
          {dayEvents.length === 0 ? (
            <button
              onClick={() => onEmptyAdd?.(date)}
              className="w-full text-left px-3 py-4 rounded-xl border border-dashed border-border/70 text-sm text-muted-foreground/70 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
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

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Swipe left to go back to month
      </p>
    </div>
  );
}
