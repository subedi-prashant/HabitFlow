"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/auth/password-input";
import { AppLogo } from "@/components/layout/app-logo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password !== confirmation) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password updated");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="w-full max-w-[31rem]">
      <div className="mb-8 lg:hidden">
        <AppLogo href="/login" />
      </div>
      <section className="rounded-[1.5rem] border border-border bg-card/95 p-5 shadow-[0_24px_80px_rgba(17,20,13,0.12)] backdrop-blur-xl sm:p-8">
        <div className="mb-7">
          <span className="mb-6 grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound className="h-5 w-5" />
          </span>
          <p className="editorial-kicker mb-3">Secure your account</p>
          <h1 className="editorial-title text-4xl sm:text-5xl">Choose a new password.</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Use at least six characters and avoid passwords you use elsewhere.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              placeholder="Enter a new password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 rounded-xl bg-background/80 px-4"
              minLength={6}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="Repeat your new password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="h-12 rounded-xl bg-background/80 px-4"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="h-12 w-full justify-between rounded-xl px-4 font-bold" disabled={loading}>
            <span className="flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </span>
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      </section>
    </div>
  );
}
