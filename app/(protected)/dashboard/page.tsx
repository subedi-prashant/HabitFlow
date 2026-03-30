"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Flame, Target, TrendingUp, CalendarDays } from "lucide-react";
import { useActiveHabits } from "@/hooks/useHabits";
import { useTodayLogs } from "@/hooks/useHabitLogs";
import { useStreaks } from "@/hooks/useStreaks";
import { useProfile } from "@/hooks/useProfile";
import { HabitCard } from "@/components/habits/HabitCard";
import { AddHabitModal } from "@/components/habits/AddHabitModal";
import { ProductivityRing } from "@/components/dashboard/ProductivityRing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tables } from "@/lib/supabase/database.types";
import { useDeleteHabit } from "@/hooks/useHabits";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [editHabit, setEditHabit] = useState<Tables<"habits"> | null>(null);

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: habits, isLoading: habitsLoading } = useActiveHabits();
  const { data: todayLogs, isLoading: logsLoading } = useTodayLogs();
  const { data: streaks, isLoading: streaksLoading } = useStreaks();
  const deleteHabit = useDeleteHabit();

  const isLoading = profileLoading || habitsLoading || logsLoading || streaksLoading;

  const todayLogsMap = new Map(
    todayLogs?.map((log) => [log.habit_id, log]) || []
  );
  const streaksMap = new Map(
    streaks?.map((s) => [s.habit_id, s]) || []
  );

  const totalActive = habits?.length || 0;
  const completedToday = habits?.filter((h) => {
    const log = todayLogsMap.get(h.id);
    return log && log.value >= h.target_value;
  }).length || 0;

  const productivityScore = totalActive > 0
    ? (completedToday / totalActive) * 100
    : 0;

  const topStreaks = streaks
    ?.filter((s) => s.current_streak > 0)
    .sort((a, b) => b.current_streak - a.current_streak)
    .slice(0, 3) || [];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {greeting()}, {profile?.full_name || "there"}!
          </h1>
          <p className="text-muted-foreground mt-1">
            <CalendarDays className="inline h-4 w-4 mr-1" />
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Button onClick={() => { setEditHabit(null); setShowAddHabit(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Quick Add Habit
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Productivity Score */}
        <Card className="md:row-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Productivity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-2">
            <ProductivityRing percentage={productivityScore} />
            <p className="text-sm text-muted-foreground mt-3">
              {completedToday} of {totalActive} habits completed
            </p>
          </CardContent>
        </Card>

        {/* Active Habits */}
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Habits</p>
              <p className="text-2xl font-bold">{totalActive}</p>
            </div>
          </CardContent>
        </Card>

        {/* Today's Progress */}
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed Today</p>
              <p className="text-2xl font-bold">{completedToday}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Streak Highlights */}
      {topStreaks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Streak Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {topStreaks.map((streak) => {
                const habit = habits?.find((h) => h.id === streak.habit_id);
                if (!habit) return null;
                return (
                  <div
                    key={streak.id}
                    className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 px-3 py-1.5 rounded-full text-sm"
                  >
                    <span>{habit.icon}</span>
                    <Flame className="h-3.5 w-3.5" />
                    <span className="font-semibold">{streak.current_streak} day streak</span>
                    <span className="text-orange-600/70 dark:text-orange-400/70">on {habit.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Habits */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Today&apos;s Habits</h2>
        {habits && habits.length > 0 ? (
          <div className="space-y-2">
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
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No habits yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start building better habits by creating your first one.
              </p>
              <Button onClick={() => { setEditHabit(null); setShowAddHabit(true); }} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Habit
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AddHabitModal
        open={showAddHabit}
        onOpenChange={(open) => {
          setShowAddHabit(open);
          if (!open) setEditHabit(null);
        }}
        editHabit={editHabit}
      />
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-48 md:row-span-2" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-40 mb-3" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}
