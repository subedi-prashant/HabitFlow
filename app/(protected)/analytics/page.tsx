"use client";

import { eachDayOfInterval, format, parseISO, subDays } from "date-fns";
import { Activity, BarChart3, Dumbbell, Flame, Footprints } from "lucide-react";
import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonthlyLogs } from "@/hooks/useHabitLogs";
import { useHabits } from "@/hooks/useHabits";
import { useStreaks } from "@/hooks/useStreaks";
import { useActivityLogs, useWorkoutSessions } from "@/hooks/useTraining";
import { calculateWorkoutVolume, formatVolume } from "@/lib/training";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const rangeStartDate = subDays(new Date(), 29);
  const rangeStart = format(rangeStartDate, "yyyy-MM-dd");
  const { data: habits = [], isLoading: habitsLoading } = useHabits();
  const { data: logs = [], isLoading: logsLoading } = useMonthlyLogs();
  const { data: streaks = [], isLoading: streaksLoading } = useStreaks();
  const { data: workouts = [], isLoading: workoutsLoading } = useWorkoutSessions(rangeStart);
  const { data: activities = [], isLoading: activitiesLoading } = useActivityLogs(rangeStart);

  if (habitsLoading || logsLoading || streaksLoading || workoutsLoading || activitiesLoading) {
    return <AnalyticsSkeleton />;
  }

  const habitById = new Map(habits.map((habit) => [habit.id, habit]));
  const completedLogs = logs.filter((log) => {
    const habit = habitById.get(log.habit_id);
    return habit && log.value >= habit.target_value;
  });
  const dateRange = eachDayOfInterval({ start: rangeStartDate, end: new Date() });
  const chartData = dateRange.map((date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const habitCount = completedLogs.filter((log) => log.logged_at === dateKey).length;
    const workoutMinutes = workouts
      .filter((workout) => workout.performed_on === dateKey)
      .reduce((total, workout) => total + (workout.duration_minutes || 0), 0);
    const activityMinutes = activities
      .filter((activityLog) => activityLog.performed_on === dateKey)
      .reduce((total, activityLog) => total + activityLog.duration_minutes, 0);

    return {
      date: dateKey,
      label: format(date, "MMM d"),
      habits: habitCount,
      minutes: workoutMinutes + activityMinutes,
    };
  });
  const activeDates = new Set([
    ...completedLogs.map((log) => log.logged_at),
    ...workouts.map((workout) => workout.performed_on),
    ...activities.map((activityLog) => activityLog.performed_on),
  ]);
  const consistency = Math.round((activeDates.size / dateRange.length) * 100);
  const totalVolume = workouts.reduce((total, workout) => total + calculateWorkoutVolume(workout), 0);
  const totalMinutes = workouts.reduce((total, workout) => total + (workout.duration_minutes || 0), 0)
    + activities.reduce((total, activityLog) => total + activityLog.duration_minutes, 0);
  const categoryData = ["Health", "Fitness", "Learning", "Mindfulness", "Custom"].map((category) => ({
    category,
    count: completedLogs.filter((log) => habitById.get(log.habit_id)?.category === category).length,
  })).filter((item) => item.count > 0);
  const maxCategoryCount = Math.max(...categoryData.map((item) => item.count), 1);
  const topStreaks = [...streaks]
    .sort((first, second) => second.longest_streak - first.longest_streak)
    .slice(0, 4);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 lg:space-y-8">
      <header>
        <p className="editorial-kicker mb-3">Insights / last 30 days</p>
        <h1 className="editorial-title max-w-4xl text-4xl sm:text-5xl lg:text-6xl">Patterns beat perfect days.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          See where repetition is becoming automatic and where your training rhythm needs attention.
        </p>
      </header>

      <section className="overflow-hidden rounded-[1.4rem] border border-foreground bg-foreground text-background shadow-[5px_5px_0_hsl(var(--primary))]">
        <div className="grid lg:grid-cols-[1fr_auto]">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <Activity className="h-4 w-4" />
              Consistency signal
            </div>
            <p className="mt-8 max-w-2xl text-2xl font-bold leading-tight tracking-[-0.035em] sm:text-3xl">
              You recorded meaningful action on {activeDates.size} of the last {dateRange.length} days.
            </p>
          </div>
          <div className="border-t border-background/15 bg-primary p-6 text-primary-foreground lg:min-w-72 lg:border-l lg:border-t-0 lg:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Active-day rate</p>
            <p className="metric-number mt-3 text-6xl">{consistency}%</p>
            <p className="mt-1 text-sm font-bold">across all tracking</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon={BarChart3} label="Habit check-ins" value={completedLogs.length.toString()} detail="Targets completed" />
        <Metric icon={Dumbbell} label="Strength volume" value={formatVolume(totalVolume)} detail={`${workouts.length} sessions`} />
        <Metric icon={Footprints} label="Active minutes" value={totalMinutes.toLocaleString()} detail={`${activities.length} activities`} />
        <Metric icon={Flame} label="Longest streak" value={`${topStreaks[0]?.longest_streak || 0}d`} detail="Best personal chain" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.75fr]">
        <article className="editorial-card overflow-hidden">
          <div className="border-b border-border p-5 sm:p-6">
            <p className="editorial-kicker">Daily output</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">Check-ins and active minutes</h2>
          </div>
          <div className="h-80 p-4 sm:p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={4} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--secondary))" }}
                  contentStyle={{ border: "1px solid hsl(var(--border))", borderRadius: "12px", background: "hsl(var(--card))", color: "hsl(var(--foreground))", fontSize: "12px" }}
                />
                <Bar dataKey="minutes" name="Active minutes" fill="hsl(var(--foreground))" radius={[5, 5, 0, 0]} />
                <Bar dataKey="habits" name="Habit check-ins" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="editorial-card overflow-hidden">
          <div className="border-b border-border p-5 sm:p-6">
            <p className="editorial-kicker">Habit mix</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">Completed by category</h2>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            {categoryData.length ? categoryData.map((item) => (
              <div key={item.category}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold">{item.category}</span>
                  <span className="font-bold tabular-nums text-muted-foreground">{item.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(item.count / maxCategoryCount) * 100}%` }} />
                </div>
              </div>
            )) : (
              <div className="grid min-h-52 place-items-center text-center">
                <div>
                  <BarChart3 className="mx-auto h-7 w-7 text-muted-foreground" />
                  <p className="mt-3 text-sm font-bold">No completed check-ins yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Complete a habit to begin the breakdown.</p>
                </div>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.75fr]">
        <article className="editorial-card p-5 sm:p-6">
          <p className="editorial-kicker">30-day field</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">Activity map</h2>
          <div className="mt-6 grid grid-cols-10 gap-2 sm:grid-cols-[repeat(15,minmax(0,1fr))]">
            {chartData.map((day) => {
              const total = day.habits + (day.minutes ? 1 : 0);
              return (
                <div key={day.date} className="group relative">
                  <div className={cn(
                    "aspect-square rounded-md border border-border",
                    total === 0 && "bg-secondary/60",
                    total === 1 && "bg-primary/30",
                    total === 2 && "bg-primary/60",
                    total >= 3 && "bg-primary"
                  )} />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-[10px] font-semibold text-background group-hover:block">
                    {format(parseISO(day.date), "MMM d")} · {day.habits} habits · {day.minutes} min
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-xs leading-5 text-muted-foreground">Darker lime means more tracked actions on that day.</p>
        </article>

        <article className="editorial-card overflow-hidden">
          <div className="border-b border-border p-5 sm:p-6">
            <p className="editorial-kicker">Personal bests</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">Longest chains</h2>
          </div>
          {topStreaks.length ? (
            <div className="divide-y divide-border">
              {topStreaks.map((streak, index) => {
                const habit = habitById.get(streak.habit_id);
                return (
                  <div key={streak.id} className="flex items-center gap-4 p-4 sm:px-6">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-xs font-black">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{habit?.name || "Archived habit"}</p>
                      <p className="text-xs text-muted-foreground">Current {streak.current_streak} days</p>
                    </div>
                    <span className="metric-number text-2xl">{streak.longest_streak}d</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-52 place-items-center p-6 text-center text-sm text-muted-foreground">Streaks will appear after your first completion.</div>
          )}
        </article>
      </section>
    </motion.div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) {
  return (
    <article className="editorial-card p-4 sm:p-5">
      <Icon className="mb-7 h-5 w-5 text-muted-foreground" />
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="metric-number mt-1 truncate text-3xl sm:text-4xl">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-14 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-36 rounded-2xl" />)}</div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
