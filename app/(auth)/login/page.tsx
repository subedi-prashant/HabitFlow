"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { GoogleIcon } from "@/components/auth/google-icon";
import { PasswordInput } from "@/components/auth/password-input";
import { AppLogo } from "@/components/layout/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const signupsEnabled = process.env.NEXT_PUBLIC_SIGNUPS_ENABLED === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get("redirectTo");
  const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
    ? requestedRedirect
    : "/dashboard";
  const supabase = createClient();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Welcome back");
    router.push(redirectTo);
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    if (!signupsEnabled) {
      toast.error("Google access is paused while registration is invite-only.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
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
        <div className="mb-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/65 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5 text-primary" />
            Member access
          </div>
          <p className="editorial-kicker mb-3">Continue your momentum</p>
          <h1 className="editorial-title text-4xl sm:text-5xl">Welcome back.</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            Sign in to see today&apos;s habits, training volume, and activity progress.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
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
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 rounded-xl bg-background/80 px-4"
              required
            />
          </div>

          <Button type="submit" className="h-12 w-full justify-between rounded-xl px-4 text-sm font-bold" disabled={loading}>
            <span className="flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </span>
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Or continue with
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-12 w-full gap-3 rounded-xl bg-background/70"
          disabled={!signupsEnabled}
          onClick={handleGoogleLogin}
        >
          <GoogleIcon />
          Google
        </Button>

        <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
          {signupsEnabled ? (
            <p>
              New to HabitFlow?{" "}
              <Link href="/signup" className="font-bold text-foreground underline decoration-primary decoration-2 underline-offset-4">
                Create an account
              </Link>
            </p>
          ) : (
            <p>Registration is invite-only. Existing members can sign in above.</p>
          )}
        </div>
      </section>
    </div>
  );
}
