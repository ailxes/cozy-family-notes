import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, UserPlus, X, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useHousehold,
  useHouseholdMembers,
  useHouseholdInvites,
} from "@/hooks/useHousehold";
import { AuthScreen } from "./AuthScreen";
import { AppShell } from "./AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SettingsPage() {
  const { user, loading } = useAuth();
  const { data: household } = useHousehold(user?.id);
  const { data: members } = useHouseholdMembers(household?.id);
  const { data: invites } = useHouseholdInvites(household?.id);
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [inviting, setInviting] = useState(false);

  if (loading) return null;
  if (!user) return <AuthScreen />;

  const myProfile = members?.find((m) => m.user_id === user.id);
  const displayName = name || myProfile?.full_name || "";

  const saveName = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() })
      .eq("id", user.id);
    setSavingName(false);
    if (error) return toast.error(error.message);
    toast.success("Name saved");
    setName("");
    qc.invalidateQueries({ queryKey: ["household-members"] });
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !household) return;
    setInviting(true);
    const { error } = await supabase.from("household_invites").insert({
      household_id: household.id,
      email: inviteEmail.trim().toLowerCase(),
      invited_by: user.id,
    });
    setInviting(false);
    if (error) return toast.error(error.message);
    toast.success("Invite saved. They'll join when they sign up with that email.");
    setInviteEmail("");
    qc.invalidateQueries({ queryKey: ["household-invites"] });
  };

  const revokeInvite = async (id: string) => {
    const { error } = await supabase.from("household_invites").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["household-invites"] });
  };

  return (
    <AppShell>
      <div className="px-5 md:px-6 py-6 space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your profile and household.
          </p>
        </div>

        <section className="rounded-2xl bg-card border border-border p-5 space-y-4">
          <h2 className="font-serif text-lg font-semibold">Your profile</h2>
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="text-sm text-muted-foreground px-3 py-2.5 rounded-xl bg-muted">
              {user.email}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                placeholder={displayName || "Add your name"}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl"
              />
              <Button
                onClick={saveName}
                disabled={savingName || !name.trim()}
                className="h-11 rounded-xl"
              >
                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-card border border-border p-5 space-y-4">
          <h2 className="font-serif text-lg font-semibold">Household</h2>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Members
            </Label>
            <div className="space-y-1.5">
              {members?.map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {m.full_name || m.email}
                    </div>
                    {m.full_name && (
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {invites && invites.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Pending invites
              </Label>
              <div className="space-y-1.5">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-accent/30"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      {inv.email}
                    </div>
                    <button
                      onClick={() => revokeInvite(inv.id)}
                      className="p-1 rounded-full hover:bg-background"
                      aria-label="Revoke invite"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-border">
            <Label htmlFor="invite">Invite by email</Label>
            <div className="flex gap-2">
              <Input
                id="invite"
                type="email"
                value={inviteEmail}
                placeholder="spouse@example.com"
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-11 rounded-xl"
              />
              <Button
                onClick={sendInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="h-11 rounded-xl"
              >
                {inviting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              They'll join automatically the first time they sign in with that email.
            </p>
          </div>
        </section>

        <Button
          variant="ghost"
          onClick={async () => {
            await supabase.auth.signOut();
            toast.success("Signed out");
          }}
          className="w-full h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </AppShell>
  );
}
