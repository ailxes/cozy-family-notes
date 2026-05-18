import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  startOfWeek,
  addDays,
  addWeeks,
  format,
  isSameDay,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CalendarHeart,
  CalendarDays,
} from "lucide-react";
import { AppShell } from "./AppShell";
import { WeekView } from "./WeekView";
import { WeekStrip } from "./WeekStrip";
import { EventDrawer } from "./EventDrawer";
import { AddActionFab } from "./AddActionFab";
import { AddEventSheet } from "./AddEventSheet";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { SHARED_HOUSEHOLD_ID, type HearthEvent } from "@/lib/hearth";

export function HomePage() {
  const today = new Date();
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [activeDay, setActiveDay] = useState<Date>(() => new Date());
  const [selected, setSelected] = useState<HearthEvent | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const qc = useQueryClient();

  const weekEnd = addDays(weekStart, 7);

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", weekStart.toISOString()],
    queryFn: async (): Promise<HearthEvent[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("household_id", SHARED_HOUSEHOLD_ID)
        .gte("start_datetime", weekStart.toISOString())
        .lt("start_datetime", weekEnd.toISOString())
        .order("start_datetime");
      if (error) throw error;
      return (data ?? []) as HearthEvent[];
    },
  });

  // Realtime: refresh when any event changes
  useEffect(() => {
    const channel = supabase
      .channel("events-shared")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => qc.invalidateQueries({ queryKey: ["events"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const isCurrentWeek = isSameDay(
    weekStart,
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );

  const goToDate = (d: Date) => {
    setWeekStart(startOfWeek(d, { weekStartsOn: 1 }));
    setActiveDay(d);
    setDatePickerOpen(false);
  };

  return (
    <AppShell>
      <div className="px-5 md:px-6 pt-6 pb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight">
            {format(weekStart, "MMMM yyyy")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Week of {format(weekStart, "MMM d")}
            {" – "}
            {format(addDays(weekStart, 6), "MMM d")}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button
                className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"
                aria-label="Jump to date"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0 rounded-2xl">
              <Calendar
                mode="single"
                selected={activeDay}
                onSelect={(d) => d && goToDate(d)}
                weekStartsOn={1}
              />
            </PopoverContent>
          </Popover>
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
              onClick={() => {
                setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
                setActiveDay(new Date());
              }}
              className="text-xs h-9 rounded-full px-3"
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

      <WeekStrip
        weekStart={weekStart}
        activeDay={activeDay}
        today={today}
        events={events ?? []}
        onPick={setActiveDay}
      />

      {isLoading ? (
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
          activeDay={activeDay}
          onEventClick={setSelected}
          onEmptyDayAdd={(date) =>
            setQuickAddDate(format(date, "yyyy-MM-dd"))
          }
        />
      )}

      <AddActionFab />
      <AddEventSheet
        open={!!quickAddDate}
        onOpenChange={(o) => !o && setQuickAddDate(null)}
        initialDate={quickAddDate ?? undefined}
      />
      <EventDrawer
        event={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </AppShell>
  );
}
