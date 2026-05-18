import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hearth — Your family's week, at a glance" },
      {
        name: "description",
        content:
          "A calm shared calendar for parents to track school events, sports, deadlines, and family plans.",
      },
    ],
  }),
  component: HomePage,
});
