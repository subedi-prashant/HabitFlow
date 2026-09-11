import type { Metadata } from "next";
import { Check, Dumbbell, Footprints } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import SplashCursor from "@/components/ui/splash-cursor";

export const metadata: Metadata = {
  title: "Sign in — HabitFlow",
  description: "Sign in to track habits, training, and daily movement with HabitFlow.",
};

const HIGHLIGHTS = [
  { icon: Check, label: "Daily habits", detail: "Build a repeatable rhythm" },
  { icon: Dumbbell, label: "Gym sessions", detail: "Log every working set" },
  { icon: Footprints, label: "Active minutes", detail: "Keep movement visible" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="habitflow-auth relative min-h-screen overflow-hidden bg-background text-foreground">
      <SplashCursor DYE_RESOLUTION={900} SPLAT_FORCE={4500} DENSITY_DISSIPATION={4} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--border)/0.18)_1px,transparent_1px),linear-gradient(hsl(var(--border)/0.18)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1540px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden min-h-screen flex-col justify-between border-r border-border bg-foreground px-12 py-10 text-background lg:flex xl:px-16 xl:py-12">
          <AppLogo href="/login" className="[&>span:first-child]:bg-background [&>span:first-child]:text-foreground [&>span:last-child>span:last-child]:text-background/55" />

          <div className="max-w-2xl">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.24em] text-primary">Consistency is a training skill</p>
            <h1 className="max-w-xl text-6xl font-black leading-[0.9] tracking-[-0.065em] xl:text-7xl">
              Build rhythm.<br />Log the work.<br /><span className="text-primary">See momentum.</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-background/60">
              One focused place for the routines you repeat, the sessions you finish, and the progress that compounds.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-background/15 bg-background/15">
            {HIGHLIGHTS.map((highlight) => (
              <div key={highlight.label} className="bg-foreground p-5">
                <highlight.icon className="mb-8 h-5 w-5 text-primary" />
                <p className="text-sm font-bold">{highlight.label}</p>
                <p className="mt-1 text-xs leading-5 text-background/45">{highlight.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <main className="flex min-h-screen items-center justify-center p-4 sm:p-8 lg:p-12">
          {children}
        </main>
      </div>
    </div>
  );
}
