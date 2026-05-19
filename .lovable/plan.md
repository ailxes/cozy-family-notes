# Plan

## 1. Make Month the default view

- `HomePage.tsx`: initial `view` state becomes `"month"`. `localStorage` key `hearth:view` still wins if previously set, so existing users aren't disrupted.
- Initial `anchor` initialized to `startOfMonth(now)` instead of `startOfWeek(now)`.

## 2. Google-Calendar-style month view (mobile-first)

Rework `MonthView.tsx`:

- **Grid**: full-bleed 7-col grid, no rounded card per cell. Thin top border per row, thin left border per cell — flat, dense, like Google Calendar.
- **Cells**: fixed min-height instead of aspect-square so mobile rows are tighter and uniform. Day number top-left; today gets a filled circle behind the number (primary).
- **Out-of-month days**: muted number, no events shown.
- **Event chips**: small colored bars (category color), 1 line, truncated. Mobile (`< sm`) shows compact **dots** when >2 events (Google Calendar mobile pattern); ≥ sm shows up to 3 chip rows + "+N".
- **Selected day**: tapping a day selects it (ring highlight) and reveals an agenda list **below the grid** showing that day's events (Google month-mobile pattern). Second tap on the same day (or "Open week") jumps to week view.
- Week headers stay (S M T W T F S, Mon-first per existing setup).
- `WeekStrip` hidden in month view (already conditional).

Files: `MonthView.tsx` rewrite, small CSS additions in `styles.css` for the today-circle and selected-ring tokens.

## 3. Voice dictation → Claude → event(s)

New flow that mirrors the flyer pipeline.

**UI**
- `AddActionFab.tsx`: add a 4th option **"Dictate event"** (mic icon).
- New `DictateEventSheet.tsx` (bottom sheet):
  - Big mic button: tap to start/stop. Uses **Web Speech API** (`webkitSpeechRecognition` / `SpeechRecognition`) for live transcription — no extra dependency, works in Chrome/Safari iOS 14.5+.
  - Live transcript shown as it streams.
  - Fallback if API unavailable: textarea + "Transcribe with voice not supported on this browser — type instead."
  - "Use this" button → calls the parser, then opens the existing event-confirmation UI (reuse `UploadFlyerSheet`'s confirmation list pattern, extracted into a shared `EventDraftsConfirm` component so both flyer and dictation share it).
  - Each parsed event editable (title/date/time/category/priority) before "Add all to calendar".

**Backend**
- Extend the existing `parse-flyer` edge function OR add a sibling `parse-dictation` function. Cleaner: new function `parse-dictation/index.ts` that accepts `{ transcript: string }` and calls Claude (Anthropic API, reusing `ANTHROPIC_API_KEY`) with a text-only prompt:
  - System prompt: today's date, timezone, instruct to output the same JSON schema `{ events, confidence, raw_text_observed }` as the flyer parser.
  - Resolves relative phrases ("tomorrow at 3", "next Friday morning", "every Tuesday for swim" → still single events for now; recurrence flagged in raw_text).
- Uses `claude-sonnet-4-5` (same model as flyer).
- Returns the same shape so the confirmation UI is reused unchanged.

**Client wiring**
- `src/lib/parseFlyer.ts`: keep as-is. Add `src/lib/parseDictation.ts` that invokes the new function.
- `DictateEventSheet` calls `parseDictation(transcript)` → on success opens drafts confirmation → on save inserts via the existing `events` insert path with `source: "dictation"`.

## 4. Out of scope
- True realtime streaming STT (ElevenLabs) — Web Speech API is free and sufficient for v1. Can upgrade later.
- Recurring events.
- Drag/resize on month view.

## Files

**Edit**: `src/components/HomePage.tsx`, `src/components/MonthView.tsx`, `src/components/AddActionFab.tsx`, `src/styles.css`.
**Create**: `src/components/DictateEventSheet.tsx`, `src/components/EventDraftsConfirm.tsx` (extracted shared UI), `src/lib/parseDictation.ts`, `supabase/functions/parse-dictation/index.ts`.
**Migration**: none required. (Optional: extend `source` check to allow `'dictation'` — current column appears to be free-text, so no migration needed.)

## Technical notes

- Web Speech API: `const rec = new (window.SpeechRecognition || window.webkitSpeechRecognition)(); rec.continuous = true; rec.interimResults = true;` Guard with feature detection; show fallback UI otherwise. Request mic permission on first tap.
- The new edge function must be added to `supabase/config.toml` with `verify_jwt = false` matching `parse-flyer`'s settings.
- Reuse the same JSON-extraction + error-toast pattern from `parse-flyer` to keep behavior consistent.
