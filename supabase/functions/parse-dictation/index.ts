// Supabase Edge Function: parse-dictation
// Uses Anthropic Claude to turn a spoken transcript into structured events.

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

function low(msg: string): ParseResult {
  return { events: [], confidence: "low", raw_text_observed: `Parse failed: ${msg}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const respond = (body: ParseResult) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });

  try {
    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== "string") {
      return respond(low("missing transcript"));
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return respond(low("ANTHROPIC_API_KEY not configured"));

    const today = new Date().toISOString().split("T")[0];
    const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

    const prompt = `You are a calendar assistant. The user spoke this out loud to schedule one or more events:

"""
${transcript}
"""

Today is ${dayName}, ${today}. Assume Pacific Time (America/Los_Angeles) unless they say otherwise.

Return ONLY a valid JSON object — no markdown, no code fences, no preamble:

{
  "events": [
    {
      "title": "concise event name",
      "start_datetime": "ISO 8601 with timezone offset, e.g. 2026-05-22T17:00:00-07:00",
      "end_datetime": "ISO 8601 or null",
      "all_day": "boolean — true when no specific time was said",
      "category": "school | sports | deadline | spirit_day | personal | other",
      "description": "any extra context they mentioned",
      "preparation_notes": "what to bring / wear / do, or null"
    }
  ],
  "confidence": "high | medium | low",
  "raw_text_observed": "brief restatement of what you understood"
}

Rules:
1. Resolve relative dates ("tomorrow", "next Friday", "this Saturday morning", "in two weeks") using today's date above.
2. Default duration is 1 hour if they give a start time without an end. If no time is given, set all_day=true.
3. If they describe multiple events, return them all as separate items.
4. If you cannot confidently pull a date, set events=[] and confidence="low", and put what you heard in raw_text_observed.
5. Pick the best category. Use "personal" for family/home things, "school" for school events, "sports" for games/practices.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic error", anthropicRes.status, errText);
      return respond(low(`Anthropic ${anthropicRes.status}`));
    }

    const payload = await anthropicRes.json();
    const rawText: string = payload?.content?.[0]?.text ?? "";

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
      return respond(low("model returned non-JSON"));
    }

    return respond({
      events: Array.isArray(parsed?.events) ? parsed.events : [],
      confidence: (["high", "medium", "low"].includes(parsed?.confidence as string)
        ? parsed.confidence
        : "medium") as Confidence,
      raw_text_observed:
        typeof parsed?.raw_text_observed === "string" ? parsed.raw_text_observed : transcript,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("parse-dictation fatal", msg);
    return respond(low(msg));
  }
});
