"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Bell, Check, LogOut, Monitor, Moon, ShieldAlert, Sun, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kathmandu",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function SettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [notifications, setNotifications] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setTimezone(profile.timezone || "UTC");
    }
  }, [profile]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifications(Notification.permission === "granted");
    }
  }, []);

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "HF";

  const handleSaveProfile = () => {
    updateProfile.mutate({ full_name: fullName.trim() || null, timezone });
  };

  const handleDeleteAccount = () => {
    toast.error("Account deletion is not self-service yet. Contact your administrator to remove the account and its data.");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const requestNotificationPermission = async (enabled: boolean) => {
    if (!enabled) {
      toast.info("Notification permission is managed in your browser settings.");
      setNotifications(Notification.permission === "granted");
      return;
    }
    if (!("Notification" in window)) {
      toast.error("This browser does not support notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotifications(permission === "granted");
    if (permission === "granted") {
      toast.success("Browser notifications enabled");
      return;
    }
    toast.error("Notification permission was not granted.");
  };

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 lg:space-y-8">
      <header>
        <p className="editorial-kicker mb-3">Settings / your environment</p>
        <h1 className="editorial-title text-4xl sm:text-5xl lg:text-6xl">Make HabitFlow yours.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Tune your profile, time zone, appearance, and browser permissions.
        </p>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          {/* Profile Section */}
          <article className="editorial-card overflow-hidden">
            <div className="flex items-center gap-4 border-b border-border bg-foreground p-5 text-background sm:p-6">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-black text-primary-foreground">{initials}</span>
              <div className="min-w-0">
                <p className="editorial-kicker !text-background/45">Athlete profile</p>
                <h2 className="mt-1 truncate text-2xl font-extrabold tracking-[-0.04em]">{fullName || "Your profile"}</h2>
              </div>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-11 rounded-xl bg-background pl-10" placeholder="Your name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="h-11 rounded-xl bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((timezoneOption) => <SelectItem key={timezoneOption} value={timezoneOption}>{timezoneOption.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">Used to keep daily check-ins and future reminders aligned with your local day.</p>
              </div>
              <Button className="rounded-xl font-bold" onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </article>

          {/* Appearance */}
          <article className="editorial-card p-5 sm:p-6">
            <p className="editorial-kicker">Appearance</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">Choose your surface</h2>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { value: "light", icon: Sun, label: "Light" },
                { value: "dark", icon: Moon, label: "Dark" },
                { value: "system", icon: Monitor, label: "System" },
              ].map(({ value, icon: Icon, label }) => {
                const selected = theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    className={cn("relative rounded-xl border p-4 text-left transition-colors", selected ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:border-foreground/40")}
                    onClick={() => setTheme(value)}
                    aria-pressed={selected}
                  >
                    <Icon className={cn("mb-6 h-5 w-5", selected && "text-primary")} />
                    <span className="block text-sm font-bold">{label}</span>
                    {selected && <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </article>
        </div>

        <div className="space-y-4">
          {/* Notifications */}
          <article className="editorial-card p-5 sm:p-6">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground"><Bell className="h-5 w-5" /></span>
            <p className="editorial-kicker mt-8">Browser permission</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">Habit reminders</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Allow HabitFlow to send browser notifications when reminder delivery is enabled.</p>
            <div className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-secondary/70 p-4">
              <div>
                <p className="text-sm font-bold">Browser notifications</p>
                <p className="mt-1 text-xs text-muted-foreground">{notifications ? "Permission granted" : "Permission not enabled"}</p>
              </div>
              <Switch checked={notifications} onCheckedChange={requestNotificationPermission} aria-label="Browser notifications" />
            </div>
          </article>

          {/* Danger Zone */}
          <article className="overflow-hidden rounded-[1.1rem] border border-destructive/35 bg-card">
            <div className="border-b border-destructive/25 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                <div>
                  <p className="editorial-kicker !text-destructive">Account access</p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">Session and data</h2>
                </div>
              </div>
            </div>
            <div className="divide-y divide-border">
              <div className="flex items-center justify-between gap-4 p-5 sm:p-6">
                <div>
                  <p className="text-sm font-bold">Sign out</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">End this browser session.</p>
                </div>
                <Button variant="outline" className="shrink-0 gap-2 rounded-xl" onClick={handleSignOut}><LogOut className="h-4 w-4" />Sign out</Button>
              </div>
              <div className="flex items-center justify-between gap-4 p-5 sm:p-6">
                <div>
                  <p className="text-sm font-bold text-destructive">Delete account</p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Permanent deletion currently requires administrator verification.</p>
                </div>
                <Button variant="ghost" className="shrink-0 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleDeleteAccount}>Learn how</Button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </motion.div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3"><Skeleton className="h-4 w-48" /><Skeleton className="h-14 w-full max-w-2xl" /></div>
      <div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-[32rem] rounded-2xl" /><Skeleton className="h-[32rem] rounded-2xl" /></div>
    </div>
  );
}
