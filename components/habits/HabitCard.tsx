"use client";

import { useState } from "react";
import { Check, Flame, Minus, MoreHorizontal, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogHabit, useUnlogHabit } from "@/hooks/useHabitLogs";
import { useUpdateHabit } from "@/hooks/useHabits";
import { Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

interface HabitCardProps {
  habit: Tables<"habits">;
  todayLog?: Tables<"habit_logs"> | null;
  streak?: Tables<"streaks"> | null;
  onEdit?: (habit: Tables<"habits">) => void;
  onDelete?: (id: string) => void;
}

export function HabitCard({ habit, todayLog, streak, onEdit, onDelete }: HabitCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const logHabit = useLogHabit();
  const unlogHabit = useUnlogHabit();
  const updateHabit = useUpdateHabit();
  const currentValue = todayLog?.value || 0;
  const isCompleted = currentValue >= habit.target_value;
  const isSimple = habit.target_value === 1;
  const progress = Math.min((currentValue / habit.target_value) * 100, 100);
  const isPending = logHabit.isPending || unlogHabit.isPending || updateHabit.isPending;

  const handleToggle = () => {
    if (isCompleted) {
      unlogHabit.mutate({ habitId: habit.id });
      return;
    }
    logHabit.mutate({ habitId: habit.id, value: habit.target_value });
  };

  const handleIncrement = () => {
    logHabit.mutate({ habitId: habit.id, value: Math.min(currentValue + 1, habit.target_value) });
  };

  const handleDecrement = () => {
    const nextValue = currentValue - 1;
    if (nextValue <= 0) {
      unlogHabit.mutate({ habitId: habit.id });
      return;
    }
    logHabit.mutate({ habitId: habit.id, value: nextValue });
  };

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-card transition-colors",
          isCompleted && "border-primary/70 bg-primary/[0.07]",
          !habit.is_active && "opacity-65"
        )}
      >
        <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: habit.color }} />
        <div className="flex items-center gap-3 p-3 pl-4 sm:gap-4 sm:p-4 sm:pl-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl" style={{ backgroundColor: `${habit.color}18` }} aria-hidden="true">
            {habit.icon}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="truncate font-bold tracking-[-0.02em]">{habit.name}</h3>
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">{habit.category}</span>
              {isCompleted && habit.is_active && <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-primary-foreground">Done</span>}
              {!habit.is_active && <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">Paused</span>}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {habit.description && <span className="max-w-sm truncate">{habit.description}</span>}
              {streak && streak.current_streak > 0 && (
                <span className="flex items-center gap-1 font-semibold text-foreground/70">
                  <Flame className="h-3 w-3 text-primary" />
                  {streak.current_streak}d streak
                </span>
              )}
            </div>

            {!isSimple && (
              <div className="mt-3 flex max-w-sm items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="shrink-0 text-[11px] font-bold tabular-nums text-muted-foreground">{currentValue}/{habit.target_value} {habit.unit}</span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {isSimple ? (
              <Button
                size="icon"
                variant={isCompleted ? "default" : "outline"}
                className={cn("h-11 w-11 rounded-xl", !isCompleted && "bg-background")}
                onClick={handleToggle}
                disabled={isPending || !habit.is_active}
                aria-label={isCompleted ? `Mark ${habit.name} incomplete` : `Complete ${habit.name}`}
              >
                <Check className="h-5 w-5" strokeWidth={2.6} />
              </Button>
            ) : (
              <div className="flex items-center rounded-xl border border-border bg-background p-1">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={handleDecrement} disabled={currentValue <= 0 || isPending || !habit.is_active} aria-label={`Decrease ${habit.name}`}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-7 text-center text-xs font-black tabular-nums">{currentValue}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={handleIncrement} disabled={isCompleted || isPending || !habit.is_active} aria-label={`Increase ${habit.name}`}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-muted-foreground" aria-label={`Actions for ${habit.name}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2" onSelect={() => onEdit?.(habit)}>
                  <Pencil className="h-4 w-4" />
                  Edit habit
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={() => updateHabit.mutate({ id: habit.id, is_active: !habit.is_active })}>
                  {habit.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {habit.is_active ? "Pause habit" : "Resume habit"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onSelect={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4" />
                  Delete habit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.article>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete {habit.name}?</DialogTitle>
            <DialogDescription>This permanently removes the habit, its history, and its streak data.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={() => {
                onDelete?.(habit.id);
                setShowDeleteDialog(false);
              }}
            >
              Delete habit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
