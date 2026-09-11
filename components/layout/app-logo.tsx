import Link from "next/link";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  compact?: boolean;
  className?: string;
  href?: string;
}

export function AppLogo({ compact = false, className, href = "/dashboard" }: AppLogoProps) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-3", className)}>
      <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-foreground text-background">
        <span className="absolute -right-2 -top-3 h-7 w-7 rotate-12 bg-primary transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
        <Activity className="relative z-10 h-5 w-5" strokeWidth={2.4} />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[17px] font-black uppercase tracking-[-0.04em]">HabitFlow</span>
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Performance system
          </span>
        </span>
      )}
    </Link>
  );
}
