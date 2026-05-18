## Goal

Remove the login wall, make the home page a polished shared calendar with color-coded categories, add a visual category picker, and keep the photo-upload → parse flow working — all backed by a single shared cloud workspace (no auth).

## 1. Drop the auth gate (shared workspace)

- **Migration**: seed one fixed shared household (`id = '00000000-0000-0000-0000-0000000000a1'`, name `'Shared Family'`), drop existing strict RLS on `events`, `uploaded_images`, `households` and replace with open policies scoped to that household id only — anonymous role can `SELECT/INSERT/UPDATE/DELETE` events and `SELECT/INSERT` uploaded_images where `household_id = '…a1'`. Leave `profiles`, `household_members`, `household_invites` policies untouched (those tables become dormant).
- Make `events.created_by` nullable (it already is) and stop sending it.
- **Storage**: `flyers` bucket is already public; add INSERT/SELECT policies for the `anon` role so uploads work signed-out.
- **Code**: delete the auth/household gating from `HomePage.tsx`. Replace `useAuth` + `useHousehold` with a single constant `SHARED_HOUSEHOLD_ID` exported from `src/lib/hearth.ts`. Remove `userId` prop threading in `AddActionFab`, `AddEventSheet`, `UploadFlyerSheet` (and stop writing `created_by` / `uploaded_by`). Keep `AuthScreen.tsx` and `useAuth.ts` on disk (unused) so it's easy to switch back on later. Settings page becomes a simple "About" / household-name editor.
- Remove the AuthSync subscription from `__root.tsx` (since no session).

## 2. Polished week calendar (home page)

Replace the current flat day-list with a layered layout:

```text
┌─────────────────────────────────────────────────────┐
│  May 2026                       ‹  Today  ›          │  header
│  Week of May 18                                       │
├─────────────────────────────────────────────────────┤
│  M 18  T 19  W 20  T 21  F 22  S 23  S 24            │  mini week strip
│   •      ••     —     •     •••    —     —           │  (dots = event count, today highlighted)
├─────────────────────────────────────────────────────┤
│  ╭─ Monday · May 18 ──────────────────╮               │
│  │ 9:00a  School pickup       [school]│               │  color-tinted card
│  │ 5:30p  Soccer practice     [sports]│               │
│  ╰────────────────────────────────────╯               │
│  ╭─ Tuesday · May 19 ─────────────────╮               │
│  │ Nothing scheduled                  │               │
│  ╰────────────────────────────────────╯               │
└─────────────────────────────────────────────────────┘
```

- New `WeekStrip` component above `WeekView`: 7 pill buttons, each shows day-letter + date, count dot, "Today" ring, active day scrolls into view.
- `WeekView` upgrades: smoother day cards (subtle gradient header per day, left color bar matching the dominant category for the day), `EventCard` gains a small left color-bar + category chip pill, hover lift, time on the left in tabular numerals.
- Header gets swipe / arrow week nav (already there) + a `Jump to date` popover using the existing `Calendar` shadcn component.
- Empty days show a faint dashed "+ Add" affordance that opens the manual add sheet pre-filled with that date.

## 3. Visual color-coded category picker

Refactor the `Category` field in `EventForm.tsx` (used by both manual add and the upload confirm step) from a plain Select to a `CategoryPicker` grid:

- 6 swatch buttons (school / sports / deadline / spirit / personal / other), each rendered with its `--cat-*` background, label underneath, check mark on selection, ring on focus.
- Reuses the existing `CATEGORY_STYLES` tokens so colors stay in sync with the cards on the calendar.
- Same component drops into `UploadFlyerSheet` confirm cards.

## 4. Photo upload flow (keep + polish)

The flow already works — confirm it after the household/userId refactor:

- Anonymous client uploads to `flyers/<shared-household-id>/…`.
- `parseFlyer()` mock still returns the Spring Carnival sample; the confirm sheet now uses the new `CategoryPicker` so the parsed events are visibly color-coded before save.
- Add a per-draft date jump-to-this-week hint and a "Discard photo" secondary button.

## 5. Cleanup

- Remove unused `useAuth` / `useHousehold` imports from `HomePage`, `AddActionFab`, `AddEventSheet`, `UploadFlyerSheet`, `SettingsPage`.
- Update `settings.tsx` route content to drop "Sign out" / household-member list; keep household-rename and the (still-functional) UI for future.
- Update README-style strings ("Sign in to your family hub" etc.) to friendly anonymous copy.

## Technical notes

- **Migration order**: `DROP POLICY` existing event/upload policies → `INSERT INTO households` (idempotent with `ON CONFLICT DO NOTHING`) → recreate policies that allow `anon` + `authenticated` where `household_id = '…a1'` → storage policies for `anon` on the `flyers` bucket.
- **Anonymous Supabase access**: the client already uses the publishable key with `persistSession: true`; no session is required for `anon`-scoped RLS to apply. No code changes to `client.ts`.
- **Realtime (optional, fast win)**: enable `supabase_realtime` on `events` so two browsers see updates immediately — small addition in the same migration; the home page subscribes inside a `useEffect` and invalidates `["events"]`.
- **No new packages required.** All visuals use existing shadcn + tokens.
- Login can be re-added later by re-enabling the auth gate in `HomePage` and tightening the RLS policies back to `is_household_member(...)` — code paths remain.

## Out of scope (for this turn)

- Real Anthropic flyer parsing (still mocked).
- Month view, recurring events, notifications, digest emails.
- Multi-household / true accounts.
