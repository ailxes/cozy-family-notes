import { addDays, format, isSameDay } from "date-fns";
import type { HearthEvent } from "@/lib/hearth";

interface Props {
  weekStart: Date;
  activeDay: Date;
  today: Date;
  events: HearthEvent[];
  onPick: (d: Date) => void;
}

export function WeekStrip({ weekStart, activeDay, today, events, onPick }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="px-3 md:px-4 pb-2">
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {days.map((d) => {
          const count = events.filter((e) =>
            isSameDay(new Date(e.start_datetime), d),
          ).length;
          const isToday = isSameDay(d, today);
          const isActive = isSameDay(d, activeDay);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onPick(d)}
              className={`group relative flex flex-col items-center gap-1 rounded-2xl py-2 px-1 transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : isToday
                    ? "bg-secondary text-foreground"
                    : "hover:bg-secondary/60 text-foreground"
              }`}
            >
              <span
                className={`text-[10px] uppercase tracking-wider font-medium ${
                  isActive
                    ? "text-primary-foreground/80"
                    : isToday
                      ? "text-foreground/70"
                      : "text-muted-foreground"
                }`}
              >
                {format(d, "EEEEE")}
              </span>
              <span
                className={`font-serif text-lg font-semibold tabular-nums leading-none ${
                  isToday && !isActive ? "text-primary" : ""
                }`}
              >
                {format(d, "d")}
              </span>
              <span
                className={`h-1 rounded-full transition-all ${
                  count === 0
                    ? "w-1 opacity-0"
                    : isActive
                      ? "w-4 bg-primary-foreground/80"
                      : "w-4 bg-primary/70"
                }`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
