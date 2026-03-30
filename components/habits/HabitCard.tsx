"use client";

import { useState } from "react";
import { Check, Flame, MoreVertical, Pencil, Trash2, Minus, Plus } from "lucide-react";
import { Tables } from "@/lib/supabase/database.types";
import { useLogHabit, useUnlogHabit } from "@/hooks/useHabitLogs";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface HabitCardProps {
  habit: Tables<"habits">;
  todayLog?: Tables<"habit_logs"> | null;
  streak?: Tables<"streaks"> | null;
  onEdit?: (habit: Tables<"habits">) => void;
  onDelete?: (id: string) => void;
}

export function HabitCard({ habit, todayLog, streak, onEdit, onDelete }: HabitCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const logHabit = useLogHabit();
  const unlogHabit = useUnlogHabit();

  const isCompleted = todayLog ? todayLog.value >= habit.target_value : false;
  const currentValue = todayLog?.value || 0;
  const isSimple = habit.target_value === 1;

  const handleToggle = () => {
    if (isCompleted) {
      unlogHabit.mutate({ habitId: habit.id });
    } else {
      logHabit.mutate({ habitId: habit.id, value: habit.target_value });
    }
  };

  const handleIncrement = () => {
    const newValue = Math.min(currentValue + 1, habit.target_value);
    logHabit.mutate({ habitId: habit.id, value: newValue });
  };

  const handleDecrement = () => {
    const newValue = currentValue - 1;
    if (newValue <= 0) {
      unlogHabit.mutate({ habitId: habit.id });
    } else {
      logHabit.mutate({ habitId: habit.id, value: newValue });
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className={cn(
            "group relative overflow-hidden transition-all hover:shadow-md",
            isCompleted && "ring-2 ring-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20"
          )}
        >
          <div
            className="absolute top-0 left-0 w-1 h-full rounded-l-lg"
            style={{ backgroundColor: habit.color }}
          />
          <CardContent className="p-4 pl-5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{habit.icon}</span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={cn(
                    "font-medium truncate",
                    isCompleted && "line-through text-muted-foreground"
                  )}>
                    {habit.name}
                  </h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {habit.category}
                  </Badge>
                </div>

                {!isSimple && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden max-w-[120px]">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${Math.min((currentValue / habit.target_value) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {currentValue}/{habit.target_value} {habit.unit}
                    </span>
                  </div>
                )}

                {streak && streak.current_streak > 0 && (
                  <p className="text-xs text-orange-500 mt-0.5 flex items-center gap-1">
                    <Flame className="h-3 w-3" />
                    {streak.current_streak} day streak
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                {isSimple ? (
                  <Button
                    size="icon"
                    variant={isCompleted ? "default" : "outline"}
                    className={cn(
                      "h-9 w-9 rounded-full transition-all",
                      isCompleted && "bg-emerald-500 hover:bg-emerald-600 border-emerald-500"
                    )}
                    onClick={handleToggle}
                    disabled={logHabit.isPending || unlogHabit.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 rounded-full"
                      onClick={handleDecrement}
                      disabled={currentValue <= 0 || logHabit.isPending}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className={cn(
                        "h-7 w-7 rounded-full",
                        isCompleted && "bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white"
                      )}
                      onClick={handleIncrement}
                      disabled={isCompleted || logHabit.isPending}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <div className="relative">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setShowActions(!showActions)}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  {showActions && (
                    <div className="absolute right-0 top-full mt-1 z-10 bg-popover border rounded-md shadow-lg py-1 min-w-[120px]">
                      <button
                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
                        onClick={() => {
                          onEdit?.(habit);
                          setShowActions(false);
                        }}
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2 text-destructive"
                        onClick={() => {
                          setShowDeleteDialog(true);
                          setShowActions(false);
                        }}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Habit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{habit.name}&quot;? This will also delete all logs and streak data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete?.(habit.id);
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
