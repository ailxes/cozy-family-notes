// Supabase Edge Function: parse-recipe
// Uses Anthropic Claude vision to extract a single meal entry from a recipe photo.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";
type Confidence = "high" | "medium" | "low";

interface ParseResult {
  meal: {
    name: string;
    type: MealType;
    notes: string;
  } | null;
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

function fail(msg: string): ParseResult {
  return { meal: null, confidence: "low", raw_text_observed: `Parse failed: ${msg}` };
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
      return respond(fail("missing image_path or household_id"));
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return respond(fail("ANTHROPIC_API_KEY not configured"));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: blob, error: dlErr } = await supabase.storage
      .from("flyers")
      .download(image_path);
    if (dlErr || !blob) return respond(fail(dlErr?.message ?? "download failed"));

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const base64 = bytesToBase64(bytes);
    const mediaType = detectMime(image_path);

    const text = `You are analyzing a photo of a recipe (cookbook page, recipe card, printout, screenshot, or handwritten note). Extract a single meal entry that a family could add to their meal library.

Return ONLY a valid JSON object — no markdown, no code fences, no preamble. The structure must be:

{
  "meal": {
    "name": "string — concise dish name (e.g. 'Sheet-pan chicken thighs', 'Beef stew')",
    "type": "one of: breakfast, lunch, dinner, snack, other",
    "notes": "string — a brief summary that helps the family cook this later. Include key ingredients (4-8 most important items) and a 1-2 sentence prep summary. Keep under ~400 characters. Do NOT include the full recipe verbatim — just enough to know what it is and what's needed."
  },
  "confidence": "high | medium | low — your confidence in the extraction",
  "raw_text_observed": "string — a brief summary of what text/info you could see in the image, useful for debugging when extraction is poor"
}

Rules:
1. If the image clearly isn't a recipe (e.g. a screenshot of a flyer, a person, or unreadable), return {"meal": null, "confidence": "low", "raw_text_observed": "describe what you see"}.
2. Infer the meal type from the dish (breakfast foods → breakfast, soups/sandwiches/salads → lunch, hearty dinners → dinner, etc.). Default to "dinner" if uncertain.
3. If the recipe name isn't obvious, create a short descriptive one from the ingredients (e.g. "Lemon-garlic salmon").
4. Notes should be useful at-a-glance — not the full recipe. Think "the bullet you'd put on a meal planner card".`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
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
      return respond(fail(`Anthropic ${anthropicRes.status}`));
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
      return respond(fail("model returned non-JSON"));
    }

    const validTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack", "other"];
    const meal = parsed?.meal && typeof parsed.meal === "object"
      ? {
          name: typeof parsed.meal.name === "string" ? parsed.meal.name.trim() : "",
          type: validTypes.includes(parsed.meal.type as MealType)
            ? (parsed.meal.type as MealType)
            : "dinner" as MealType,
          notes: typeof parsed.meal.notes === "string" ? parsed.meal.notes.trim() : "",
        }
      : null;

    const result: ParseResult = {
      meal: meal && meal.name ? meal : null,
      confidence: (["high", "medium", "low"].includes(parsed?.confidence as string)
        ? parsed.confidence
        : "medium") as Confidence,
      raw_text_observed:
        typeof parsed?.raw_text_observed === "string" ? parsed.raw_text_observed : "",
    };

    await supabase
      .from("uploaded_images")
      .update({ parsed: true, parse_result: result as unknown as Record<string, unknown> })
      .eq("household_id", household_id)
      .eq("storage_path", image_path);

    return respond(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("parse-recipe fatal", msg);
    return respond(fail(msg));
  }
});
