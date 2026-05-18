import { Camera } from "lucide-react";
import { format } from "date-fns";
import { CATEGORY_LABELS, CATEGORY_STYLES, type HearthEvent } from "@/lib/hearth";

interface EventCardProps {
  event: HearthEvent;
  onClick: () => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
  const styles = CATEGORY_STYLES[event.category];
  const start = new Date(event.start_datetime);
  const timeLabel = event.all_day ? "All day" : format(start, "h:mm a");

  return (
    <button
      onClick={onClick}
      className={`group relative w-full text-left rounded-xl pl-4 pr-3 py-2.5 transition-all hover:shadow-soft hover:-translate-y-0.5 ${styles.bg} ${styles.text}`}
    >
      <span
        className={`absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full ${styles.dot}`}
        aria-hidden
      />
      <div className="flex items-center gap-3">
        <div className="text-xs font-medium opacity-80 tabular-nums shrink-0 w-16">
          {timeLabel}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm leading-snug truncate">
            {event.title}
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center text-[10px] uppercase tracking-wider font-medium opacity-70 shrink-0">
          {CATEGORY_LABELS[event.category]}
        </span>
        {event.source === "photo_upload" && (
          <Camera className="w-3.5 h-3.5 opacity-70 shrink-0" />
        )}
      </div>
    </button>
  );
}
