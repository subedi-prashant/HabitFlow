"use client";

import { useState } from "react";
import { Flame, Layers3, Plus, Search, Target } from "lucide-react";
import { motion } from "framer-motion";
import { AddHabitModal } from "@/components/habits/AddHabitModal";
import { HabitCard } from "@/components/habits/HabitCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTodayLogs } from "@/hooks/useHabitLogs";
import { useDeleteHabit, useHabits } from "@/hooks/useHabits";
import { useStreaks } from "@/hooks/useStreaks";
import { Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const CATEGORIES = ["all", "Health", "Fitness", "Learning", "Mindfulness", "Custom"] as const;
type StatusFilter = "all" | "active" | "paused";

export default function HabitsPage() {
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [editHabit, setEditHabit] = useState<Tables<"habits"> | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<(typeof CATEGORIES)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { data: habits = [], isLoading: habitsLoading } = useHabits();
  const { data: todayLogs = [], isLoading: logsLoading } = useTodayLogs();
  const { data: streaks = [], isLoading: streaksLoading } = useStreaks();
  const deleteHabit = useDeleteHabit();

  const isLoading = habitsLoading || logsLoading || streaksLoading;
  const todayLogsMap = new Map(todayLogs.map((log) => [log.habit_id, log]));
  const streaksMap = new Map(streaks.map((streak) => [streak.habit_id, streak]));
  const normalizedSearch = search.trim().toLowerCase();
  const filteredHabits = habits.filter((habit) => {
    const matchesCategory = filterCategory === "all" || habit.category === filterCategory;
    const matchesStatus = statusFilter === "all"
      || (statusFilter === "active" ? habit.is_active : !habit.is_active);
    const matchesSearch = !normalizedSearch
      || habit.name.toLowerCase().includes(normalizedSearch)
      || habit.description?.toLowerCase().includes(normalizedSearch);
    return matchesCategory && matchesStatus && matchesSearch;
  });
  const activeCount = habits.filter((habit) => habit.is_active).length;
  const bestStreak = streaks.reduce((best, streak) => Math.max(best, streak.longest_streak), 0);

  const handleEdit = (habit: Tables<"habits">) => {
    setEditHabit(habit);
    setShowAddHabit(true);
  };

  const handleDelete = (id: string) => {
    deleteHabit.mutate(id);
  };

  if (isLoading) {
    return <HabitsPageSkeleton />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 lg:space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="editorial-kicker mb-3">Habit library / repeatable actions</p>
          <h1 className="editorial-title text-4xl sm:text-5xl lg:text-6xl">Design your default day.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Keep the list intentional. Every habit should be clear enough to act on without negotiation.
          </p>
        </div>
        <Button className="h-11 gap-2 self-start rounded-xl px-4 font-bold xl:self-auto" onClick={() => { setEditHabit(null); setShowAddHabit(true); }}>
          <Plus className="h-4 w-4" />
          New habit
        </Button>
      </header>

      <section className="grid grid-cols-3 overflow-hidden rounded-[1.4rem] border border-foreground bg-foreground text-background">
        <div className="p-4 sm:p-6">
          <Target className="mb-6 h-5 w-5 text-primary" />
          <p className="metric-number text-3xl sm:text-5xl">{activeCount}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-background/50">Active</p>
        </div>
        <div className="border-x border-background/15 p-4 sm:p-6">
          <Layers3 className="mb-6 h-5 w-5 text-primary" />
          <p className="metric-number text-3xl sm:text-5xl">{habits.length}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-background/50">Total</p>
        </div>
        <div className="p-4 sm:p-6">
          <Flame className="mb-6 h-5 w-5 text-primary" />
          <p className="metric-number text-3xl sm:text-5xl">{bestStreak}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-background/50">Best streak</p>
        </div>
      </section>

      <section className="editorial-card overflow-hidden">
        {/* Category Filter */}
        <div className="space-y-4 border-b border-border p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 rounded-xl bg-background pl-10" placeholder="Search habits" aria-label="Search habits" />
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
              {(["all", "active", "paused"] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={cn("rounded-lg px-4 py-2 text-xs font-bold capitalize transition-colors", statusFilter === status ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setStatusFilter(status)}
                  aria-pressed={statusFilter === status}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold capitalize transition-colors",
                  filterCategory === category ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setFilterCategory(category)}
                aria-pressed={filterCategory === category}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Habits List/Grid */}
        {filteredHabits.length ? (
          <div className="space-y-2 p-3 sm:p-4">
            {filteredHabits.map((habit) => (
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
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary">
                <Target className="h-6 w-6 text-muted-foreground" />
              </span>
              <h3 className="mt-5 text-xl font-bold">No matching habits</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {habits.length ? "Change the search or filters to widen the list." : "Create one clear action you want to make easier to repeat."}
              </p>
              {!habits.length && <Button className="mt-5 gap-2 rounded-xl" onClick={() => setShowAddHabit(true)}><Plus className="h-4 w-4" />Create habit</Button>}
            </div>
          </div>
        )}
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

function HabitsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-14 w-full max-w-2xl" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
