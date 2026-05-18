
## Heads-up on stack choice

You asked for a Supabase Edge Function + `ANTHROPIC_API_KEY` in the Supabase dashboard. This project is TanStack Start on Lovable Cloud, where the standard pattern is a `createServerFn` with the secret stored as a Lovable Cloud runtime secret (I'd add it for you via a secure form — no dashboard trip). Both work; the server-function path is one less moving part and gives logs in the same place as the rest of the app.

I'll proceed with **Edge Function as you specified** unless you say otherwise in the question below.

## 1. Edge Function `parse-flyer`

Create `supabase/functions/parse-flyer/index.ts` (Deno) with `verify_jwt = false` in `supabase/config.toml`.

Behavior:
- Accept `POST { image_path: string, household_id: string }`. CORS preflight handled.
- Use `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to download from the `flyers` bucket via `supabase.storage.from('flyers').download(image_path)`.
- Detect MIME from the file extension (`.jpg/.jpeg → image/jpeg`, `.png`, `.webp`, `.gif`); fall back to `image/jpeg`.
- Convert the blob to base64 (chunked to avoid call-stack overflow on large images).
- Inject `today = new Date().toISOString().split('T')[0]` into the exact prompt you provided.
- POST to `https://api.anthropic.com/v1/messages` with `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`. Model `claude-sonnet-4-5`, `max_tokens: 2048`, message shape exactly as specified.
- Extract `content[0].text`, strip accidental code fences just in case, `JSON.parse` inside try/catch.
- Update `uploaded_images` row matching `household_id + storage_path = image_path`: set `parsed = true`, `parse_result = <json>`.
- Always respond `200` with `{ events, confidence, raw_text_observed }`. On any failure, return `{ events: [], confidence: "low", raw_text_observed: "Parse failed: <msg>" }`.

## 2. Client (`UploadFlyerSheet.tsx` + `src/lib/parseFlyer.ts`)

- Replace mock `parseFlyer()` with a call to the edge function via `supabase.functions.invoke('parse-flyer', { body: { image_path, household_id } })`. Keep the existing upload-to-Storage step; pass the storage `path` (not the public URL) into the function.
- Extend `ParseFlyerResponse` type with `confidence: 'high' | 'medium' | 'low'` and `raw_text_observed?: string`.
- Loading copy stays "Reading your flyer...", with subtext "This can take a few seconds".
- Confirm screen additions:
  - Small `Badge` showing `AI confidence: high/medium/low` (color-mapped: green/amber/red via existing tokens).
  - If `confidence === 'low'` or `events.length === 0`: render an info panel with `raw_text_observed` and a **Switch to manual add** button that closes the upload sheet and opens `AddEventSheet` pre-filled with `description = raw_text_observed`. (Will add a `defaultDescription` prop to `AddEventSheet`/`EventForm`.)
- On confirm-save, `source_image_url` is already persisted on each event row — keep that.

## 3. Where to add the key (instructions I'll give you after build)

Lovable Cloud → **Connectors → Lovable Cloud → Backend → Edge Functions → Secrets** → add `ANTHROPIC_API_KEY`. (Equivalent to Supabase Dashboard → Project Settings → Edge Functions → Secrets.) I can also add it via the secret tool — just say the word.

## 4. Test + debug path (will be in the final reply)

- Upload a real flyer photo in the app.
- Tail logs: I'll provide the exact tool call / dashboard path (`supabase--edge_function_logs` for me; Dashboard → Functions → parse-flyer → Logs for you).
- Re-run with a clearer image if `confidence: low`.

## Out of scope

- Re-prompting / retries on low confidence.
- Streaming the response.
- Migrating off Edge Functions to `createServerFn` (unless you pick that below).

## One question before I build

