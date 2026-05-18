export const SHARED_HOUSEHOLD_ID = "00000000-0000-0000-0000-0000000000a1";

export type EventCategory =
  | "school"
  | "sports"
  | "deadline"
  | "spirit_day"
  | "personal"
  | "other";

export type EventPriority = "low" | "normal" | "high";

export interface HearthEvent {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string | null;
  all_day: boolean;
  category: EventCategory;
  priority: EventPriority;
  source: string;
  source_image_url: string | null;
  preparation_notes: string | null;
  created_by: string | null;
  created_at: string;
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  school: "School",
  sports: "Sports",
  deadline: "Deadline",
  spirit_day: "Spirit Day",
  personal: "Personal",
  other: "Other",
};

// Maps to semantic classes defined in styles.css
export const CATEGORY_STYLES: Record<
  EventCategory,
  { bg: string; text: string; dot: string }
> = {
  school: { bg: "bg-cat-school", text: "text-cat-school-fg", dot: "bg-cat-school-fg" },
  sports: { bg: "bg-cat-sports", text: "text-cat-sports-fg", dot: "bg-cat-sports-fg" },
  deadline: { bg: "bg-cat-deadline", text: "text-cat-deadline-fg", dot: "bg-cat-deadline-fg" },
  spirit_day: { bg: "bg-cat-spirit", text: "text-cat-spirit-fg", dot: "bg-cat-spirit-fg" },
  personal: { bg: "bg-cat-personal", text: "text-cat-personal-fg", dot: "bg-cat-personal-fg" },
  other: { bg: "bg-cat-other", text: "text-cat-other-fg", dot: "bg-cat-other-fg" },
};

export const CATEGORY_OPTIONS: EventCategory[] = [
  "school",
  "sports",
  "deadline",
  "spirit_day",
  "personal",
  "other",
];

export const PRIORITY_LABELS: Record<EventPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

export const PRIORITY_OPTIONS: EventPriority[] = ["low", "normal", "high"];

export const PRIORITY_STYLES: Record<
  EventPriority,
  { bg: string; text: string; dot: string }
> = {
  low: { bg: "bg-prio-low", text: "text-prio-low-fg", dot: "bg-prio-low-fg" },
  normal: { bg: "bg-prio-normal", text: "text-prio-normal-fg", dot: "bg-prio-normal-fg" },
  high: { bg: "bg-prio-high", text: "text-prio-high-fg", dot: "bg-prio-high" },
};
