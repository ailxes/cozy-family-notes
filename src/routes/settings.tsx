import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/SettingsPage";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Hearth" },
      { name: "description", content: "Manage your Hearth profile and household." },
    ],
  }),
  component: SettingsPage,
});
