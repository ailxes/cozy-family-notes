CREATE TYPE public.event_priority AS ENUM ('low', 'normal', 'high');

ALTER TABLE public.events
  ADD COLUMN priority public.event_priority NOT NULL DEFAULT 'normal';

CREATE INDEX idx_events_household_priority_start
  ON public.events (household_id, priority, start_datetime);