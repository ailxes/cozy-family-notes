## 1. Fix "Add to calendar" not appearing

Likely cause: the insert succeeds, but the events query is keyed to the currently-viewed week (`["events", weekStart.toISOString()]`). When the new event is on a different week, the home screen looks unchanged so it feels like nothing happened.

Fix:
- After a successful save in `AddEventSheet` and `UploadFlyerSheet`, jump the calendar to the week of the newly added event (lift a `onSaved(date)` callback from `HomePage` → both sheets → set `weekStart` and `activeDay`).
- Surface any insert errors more loudly (console.error + toast with the actual Postgres message) so future failures are visible.
- Add a small `console.debug` around insert for diagnostic purposes if it still fails after the requery fix.

## 2. Priority field on events

Database (migration):
- Add `priority` enum `('low','normal','high')` with default `'normal'` to `public.events`.
- Index on `(household_id, priority, start_datetime)` for the priorities panel query.

Frontend:
- Extend `HearthEvent`, `EventFormValues`, and `DraftEvent` types with `priority`.
- Add a `PriorityPicker` (3 chip buttons: Low / Normal / High) inside `EventForm` and in the per-event card in `UploadFlyerSheet`'s confirm step.
- Color-coordinate priority in `src/styles.css` (new tokens `--priority-high`, `--priority-normal`, `--priority-low` with foregrounds) and render a small priority dot/badge on `EventCard`.

## 3. Top reminders panel (priorities)

- New `PrioritiesPanel` component placed in `HomePage` header row to the right of the month title (stacks under it on mobile).
- Query: upcoming events with `priority = 'high'` from today forward, limit 5, ordered by `start_datetime`.
- Each item: colored dot, title, relative date ("Today", "Tomorrow", "Fri May 22"). Click → open `EventDrawer`.
- Empty state: "No high priorities".

## 4. Week / Month view toggle

- Add a segmented toggle ("Week" | "Month") in the header.
- Persist choice in `localStorage` (`hearth:view`).
- New `MonthView` component:
  - Renders a 6×7 grid for the visible month using `date-fns` (`startOfMonth`, `endOfMonth`, `eachDayOfInterval` padded to whole weeks).
  - Each cell shows the day number, up to 3 event chips (category-colored), and a "+N more" affordance.
  - Cell click → opens that day's events in a sheet (reusing `EventCard`); empty cell click → quick-add for that date.
- Update HomePage navigation: prev/next moves by week in Week view, by month in Month view; "Today" jumps back to current period. The query range expands to the visible month when in Month view.

## 5. Camera capture (separate from upload + manual)

- In `AddActionFab`'s sheet, split the existing "Upload a photo" option into two:
  1. **Take a photo** — opens the camera (`<input type="file" accept="image/*" capture="environment">`).
  2. **Choose from library** — file picker without `capture`.
  3. **Add manually** — unchanged.
- Refactor `UploadFlyerSheet` to accept a `mode: "camera" | "library"` prop that controls the `capture` attribute, and auto-trigger the file input on open so the camera launches immediately in camera mode.

## Files touched

- New: `supabase/migrations/<ts>_event_priority.sql`, `src/components/MonthView.tsx`, `src/components/PrioritiesPanel.tsx`, `src/components/PriorityPicker.tsx`, `src/components/ViewToggle.tsx`.
- Edited: `src/lib/hearth.ts`, `src/components/HomePage.tsx`, `src/components/EventForm.tsx`, `src/components/EventCard.tsx`, `src/components/AddEventSheet.tsx`, `src/components/UploadFlyerSheet.tsx`, `src/components/AddActionFab.tsx`, `src/styles.css`.

## Out of scope

- Reminder notifications (push/email).
- Editing existing events' priority from the calendar without opening the form.
- Drag-and-drop on month view.
