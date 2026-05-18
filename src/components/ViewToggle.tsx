export type CalendarView = "week" | "month";

interface Props {
  value: CalendarView;
  onChange: (v: CalendarView) => void;
}

export function ViewToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex p-1 rounded-full bg-secondary border border-border">
      {(["week", "month"] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 h-7 text-xs font-medium rounded-full transition-colors ${
            value === v
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={value === v}
        >
          {v === "week" ? "Week" : "Month"}
        </button>
      ))}
    </div>
  );
}
