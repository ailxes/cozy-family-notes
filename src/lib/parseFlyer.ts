import { supabase } from "@/integrations/supabase/client";
import type { EventCategory } from "./hearth";

export interface ParsedEvent {
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime?: string | null;
  all_day?: boolean;
  category: EventCategory;
  preparation_notes?: string | null;
}

export type ParseConfidence = "high" | "medium" | "low";

export interface ParseFlyerResponse {
  events: ParsedEvent[];
  confidence: ParseConfidence;
  raw_text_observed?: string;
}

/**
 * Calls the `parse-flyer` Supabase Edge Function which runs Claude vision
 * against the uploaded image in Storage.
 */
export async function parseFlyer(
  imagePath: string,
  householdId: string,
): Promise<ParseFlyerResponse> {
  const { data, error } = await supabase.functions.invoke("parse-flyer", {
    body: { image_path: imagePath, household_id: householdId },
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
