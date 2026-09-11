"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, UserPlus } from "lucide-react";
import { GoogleIcon } from "@/components/auth/google-icon";
import { PasswordInput } from "@/components/auth/password-input";
import { AppLogo } from "@/components/layout/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function SignUpPage() {
  const signupsEnabled = process.env.NEXT_PUBLIC_SIGNUPS_ENABLED === "true";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!signupsEnabled) {
      toast.error("Registration is currently invite-only.");
      return;
    }

    setLoading(true);
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Account created. Check your email to verify it.");
    router.push("/login");
  };

  const handleGoogleSignUp = async () => {
    if (!signupsEnabled) {
      toast.error("Registration is currently invite-only.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="w-full max-w-[31rem]">
      <div className="mb-8 lg:hidden">
        <AppLogo href="/login" />
      </div>

      <section className="rounded-[1.5rem] border border-border bg-card/95 p-5 shadow-[0_24px_80px_rgba(17,20,13,0.12)] backdrop-blur-xl sm:p-8">
        <div className="mb-7">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/65 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <UserPlus className="h-3.5 w-3.5 text-primary" />
            New athlete profile
          </div>
          <p className="editorial-kicker mb-3">Start with one repeatable day</p>
          <h1 className="editorial-title text-4xl sm:text-5xl">Create your account.</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Set up your space for habits, workouts, and everyday movement.
          </p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="h-12 rounded-xl bg-background/80 px-4"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 rounded-xl bg-background/80 px-4"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <span className="text-xs text-muted-foreground">6+ characters</span>
            </div>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 rounded-xl bg-background/80 px-4"
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="h-12 w-full justify-between rounded-xl px-4 font-bold" disabled={loading || !signupsEnabled}>
            <span className="flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create account
            </span>
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Or continue with
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" className="h-12 w-full gap-3 rounded-xl bg-background/70" disabled={!signupsEnabled} onClick={handleGoogleSignUp}>
          <GoogleIcon />
          Google
        </Button>

        <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
          Already a member?{" "}
          <Link href="/login" className="font-bold text-foreground underline decoration-primary decoration-2 underline-offset-4">
            Sign in
          </Link>
        </p>
      </section>
    </div>
  );
}
