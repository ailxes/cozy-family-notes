import { Flag } from "lucide-react";
import {
  PRIORITY_LABELS,
  PRIORITY_OPTIONS,
  type EventPriority,
} from "@/lib/hearth";

interface Props {
  value: EventPriority;
  onChange: (p: EventPriority) => void;
}

const STYLE: Record<EventPriority, string> = {
  low: "bg-prio-low text-prio-low-fg",
  normal: "bg-prio-normal text-prio-normal-fg",
  high: "bg-prio-high text-prio-high-fg",
};

export function PriorityPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {PRIORITY_OPTIONS.map((p) => {
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`relative rounded-xl px-3 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${STYLE[p]} ${
              active
                ? "ring-2 ring-offset-2 ring-offset-background ring-foreground/60 shadow-soft"
                : "opacity-70 hover:opacity-100 hover:-translate-y-0.5"
            }`}
            aria-pressed={active}
          >
            <Flag className="w-3.5 h-3.5" />
            {PRIORITY_LABELS[p]}
          </button>
        );
      })}
    </div>
  );
}
