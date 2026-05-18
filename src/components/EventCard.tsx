import { Camera } from "lucide-react";
import { format } from "date-fns";
import { CATEGORY_STYLES, type HearthEvent } from "@/lib/hearth";

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
      className={`group w-full text-left rounded-xl px-3 py-2.5 transition-all hover:shadow-soft hover:-translate-y-0.5 ${styles.bg} ${styles.text}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium opacity-80 mb-0.5">{timeLabel}</div>
          <div className="font-medium text-sm leading-snug truncate">{event.title}</div>
        </div>
        {event.source === "photo_upload" && (
          <Camera className="w-3.5 h-3.5 mt-0.5 opacity-70 shrink-0" />
        )}
      </div>
    </button>
  );
}
