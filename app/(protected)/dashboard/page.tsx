"use client";

import { useState } from "react";
import Link from "next/link";
import { eachDayOfInterval, endOfWeek, format, startOfWeek } from "date-fns";
import { ArrowRight, CalendarDays, Dumbbell, Flame, Footprints, Plus, Target } from "lucide-react";
import { motion } from "framer-motion";
import { AddHabitModal } from "@/components/habits/AddHabitModal";
import { HabitCard } from "@/components/habits/HabitCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTodayLogs, useWeeklyLogs } from "@/hooks/useHabitLogs";
import { useActiveHabits, useDeleteHabit } from "@/hooks/useHabits";
import { useProfile } from "@/hooks/useProfile";
import { useStreaks } from "@/hooks/useStreaks";
import { useActivityLogs, useWorkoutSessions } from "@/hooks/useTraining";
import { Tables } from "@/lib/supabase/database.types";
import { calculateWorkoutVolume, formatVolume } from "@/lib/training";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [editHabit, setEditHabit] = useState<Tables<"habits"> | null>(null);
  const weekStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStart = format(weekStartDate, "yyyy-MM-dd");

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: habits = [], isLoading: habitsLoading } = useActiveHabits();
  const { data: todayLogs = [], isLoading: logsLoading } = useTodayLogs();
  const { data: weeklyLogs = [], isLoading: weeklyLogsLoading } = useWeeklyLogs();
  const { data: streaks = [], isLoading: streaksLoading } = useStreaks();
  const { data: workouts = [], isLoading: workoutsLoading } = useWorkoutSessions(weekStart);
  const { data: activities = [], isLoading: activitiesLoading } = useActivityLogs(weekStart);
  const deleteHabit = useDeleteHabit();

  const isLoading = profileLoading || habitsLoading || logsLoading || weeklyLogsLoading || streaksLoading || workoutsLoading || activitiesLoading;
  const todayLogsMap = new Map(todayLogs.map((log) => [log.habit_id, log]));
  const streaksMap = new Map(streaks.map((streak) => [streak.habit_id, streak]));
  const completedToday = habits.filter((habit) => {
    const log = todayLogsMap.get(habit.id);
    return log && log.value >= habit.target_value;
  }).length;
  const completionPercentage = habits.length ? Math.round((completedToday / habits.length) * 100) : 0;
  const topStreak = streaks.reduce((best, streak) => Math.max(best, streak.current_streak), 0);
  const weeklyVolume = workouts.reduce((total, workout) => total + calculateWorkoutVolume(workout), 0);
  const activeMinutes = workouts.reduce((total, workout) => total + (workout.duration_minutes || 0), 0)
    + activities.reduce((total, activityLog) => total + activityLog.duration_minutes, 0);
  const weekDays = eachDayOfInterval({
    start: weekStartDate,
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Good morning";
    }
    if (hour < 18) {
      return "Good afternoon";
    }
    return "Good evening";
  };

  const handleEdit = (habit: Tables<"habits">) => {
    setEditHabit(habit);
    setShowAddHabit(true);
  };

  const handleDelete = (id: string) => {
    deleteHabit.mutate(id);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 lg:space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="editorial-kicker mb-3">{format(new Date(), "EEEE / MMMM d")}</p>
          <h1 className="editorial-title text-4xl sm:text-5xl lg:text-6xl">
            {greeting()}, {profile?.full_name?.split(" ")[0] || "there"}.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Today is less about doing everything and more about keeping the rhythm alive.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button asChild variant="outline" className="h-11 gap-2 rounded-xl bg-card">
            <Link href="/training">
              <Dumbbell className="h-4 w-4" />
              Log training
            </Link>
          </Button>
          <Button className="h-11 gap-2 rounded-xl font-bold" onClick={() => { setEditHabit(null); setShowAddHabit(true); }}>
            <Plus className="h-4 w-4" />
            Add habit
          </Button>
        </div>
      </header>

      {/* Stats Row */}
      <section className="grid gap-4 xl:grid-cols-[1.7fr_0.8fr]">
        {/* Productivity Score */}
        <article className="overflow-hidden rounded-[1.4rem] border border-foreground bg-foreground text-background shadow-[5px_5px_0_hsl(var(--primary))]">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end lg:p-10">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                <Target className="h-4 w-4" />
                Today&apos;s focus
              </div>
              <p className="mt-7 max-w-xl text-2xl font-bold leading-tight tracking-[-0.035em] sm:text-3xl">
                {habits.length
                  ? completedToday === habits.length
                    ? "Today is complete. Let the win stand."
                    : `${habits.length - completedToday} ${habits.length - completedToday === 1 ? "habit" : "habits"} between you and a fully checked day.`
                  : "Choose one action worth repeating and make it your first habit."}
              </p>
              <div className="mt-8 h-2 overflow-hidden rounded-full bg-background/15">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${completionPercentage}%` }} />
              </div>
            </div>
            <div className="flex items-end gap-3 lg:block lg:text-right">
              <span className="metric-number text-6xl text-primary sm:text-7xl">{completedToday}</span>
              <span className="mb-2 block text-sm font-semibold text-background/55 lg:mb-0 lg:mt-1">of {habits.length} complete</span>
            </div>
          </div>
        </article>

        {/* Active Habits */}
        <article className="rounded-[1.4rem] border border-foreground bg-primary p-6 text-primary-foreground sm:p-8">
          <div className="flex h-full min-h-52 flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-primary">
                <Flame className="h-5 w-5" />
              </span>
              <span className="editorial-kicker !text-primary-foreground/55">Best live streak</span>
            </div>
            <div className="mt-10">
              <p className="metric-number text-6xl">{topStreak}</p>
              <p className="mt-1 text-sm font-bold">{topStreak === 1 ? "day in motion" : "days in motion"}</p>
              <p className="mt-4 text-sm leading-6 text-primary-foreground/65">
                {topStreak ? "Protect the chain with one clear action today." : "Complete a habit to start your first streak."}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        {/* Today's Habits */}
        <article className="editorial-card overflow-hidden">
          <div className="flex items-end justify-between gap-4 border-b border-border p-5 sm:p-6">
            <div>
              <p className="editorial-kicker">Daily actions</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">Today&apos;s habits</h2>
            </div>
            <span className="text-sm font-bold text-muted-foreground">{completionPercentage}%</span>
          </div>
          {habits.length ? (
            <div className="space-y-2 p-3 sm:p-4">
              {habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  todayLog={todayLogsMap.get(habit.id) || null}
                  streak={streaksMap.get(habit.id) || null}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center p-8 text-center">
              <div className="max-w-sm">
                <Target className="mx-auto h-8 w-8 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-bold">Start with one repeatable action</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">A small habit gives the rest of the product something meaningful to measure.</p>
                <Button className="mt-5 gap-2 rounded-xl" onClick={() => { setEditHabit(null); setShowAddHabit(true); }}>
                  <Plus className="h-4 w-4" />
                  Create a habit
                </Button>
              </div>
            </div>
          )}
        </article>

        <div className="space-y-4">
          {/* Today's Progress */}
          <article className="editorial-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="editorial-kicker">Weekly rhythm</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight">Consistency map</h2>
              </div>
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-6 grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const date = format(day, "yyyy-MM-dd");
                const dayLogs = weeklyLogs.filter((log) => log.logged_at === date);
                const completed = dayLogs.filter((log) => {
                  const habit = habits.find((item) => item.id === log.habit_id);
                  return habit && log.value >= habit.target_value;
                }).length;
                const ratio = habits.length ? completed / habits.length : 0;
                const isToday = date === format(new Date(), "yyyy-MM-dd");
                const hasTraining = workouts.some((workout) => workout.performed_on === date)
                  || activities.some((activityLog) => activityLog.performed_on === date);

                return (
                  <div key={date} className="text-center">
                    <div className={cn("relative mx-auto flex h-16 max-w-10 items-end overflow-hidden rounded-lg bg-secondary", isToday && "ring-2 ring-foreground ring-offset-2 ring-offset-card")}>
                      <div className="w-full bg-primary transition-all" style={{ height: `${Math.max(ratio * 100, completed ? 16 : 0)}%` }} />
                      {hasTraining && <span className="absolute left-1/2 top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-foreground" />}
                    </div>
                    <p className="mt-2 text-[10px] font-bold uppercase text-muted-foreground">{format(day, "EEEEE")}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 text-xs leading-5 text-muted-foreground">Lime shows habit completion. A dark marker shows a logged workout or activity.</p>
          </article>

          {/* Streak Highlights */}
          <article className="editorial-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="editorial-kicker">Movement</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight">This week</h2>
              </div>
              <Footprints className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-secondary p-4">
                <p className="metric-number text-3xl">{activeMinutes}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">active minutes</p>
              </div>
              <div className="rounded-xl bg-secondary p-4">
                <p className="metric-number text-3xl">{formatVolume(weeklyVolume)}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">strength volume</p>
              </div>
            </div>
            <Button asChild variant="ghost" className="mt-4 w-full justify-between rounded-xl px-3">
              <Link href="/training">
                Open training log
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </article>
        </div>
      </section>

      <AddHabitModal
        open={showAddHabit}
        onOpenChange={(open) => {
          setShowAddHabit(open);
          if (!open) {
            setEditHabit(null);
          }
        }}
        editHabit={editHabit}
      />
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-14 w-full max-w-2xl" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.7fr_0.8fr]">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
