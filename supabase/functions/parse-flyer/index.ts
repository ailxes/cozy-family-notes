// Supabase Edge Function: parse-flyer
// Uses Anthropic Claude vision to extract events from a flyer image.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Confidence = "high" | "medium" | "low";
interface ParseResult {
  events: unknown[];
  confidence: Confidence;
  raw_text_observed: string;
}

function detectMime(path: string): string {
  const ext = path.toLowerCase().split(".").pop() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function lowConfidence(msg: string): ParseResult {
  return { events: [], confidence: "low", raw_text_observed: `Parse failed: ${msg}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const respond = (body: ParseResult) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });

  try {
    const { image_path, household_id } = await req.json();
    if (!image_path || !household_id) {
      return respond(lowConfidence("missing image_path or household_id"));
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return respond(lowConfidence("ANTHROPIC_API_KEY not configured"));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Download image from Storage
    const { data: blob, error: dlErr } = await supabase.storage
      .from("flyers")
      .download(image_path);
    if (dlErr || !blob) return respond(lowConfidence(dlErr?.message ?? "download failed"));

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const base64 = bytesToBase64(bytes);
    const mediaType = detectMime(image_path);

    // 2. Build prompt
    const today = new Date().toISOString().split("T")[0];
    const text = `You are analyzing a photo of a school flyer, notice, calendar, or announcement. Extract all events, dates, deadlines, and action items into structured JSON.

Today's date is ${today}. Use this to resolve relative dates like "next Thursday" or "this Friday."

Return ONLY a valid JSON object — no markdown, no code fences, no preamble. The structure must be:

{
  "events": [
    {
      "title": "string — concise event name",
      "start_datetime": "ISO 8601 datetime string with timezone offset, e.g. 2026-05-22T17:00:00-07:00 — assume Pacific Time / America/Los_Angeles unless the flyer specifies otherwise",
      "end_datetime": "ISO 8601 or null if not specified",
      "all_day": "boolean — true if no specific time given",
      "category": "one of: school, sports, deadline, spirit_day, personal, other",
      "description": "string — relevant details from the flyer",
      "preparation_notes": "string or null — what the family needs to do, bring, wear, sign, or pay. Be specific: 'Wear yellow', 'Bring $5 cash', 'Sign permission slip and return by Tuesday'"
    }
  ],
  "confidence": "high | medium | low — your confidence in the extraction",
  "raw_text_observed": "string — a brief summary of what text/info you could see in the image, useful for debugging when extraction is poor"
}

Category guidance:
- "deadline" = permission slips due, payment due, registration due, forms due, anything time-sensitive that requires action
- "spirit_day" = themed dress days, color days, pajama day, crazy hair day
- "sports" = games, practices, tournaments, team events
- "school" = general school events, assemblies, parent meetings, performances, field trips, parties
- "personal" = use sparingly, only if flyer is clearly non-school
- "other" = doesn't fit above

Important rules:
1. If you see multiple events on one flyer (e.g. a monthly calendar), extract ALL of them as separate event objects.
2. If a date is ambiguous or missing, do not invent one — omit that event and note it in raw_text_observed.
3. If the image is unreadable, blurry, or not a school flyer, return {"events": [], "confidence": "low", "raw_text_observed": "describe what you see"}.
4. Preparation notes should be ACTIONABLE — what does the parent need to do? Skip generic notes.
5. Times: convert "3pm" to 15:00, "noon" to 12:00, etc. If only a date is given with no time, set all_day to true.`;

    // 3. Call Anthropic
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              { type: "text", text },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic error", anthropicRes.status, errText);
      return respond(lowConfidence(`Anthropic ${anthropicRes.status}`));
    }

    const payload = await anthropicRes.json();
    const rawText: string = payload?.content?.[0]?.text ?? "";

    // Strip stray code fences
    const cleaned = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: ParseResult;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse failed", e, "raw:", rawText.slice(0, 500));
      return respond(lowConfidence("model returned non-JSON"));
    }

    // Normalize shape
    const result: ParseResult = {
      events: Array.isArray(parsed?.events) ? parsed.events : [],
      confidence: (["high", "medium", "low"].includes(parsed?.confidence as string)
        ? parsed.confidence
        : "medium") as Confidence,
      raw_text_observed:
        typeof parsed?.raw_text_observed === "string" ? parsed.raw_text_observed : "",
    };

    // 4. Persist on uploaded_images row (best-effort)
    await supabase
      .from("uploaded_images")
      .update({ parsed: true, parse_result: result })
      .eq("household_id", household_id)
      .eq("storage_path", image_path);

    return respond(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("parse-flyer fatal", msg);
    return respond(lowConfidence(msg));
  }
});
