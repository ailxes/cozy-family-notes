import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  startOfWeek,
  addDays,
  addWeeks,
  addMonths,
  startOfMonth,
  endOfMonth,
  endOfWeek,
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
import { MonthView } from "./MonthView";
import { DayView } from "./DayView";
import { PrioritiesPanel } from "./PrioritiesPanel";
import { ViewToggle, type CalendarView } from "./ViewToggle";
import { EventDrawer } from "./EventDrawer";
import { AddActionFab } from "./AddActionFab";
import { AddEventSheet } from "./AddEventSheet";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { SHARED_HOUSEHOLD_ID, type HearthEvent } from "@/lib/hearth";

export function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date(0));
  const [activeDay, setActiveDay] = useState<Date>(() => new Date(0));
  // `today` is the real current calendar date — used to draw the green
  // "today" highlight. Stable on the server (epoch) until mount.
  const today = mounted ? new Date() : new Date(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    const now = new Date();
    const isMobileNow =
      typeof window !== "undefined" && window.innerWidth < 768;
    let initialView: CalendarView = "month";
    if (!isMobileNow) {
      try {
        const stored = localStorage.getItem("hearth:view");
        if (stored === "week" || stored === "month") initialView = stored;
      } catch {}
    }
    setView(initialView);
    setAnchor(initialView === "week" ? startOfWeek(now, { weekStartsOn: 0 }) : startOfMonth(now));
    setActiveDay(now);
    setMounted(true);
  }, []);

  const [selected, setSelected] = useState<HearthEvent | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const qc = useQueryClient();

  const setViewPersist = (v: CalendarView) => {
    setView(v);
    // Only persist toggle-selectable views; "day" is contextual to a tapped date.
    if (v === "week" || v === "month") {
      try {
        localStorage.setItem("hearth:view", v);
      } catch {}
    }
    // realign anchor for the new view
    const ref = activeDay;
    if (v === "week") setAnchor(startOfWeek(ref, { weekStartsOn: 0 }));
    else if (v === "month") setAnchor(startOfMonth(ref));
    else setAnchor(ref);
  };

  // Query range matches view
  const range = (() => {
    if (view === "day") {
      const start = new Date(activeDay);
      start.setHours(0, 0, 0, 0);
      const end = addDays(start, 1);
      return { start, end };
    }
    if (view === "week") {
      const start = startOfWeek(anchor, { weekStartsOn: 0 });
      return { start, end: addDays(start, 7) };
    }
    const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
    const end = addDays(endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 }), 1);
    return { start, end };
  })();

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", view, range.start.toISOString()],
    queryFn: async (): Promise<HearthEvent[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("household_id", SHARED_HOUSEHOLD_ID)
        .gte("start_datetime", range.start.toISOString())
        .lt("start_datetime", range.end.toISOString())
        .order("start_datetime");
      if (error) throw error;
      return (data ?? []) as HearthEvent[];
    },
  });

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

  const isCurrentPeriod =
    view === "day"
      ? isSameDay(activeDay, new Date())
      : view === "week"
        ? isSameDay(
            startOfWeek(anchor, { weekStartsOn: 0 }),
            startOfWeek(new Date(), { weekStartsOn: 0 }),
          )
        : isSameDay(startOfMonth(anchor), startOfMonth(new Date()));

  const goToDate = (d: Date) => {
    if (view === "week") setAnchor(startOfWeek(d, { weekStartsOn: 0 }));
    else if (view === "month") setAnchor(startOfMonth(d));
    else setAnchor(d);
    setActiveDay(d);
    setDatePickerOpen(false);
  };

  const goPrev = () => {
    if (view === "day") {
      const next = addDays(activeDay, -1);
      setActiveDay(next);
      setAnchor(next);
    } else if (view === "week") {
      setAnchor((a) => addWeeks(a, -1));
    } else {
      setAnchor((a) => addMonths(a, -1));
    }
  };
  const goNext = () => {
    if (view === "day") {
      const next = addDays(activeDay, 1);
      setActiveDay(next);
      setAnchor(next);
    } else if (view === "week") {
      setAnchor((a) => addWeeks(a, 1));
    } else {
      setAnchor((a) => addMonths(a, 1));
    }
  };
  const goToday = () => {
    const now = new Date();
    if (view === "week") setAnchor(startOfWeek(now, { weekStartsOn: 0 }));
    else if (view === "month") setAnchor(startOfMonth(now));
    else setAnchor(now);
    setActiveDay(now);
  };

  const backToMonth = () => {
    setView("month");
    try {
      localStorage.setItem("hearth:view", "month");
    } catch {}
    setAnchor(startOfMonth(activeDay));
  };

  // After save: jump to the new event's date, but keep the user's current view.
  // On mobile, stay on month view so the user lands back on the calendar overview.
  const onSaved = (date: Date) => {
    const nextView: CalendarView = isMobile ? "month" : view;
    setView(nextView);
    try {
      localStorage.setItem("hearth:view", nextView);
    } catch {}
    setAnchor(
      nextView === "week"
        ? startOfWeek(date, { weekStartsOn: 0 })
        : startOfMonth(date),
    );
    setActiveDay(date);
    qc.invalidateQueries({ queryKey: ["events"] });
  };

  const headerTitle =
    view === "day"
      ? format(activeDay, "MMMM yyyy")
      : format(anchor, "MMMM yyyy");
  const headerSub =
    view === "day"
      ? format(activeDay, "EEEE, MMM d")
      : view === "week"
        ? `Week of ${format(startOfWeek(anchor, { weekStartsOn: 0 }), "MMM d")} – ${format(addDays(startOfWeek(anchor, { weekStartsOn: 0 }), 6), "MMM d")}`
        : `${format(startOfMonth(anchor), "MMM d")} – ${format(endOfMonth(anchor), "MMM d")}`;

  return (
    <AppShell>
      <div className="px-5 md:px-6 pt-6 pb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight" suppressHydrationWarning>
            {mounted ? headerTitle : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 min-h-[1.25rem]" suppressHydrationWarning>
            {mounted ? headerSub : ""}
          </p>
          {view !== "day" && (
            <div className="mt-3">
              <ViewToggle value={view} onChange={setViewPersist} />
            </div>
          )}
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
                  weekStartsOn={0}
                />
              </PopoverContent>
            </Popover>
            <button
              onClick={goPrev}
              className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"
              aria-label={
                view === "day"
                  ? "Previous day"
                  : view === "week"
                    ? "Previous week"
                    : "Previous month"
              }
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {!isCurrentPeriod && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToday}
                className="text-xs h-9 rounded-full px-3"
              >
                Today
              </Button>
            )}
          <button
            onClick={goNext}
            className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"
            aria-label={
              view === "day"
                ? "Next day"
                : view === "week"
                  ? "Next week"
                  : "Next month"
            }
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {view === "week" && (
        <WeekStrip
          weekStart={startOfWeek(anchor, { weekStartsOn: 0 })}
          activeDay={activeDay}
          today={today}
          events={events ?? []}
          onPick={setActiveDay}
        />
      )}

      {isLoading ? (
        <div className="px-5 py-10 text-center text-muted-foreground text-sm">
          Loading...
        </div>
      ) : view === "month" ? (
        <MonthView
          monthStart={anchor}
          today={today}
          events={events ?? []}
          onEventClick={setSelected}
          onDayClick={(d) => {
            setActiveDay(d);
            setAnchor(d);
            setView("day");
          }}
          onNextMonth={goNext}
          onPrevMonth={goPrev}
        />
      ) : view === "day" ? (
        <DayView
          date={activeDay}
          today={today}
          events={events ?? []}
          onEventClick={setSelected}
          onEmptyAdd={(date) => setQuickAddDate(format(date, "yyyy-MM-dd"))}
          onBack={backToMonth}
        />
      ) : events && events.length === 0 ? (
        <div className="mx-5 my-6 rounded-3xl bg-card border border-border p-10 text-center">
          <CalendarHeart className="w-10 h-10 mx-auto text-primary/70 mb-4" />
          <h3 className="font-serif text-xl font-semibold mb-2">A clean slate</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Tap the + button to add your first event or snap a photo of a school flyer.
          </p>
        </div>
      ) : (
        <WeekView
          events={events ?? []}
          weekStart={startOfWeek(anchor, { weekStartsOn: 0 })}
          activeDay={activeDay}
          onEventClick={setSelected}
          onEmptyDayAdd={(date) => setQuickAddDate(format(date, "yyyy-MM-dd"))}
        />
      )}

      <div className="px-5 md:px-6 pt-6 pb-3">
        <PrioritiesPanel onSelect={setSelected} />
      </div>

      <AddActionFab onSaved={onSaved} />
      <AddEventSheet
        open={!!quickAddDate}
        onOpenChange={(o) => !o && setQuickAddDate(null)}
        initialDate={quickAddDate ?? undefined}
        onSaved={onSaved}
      />
      <EventDrawer
        event={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </AppShell>
  );
}
