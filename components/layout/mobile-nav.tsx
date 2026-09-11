"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAVIGATION } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-foreground/15 bg-foreground p-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/25 lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {MOBILE_NAVIGATION.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-background/60 hover:bg-background/10 hover:text-background"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.6 : 2} />
              <span className="truncate">{item.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
