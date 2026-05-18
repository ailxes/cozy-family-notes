import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { startOfWeek, addDays, addWeeks, format } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarHeart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { AuthScreen } from "./AuthScreen";
import { AppShell } from "./AppShell";
import { WeekView } from "./WeekView";
import { EventDrawer } from "./EventDrawer";
import { AddActionFab } from "./AddActionFab";
import { supabase } from "@/integrations/supabase/client";
import type { HearthEvent } from "@/lib/hearth";
import { Button } from "@/components/ui/button";

export function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { data: household, isLoading: hLoading } = useHousehold(user?.id);
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [selected, setSelected] = useState<HearthEvent | null>(null);

  const weekEnd = addDays(weekStart, 7);

  const { data: events, isLoading: eLoading } = useQuery({
    queryKey: ["events", household?.id, weekStart.toISOString()],
    enabled: !!household?.id,
    queryFn: async (): Promise<HearthEvent[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("household_id", household!.id)
        .gte("start_datetime", weekStart.toISOString())
        .lt("start_datetime", weekEnd.toISOString())
        .order("start_datetime");
      if (error) throw error;
      return (data ?? []) as HearthEvent[];
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (hLoading || !household) {
    return (
      <AppShell>
        <div className="px-5 py-10 text-center text-muted-foreground">
          Setting up your home...
        </div>
      </AppShell>
    );
  }

  const isCurrentWeek =
    format(weekStart, "yyyy-MM-dd") ===
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  return (
    <AppShell>
      <div className="px-5 md:px-6 pt-5 pb-2 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold leading-tight">
            {format(weekStart, "MMMM yyyy")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Week of {format(weekStart, "MMM d")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekStart((w) => addWeeks(w, -1))}
            className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {!isCurrentWeek && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
              }
              className="text-xs h-9 rounded-full"
            >
              Today
            </Button>
          )}
          <button
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
            className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {eLoading ? (
        <div className="px-5 py-10 text-center text-muted-foreground text-sm">
          Loading your week...
        </div>
      ) : events && events.length === 0 ? (
        <div className="mx-5 my-6 rounded-3xl bg-card border border-border p-10 text-center">
          <CalendarHeart className="w-10 h-10 mx-auto text-primary/70 mb-4" />
          <h3 className="font-serif text-xl font-semibold mb-2">
            A clean slate
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Tap the + button to add your first event or snap a photo of a school flyer.
          </p>
        </div>
      ) : (
        <WeekView
          events={events ?? []}
          weekStart={weekStart}
          onEventClick={setSelected}
        />
      )}

      <AddActionFab householdId={household.id} userId={user.id} />
      <EventDrawer
        event={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </AppShell>
  );
}
