import { supabase } from "@/integrations/supabase/client";
import type { ParseFlyerResponse, ParsedEvent, ParseConfidence } from "./parseFlyer";

export async function parseDictation(transcript: string): Promise<ParseFlyerResponse> {
  const { data, error } = await supabase.functions.invoke("parse-dictation", {
    body: { transcript },
  });

  if (error) {
    return {
      events: [],
      confidence: "low",
      raw_text_observed: `Request failed: ${error.message}`,
    };
  }

  const events = Array.isArray(data?.events) ? (data.events as ParsedEvent[]) : [];
  const confidence: ParseConfidence =
    data?.confidence === "high" || data?.confidence === "medium" || data?.confidence === "low"
      ? data.confidence
      : "low";

  return {
    events,
    confidence,
    raw_text_observed: typeof data?.raw_text_observed === "string" ? data.raw_text_observed : "",
  };
}
