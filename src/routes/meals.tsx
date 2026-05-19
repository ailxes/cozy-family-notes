import { createFileRoute } from "@tanstack/react-router";
import { MealsPage } from "@/components/MealsPage";

export const Route = createFileRoute("/meals")({
  head: () => ({
    meta: [
      { title: "Meal menu — Hearth" },
      {
        name: "description",
        content:
          "Build a family meal menu and schedule meals on your shared calendar.",
      },
    ],
  }),
  component: MealsPage,
});
