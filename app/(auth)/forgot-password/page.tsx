"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
  };

  return (
    <div className="w-full max-w-[31rem]">
      <div className="mb-8 lg:hidden">
        <AppLogo href="/login" />
      </div>
      <section className="rounded-[1.5rem] border border-border bg-card/95 p-5 shadow-[0_24px_80px_rgba(17,20,13,0.12)] backdrop-blur-xl sm:p-8">
        {sent ? (
          <div>
            <span className="mb-6 grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <p className="editorial-kicker mb-3">Check your inbox</p>
            <h1 className="editorial-title text-4xl">Reset link sent.</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              If an account exists for <span className="font-semibold text-foreground">{email}</span>, a secure password reset link is on its way.
            </p>
            <Button asChild className="mt-8 h-12 w-full justify-between rounded-xl px-4 font-bold">
              <Link href="/login">
                Back to sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div>
            <div className="mb-7">
              <span className="mb-6 grid h-12 w-12 place-items-center rounded-xl bg-secondary text-foreground">
                <Mail className="h-5 w-5" />
              </span>
              <p className="editorial-kicker mb-3">Account recovery</p>
              <h1 className="editorial-title text-4xl sm:text-5xl">Reset your password.</h1>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Enter your account email and we&apos;ll send a secure reset link.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
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
              <Button type="submit" className="h-12 w-full justify-between rounded-xl px-4 font-bold" disabled={loading}>
                <span className="flex items-center gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send reset link
                </span>
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
            <Link href="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
