"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, LogOut } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { PRIMARY_NAVIGATION, SECONDARY_NAVIGATION } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { data: profile } = useProfile();
  const initials = profile?.full_name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "HF";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const renderNavigation = (items: typeof PRIMARY_NAVIGATION) =>
    items.map((item) => {
      const isActive = pathname.startsWith(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
            isActive
              ? "bg-foreground text-background shadow-[3px_3px_0_hsl(var(--primary))]"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <span className="flex items-center gap-3">
            <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.5 : 2} />
            {item.label}
          </span>
          {isActive && <ArrowUpRight className="h-4 w-4 text-primary" />}
        </Link>
      );
    });

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[17.5rem] flex-col border-r border-border bg-card/95 lg:flex">
      <div className="border-b border-border px-6 py-5">
        <AppLogo />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Track</p>
        <nav className="space-y-1">{renderNavigation(PRIMARY_NAVIGATION)}</nav>

        <p className="mb-2 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Organize</p>
        <nav className="space-y-1">{renderNavigation(SECONDARY_NAVIGATION)}</nav>
      </div>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-secondary/70 p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-xs font-black text-primary-foreground">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{profile?.full_name || "Your profile"}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Building momentum</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
