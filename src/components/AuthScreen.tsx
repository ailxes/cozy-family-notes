import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="text-4xl font-serif font-semibold text-foreground">Hearth</h1>
          <p className="mt-3 text-muted-foreground text-base leading-relaxed">
            A calm, shared space for your family's week.
          </p>
        </div>

        {sent ? (
          <div className="bg-card rounded-2xl p-8 text-center shadow-soft border border-border">
            <Mail className="w-10 h-10 mx-auto text-primary mb-4" />
            <h2 className="font-serif text-xl font-semibold mb-2">Check your inbox</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a magic link to{" "}
              <span className="font-medium text-foreground">{email}</span>. Tap it to
              sign in.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-6 text-sm text-primary hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="bg-card rounded-2xl p-7 shadow-soft border border-border space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@home.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl text-base"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-base font-medium"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Send magic link"
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground leading-relaxed">
              No password needed. We'll email you a link to sign in.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
