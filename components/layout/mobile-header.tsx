"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, Menu, Settings } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { MOBILE_NAVIGATION, SECONDARY_NAVIGATION } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function MobileHeader() {
  const pathname = usePathname();
  const navigation = [...MOBILE_NAVIGATION, SECONDARY_NAVIGATION[0]];
  const currentItem = navigation.find((item) => pathname.startsWith(item.href));

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <AppLogo compact />
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">HabitFlow</p>
            <p className="text-sm font-semibold">{currentItem?.label || "Performance"}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" aria-label="Open app menu">
                <Menu className="h-[18px] w-[18px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild className="gap-2">
                <Link href="/routines"><ListChecks className="h-4 w-4" />Routines</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="gap-2">
                <Link href="/settings"><Settings className="h-4 w-4" />Settings</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
