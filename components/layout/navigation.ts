import {
  BarChart3,
  CalendarCheck2,
  Dumbbell,
  ListChecks,
  Settings,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const PRIMARY_NAVIGATION: NavigationItem[] = [
  { href: "/dashboard", label: "Today", shortLabel: "Today", icon: CalendarCheck2 },
  { href: "/habits", label: "Habits", shortLabel: "Habits", icon: Target },
  { href: "/training", label: "Training", shortLabel: "Train", icon: Dumbbell },
  { href: "/analytics", label: "Insights", shortLabel: "Insights", icon: BarChart3 },
  { href: "/kharcha", label: "Kharcha", shortLabel: "Kharcha", icon: Wallet },
];

export const SECONDARY_NAVIGATION: NavigationItem[] = [
  { href: "/routines", label: "Routines", shortLabel: "Routines", icon: ListChecks },
  { href: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];

export const MOBILE_NAVIGATION = PRIMARY_NAVIGATION;
