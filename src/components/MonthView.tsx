import { useMemo } from "react";
import {
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
  onEventClick?: (event: HearthEvent) => void;
}

export function MonthView({ monthStart, today, events, onDayClick }: Props) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 });
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

  const weekHeads = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="flex flex-col">
      <div className="px-1 sm:px-4">
        <div className="grid grid-cols-7">
          {weekHeads.map((d, i) => (
            <div
              key={i}
              className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-center py-2"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((date) => {
            const key = format(date, "yyyy-MM-dd");
            const dayEvents = byDay.get(key) ?? [];
            const inMonth = isSameMonth(date, monthStart);
            const isToday = isSameDay(date, today);
            const mobileMax = 2;
            const desktopMax = 3;
            return (
              <button
                key={key}
                onClick={() => onDayClick(date)}
                className={`relative min-h-[96px] sm:min-h-[112px] p-1 sm:p-1.5 text-left transition-colors flex flex-col gap-1 overflow-hidden rounded-lg hover:bg-secondary/40 ${
                  inMonth ? "" : "opacity-40"
                }`}
              >
                <div className="flex items-center justify-start">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-semibold tabular-nums ${
                      isToday
                        ? "w-6 h-6 rounded-full bg-primary text-primary-foreground"
                        : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/60"
                    }`}
                  >
                    {format(date, "d")}
                  </span>
                </div>

                {inMonth && dayEvents.length > 0 && (
                  <div className="flex flex-col gap-0.5 min-h-0">
                    {/* Mobile chips */}
                    <div className="sm:hidden flex flex-col gap-0.5">
                      {dayEvents.slice(0, mobileMax).map((e) => {
                        const s = CATEGORY_STYLES[e.category];
                        const start = new Date(e.start_datetime);
                        const time = e.all_day
                          ? null
                          : format(start, "mm") === "00"
                            ? format(start, "ha").toLowerCase()
                            : format(start, "h:mma").toLowerCase();
                        return (
                          <div
                            key={e.id}
                            className={`text-[9px] leading-tight truncate rounded px-1 py-0.5 ${s.bg} ${s.text}`}
                          >
                            {time && <span className="font-medium mr-0.5">{time}</span>}
                            {e.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > mobileMax && (
                        <div className="text-[9px] text-muted-foreground px-1">
                          +{dayEvents.length - mobileMax} more
                        </div>
                      )}
                    </div>

                    {/* Desktop/tablet chips */}
                    <div className="hidden sm:flex flex-col gap-0.5">
                      {dayEvents.slice(0, desktopMax).map((e) => {
                        const s = CATEGORY_STYLES[e.category];
                        return (
                          <div
                            key={e.id}
                            className={`text-[10px] truncate rounded px-1 py-0.5 ${s.bg} ${s.text}`}
                          >
                            {!e.all_day && (
                              <span className="font-medium mr-1">
                                {format(new Date(e.start_datetime), "h:mma").toLowerCase()}
                              </span>
                            )}
                            {e.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > desktopMax && (
                        <div className="text-[9px] text-muted-foreground px-1">
                          +{dayEvents.length - desktopMax} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
