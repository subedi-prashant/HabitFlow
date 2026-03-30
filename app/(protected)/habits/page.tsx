"use client";

import { useState } from "react";
import { Plus, LayoutGrid, List, Target } from "lucide-react";
import { useHabits, useDeleteHabit } from "@/hooks/useHabits";
import { useTodayLogs } from "@/hooks/useHabitLogs";
import { useStreaks } from "@/hooks/useStreaks";
import { HabitCard } from "@/components/habits/HabitCard";
import { AddHabitModal } from "@/components/habits/AddHabitModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function HabitsPage() {
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [editHabit, setEditHabit] = useState<Tables<"habits"> | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: habits, isLoading: habitsLoading } = useHabits();
  const { data: todayLogs, isLoading: logsLoading } = useTodayLogs();
  const { data: streaks, isLoading: streaksLoading } = useStreaks();
  const deleteHabit = useDeleteHabit();

  const isLoading = habitsLoading || logsLoading || streaksLoading;

  const todayLogsMap = new Map(
    todayLogs?.map((log) => [log.habit_id, log]) || []
  );
  const streaksMap = new Map(
    streaks?.map((s) => [s.habit_id, s]) || []
  );

  const categories = ["all", "Health", "Fitness", "Learning", "Mindfulness", "Custom"];

  const filteredHabits = habits?.filter((h) =>
    filterCategory === "all" ? true : h.category === filterCategory
  ) || [];

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">My Habits</h1>
          <p className="text-muted-foreground mt-1">
            {habits?.length || 0} habits total &middot;{" "}
            {habits?.filter((h) => h.is_active).length || 0} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              size="icon"
              variant={viewMode === "list" ? "default" : "ghost"}
              className="h-8 w-8"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "grid" ? "default" : "ghost"}
              className="h-8 w-8"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => {
              setEditHabit(null);
              setShowAddHabit(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Habit
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={filterCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterCategory(cat)}
            className="capitalize"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Habits List/Grid */}
      {filteredHabits.length > 0 ? (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              : "space-y-2"
          )}
        >
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
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">
              {filterCategory === "all" ? "No habits yet" : `No ${filterCategory} habits`}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {filterCategory === "all"
                ? "Create your first habit to get started."
                : "Try a different category or create a new habit."}
            </p>
            <Button
              onClick={() => {
                setEditHabit(null);
                setShowAddHabit(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Habit
            </Button>
          </CardContent>
        </Card>
      )}

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

function HabitsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-20" />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}
