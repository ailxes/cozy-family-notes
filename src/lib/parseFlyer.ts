import type { EventCategory } from "./hearth";

export interface ParsedEvent {
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime?: string;
  all_day?: boolean;
  category: EventCategory;
  preparation_notes?: string;
}

export interface ParseFlyerResponse {
  events: ParsedEvent[];
}

/**
 * Mock flyer parser. Replace with a server function that calls the Anthropic
 * API when wiring real OCR. The shape returned here matches what the
 * confirmation screen expects.
 */
export async function parseFlyer(_imageUrl: string): Promise<ParseFlyerResponse> {
  // Simulate latency so the loading state is visible
  await new Promise((r) => setTimeout(r, 1400));

  const base = new Date();
  base.setDate(base.getDate() + 4);
  base.setHours(17, 0, 0, 0);
  const end = new Date(base);
  end.setHours(20, 0, 0, 0);

  return {
    events: [
      {
        title: "Spring Carnival",
        start_datetime: base.toISOString(),
        end_datetime: end.toISOString(),
        all_day: false,
        category: "school",
        description: "Annual spring carnival with games and food trucks",
        preparation_notes: "Bring cash for food trucks",
      },
    ],
  };
}
