import { supabase } from "@/integrations/supabase/client";
import type { MealType } from "./meals";

export interface ParsedMeal {
  name: string;
  type: MealType;
  notes: string;
}

export type ParseConfidence = "high" | "medium" | "low";

export interface ParseRecipeResponse {
  meal: ParsedMeal | null;
  confidence: ParseConfidence;
  raw_text_observed: string;
}

/**
 * Calls the `parse-recipe` Supabase Edge Function which runs Claude vision
 * against the uploaded image in Storage and returns a single meal entry.
 */
export async function parseRecipe(
  imagePath: string,
  householdId: string,
): Promise<ParseRecipeResponse> {
  const { data, error } = await supabase.functions.invoke("parse-recipe", {
    body: { image_path: imagePath, household_id: householdId },
  });

  if (error) {
    return {
      meal: null,
      confidence: "low",
      raw_text_observed: `Request failed: ${error.message}`,
    };
  }

  const confidence: ParseConfidence =
    data?.confidence === "high" || data?.confidence === "medium" || data?.confidence === "low"
      ? data.confidence
      : "low";

  return {
    meal: data?.meal && typeof data.meal === "object" && typeof data.meal.name === "string"
      ? {
          name: data.meal.name,
          type: data.meal.type,
          notes: typeof data.meal.notes === "string" ? data.meal.notes : "",
        }
      : null,
    confidence,
    raw_text_observed: typeof data?.raw_text_observed === "string" ? data.raw_text_observed : "",
  };
}
