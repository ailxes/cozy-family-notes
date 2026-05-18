import { Check } from "lucide-react";
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  CATEGORY_STYLES,
  type EventCategory,
} from "@/lib/hearth";

interface Props {
  value: EventCategory;
  onChange: (c: EventCategory) => void;
}

export function CategoryPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {CATEGORY_OPTIONS.map((c) => {
        const s = CATEGORY_STYLES[c];
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`relative rounded-xl px-3 py-3 text-left transition-all ${s.bg} ${s.text} ${
              active
                ? "ring-2 ring-offset-2 ring-offset-background ring-foreground/60 shadow-soft"
                : "opacity-70 hover:opacity-100 hover:-translate-y-0.5"
            }`}
            aria-pressed={active}
          >
            <span className="block text-sm font-medium">{CATEGORY_LABELS[c]}</span>
            {active && (
              <span className="absolute top-1.5 right-1.5">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
