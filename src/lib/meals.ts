export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";

export interface Meal {
  id: string;
  name: string;
  type: MealType;
  notes: string;
  created_at: string;
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  other: "Other",
};

export const MEAL_TYPE_OPTIONS: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "other",
];

const STORAGE_KEY = "hearth:meals";

export function loadMeals(): Meal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Meal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMeals(meals: Meal[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
  } catch {}
}

export function createMealId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `meal_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}
