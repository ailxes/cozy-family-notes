import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AppShell } from "./AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SHARED_HOUSEHOLD_ID } from "@/lib/hearth";

export function SettingsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: household } = useQuery({
    queryKey: ["household", SHARED_HOUSEHOLD_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("households")
        .select("id, name")
        .eq("id", SHARED_HOUSEHOLD_ID)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (household?.name) setName(household.name);
  }, [household?.name]);

  const onSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("households")
      .update({ name: name.trim() })
      .eq("id", SHARED_HOUSEHOLD_ID);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Household name saved");
    qc.invalidateQueries({ queryKey: ["household"] });
  };

  return (
    <AppShell>
      <div className="px-5 md:px-6 py-6 space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hearth runs as one shared family workspace. Add a login later when
            you're ready.
          </p>
        </div>

        <section className="rounded-2xl bg-card border border-border p-5 space-y-4">
          <h2 className="font-serif text-lg font-semibold">Household name</h2>
          <div className="space-y-2">
            <Label htmlFor="hh-name">What should we call your family?</Label>
            <div className="flex gap-2">
              <Input
                id="hh-name"
                value={name}
                placeholder="Our Family"
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl"
              />
              <Button
                onClick={onSave}
                disabled={saving || !name.trim()}
                className="h-11 rounded-xl"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-card border border-border p-5 space-y-2">
          <h2 className="font-serif text-lg font-semibold">About</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Everyone with this link sees the same calendar. Events, uploads,
            and changes sync live across devices.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
