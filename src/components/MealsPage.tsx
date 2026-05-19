import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CalendarPlus,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { AppShell } from "./AppShell";
import { AddEventSheet } from "./AddEventSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_OPTIONS,
  type Meal,
  type MealType,
  createMealId,
  loadMeals,
  saveMeals,
} from "@/lib/meals";

interface FormState {
  id: string | null;
  name: string;
  type: MealType;
  notes: string;
}

const emptyForm: FormState = {
  id: null,
  name: "",
  type: "dinner",
  notes: "",
};

export function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mounted, setMounted] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [scheduleMeal, setScheduleMeal] = useState<Meal | null>(null);

  useEffect(() => {
    setMeals(loadMeals());
    setMounted(true);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<MealType, Meal[]>();
    for (const t of MEAL_TYPE_OPTIONS) map.set(t, []);
    for (const m of meals) {
      const arr = map.get(m.type) ?? [];
      arr.push(m);
      map.set(m.type, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [meals]);

  const persist = (next: Meal[]) => {
    setMeals(next);
    saveMeals(next);
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditorOpen(true);
  };

  const openEdit = (meal: Meal) => {
    setForm({
      id: meal.id,
      name: meal.name,
      type: meal.type,
      notes: meal.notes,
    });
    setEditorOpen(true);
  };

  const submitForm = () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Give your meal a name");
      return;
    }
    if (form.id) {
      const next = meals.map((m) =>
        m.id === form.id ? { ...m, name, type: form.type, notes: form.notes.trim() } : m,
      );
      persist(next);
      toast.success("Meal updated");
    } else {
      const newMeal: Meal = {
        id: createMealId(),
        name,
        type: form.type,
        notes: form.notes.trim(),
        created_at: new Date().toISOString(),
      };
      persist([newMeal, ...meals]);
      toast.success("Meal added");
    }
    setEditorOpen(false);
  };

  const removeMeal = (id: string) => {
    persist(meals.filter((m) => m.id !== id));
    toast.success("Meal removed");
  };

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <AppShell>
      <div className="px-5 md:px-6 pt-6 pb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight">
            Meal menu
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build a list of meals your family loves, then schedule them on the
            calendar.
          </p>
        </div>
        <Button
          onClick={openNew}
          className="h-11 rounded-full px-4 shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" />
          New meal
        </Button>
      </div>

      {mounted && meals.length === 0 ? (
        <div className="mx-5 md:mx-6 mb-10 rounded-3xl bg-card border border-border p-10 text-center">
          <UtensilsCrossed className="w-10 h-10 mx-auto text-primary/70 mb-4" />
          <h3 className="font-serif text-xl font-semibold mb-2">
            No meals yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Add favorites like "Sheet-pan chicken" or "Taco Tuesday" so you can
            drop them on any day of the week.
          </p>
          <Button onClick={openNew} className="mt-5 rounded-full">
            <Plus className="w-4 h-4 mr-1" />
            Add your first meal
          </Button>
        </div>
      ) : (
        <div className="px-5 md:px-6 pb-12 space-y-8">
          {MEAL_TYPE_OPTIONS.map((type) => {
            const items = grouped.get(type) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={type}>
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                  {MEAL_TYPE_LABELS[type]}
                </h2>
                <ul className="space-y-2">
                  {items.map((meal) => (
                    <li
                      key={meal.id}
                      className="rounded-2xl bg-card border border-border p-4 flex items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{meal.name}</div>
                        {meal.notes && (
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                            {meal.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setScheduleMeal(meal)}
                          className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center text-primary"
                          aria-label={`Schedule ${meal.name}`}
                          title="Schedule on calendar"
                        >
                          <CalendarPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(meal)}
                          className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"
                          aria-label={`Edit ${meal.name}`}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeMeal(meal.id)}
                          className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center text-destructive"
                          aria-label={`Delete ${meal.name}`}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl p-0 flex flex-col md:max-w-lg md:mx-auto"
        >
          <SheetHeader className="px-6 pt-6 pb-2 text-left">
            <SheetTitle className="font-serif text-2xl">
              {form.id ? "Edit meal" : "New meal"}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meal-name">Name</Label>
              <Input
                id="meal-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Sheet-pan chicken"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-type">Meal type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as MealType })}
              >
                <SelectTrigger id="meal-type" className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {MEAL_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-notes">Notes</Label>
              <Textarea
                id="meal-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Recipe link, ingredients, prep reminders…"
                className="min-h-[100px] rounded-xl"
              />
            </div>
          </div>
          <SheetFooter className="px-6 py-4 border-t border-border bg-background">
            <Button
              onClick={submitForm}
              className="w-full h-12 rounded-xl text-base"
            >
              {form.id ? "Save changes" : "Add meal"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AddEventSheet
        open={!!scheduleMeal}
        onOpenChange={(o) => !o && setScheduleMeal(null)}
        title={scheduleMeal ? `Schedule "${scheduleMeal.name}"` : "Schedule meal"}
        defaultTitle={scheduleMeal?.name}
        defaultDescription={scheduleMeal?.notes ?? undefined}
        defaultCategory="personal"
        initialDate={today}
        onSaved={() => {
          toast.success("Meal added to calendar");
          setScheduleMeal(null);
        }}
      />
    </AppShell>
  );
}
