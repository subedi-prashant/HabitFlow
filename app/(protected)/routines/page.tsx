"use client";

import { useState } from "react";
import { Check, Dumbbell, Layers3, Moon, MoreHorizontal, Pause, Pencil, Play, Plus, SunMedium, Trash2, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { RoutineDialog } from "@/components/routines/RoutineDialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useTodayLogs } from "@/hooks/useHabitLogs";
import { useHabits } from "@/hooks/useHabits";
import { useDeleteRoutine, useRoutines, useUpdateRoutine } from "@/hooks/useRoutines";
import { Tables } from "@/lib/supabase/database.types";

const ROUTINE_ICONS: Record<Tables<"routines">["type"], LucideIcon> = {
  morning: SunMedium,
  evening: Moon,
  fitness: Dumbbell,
  custom: Layers3,
};

export default function RoutinesPage() {
  const [showRoutineDialog, setShowRoutineDialog] = useState(false);
  const [editRoutine, setEditRoutine] = useState<Tables<"routines"> | null>(null);
  const [deleteRoutine, setDeleteRoutine] = useState<Tables<"routines"> | null>(null);
  const { data: routines = [], isLoading: routinesLoading } = useRoutines();
  const { data: habits = [], isLoading: habitsLoading } = useHabits();
  const { data: todayLogs = [], isLoading: logsLoading } = useTodayLogs();
  const updateRoutine = useUpdateRoutine();
  const deleteRoutineMutation = useDeleteRoutine();

  if (routinesLoading || habitsLoading || logsLoading) {
    return <RoutinesSkeleton />;
  }

  const habitById = new Map(habits.map((habit) => [habit.id, habit]));
  const todayLogByHabit = new Map(todayLogs.map((log) => [log.habit_id, log]));
  const activeRoutines = routines.filter((routine) => routine.is_active).length;
  const habitsInRoutines = new Set(routines.flatMap((routine) => routine.habit_ids)).size;

  const openNewRoutine = () => {
    setEditRoutine(null);
    setShowRoutineDialog(true);
  };

  const openEditRoutine = (routine: Tables<"routines">) => {
    setEditRoutine(routine);
    setShowRoutineDialog(true);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 lg:space-y-8">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="editorial-kicker mb-3">Routines / linked actions</p>
          <h1 className="editorial-title text-4xl sm:text-5xl lg:text-6xl">Make the next step obvious.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Group habits into short sequences so starting one action naturally leads into the next.
          </p>
        </div>
        <Button className="h-11 gap-2 self-start rounded-xl px-4 font-bold xl:self-auto" onClick={openNewRoutine}>
          <Plus className="h-4 w-4" />
          New routine
        </Button>
      </header>

      <section className="grid grid-cols-3 overflow-hidden rounded-[1.4rem] border border-foreground bg-foreground text-background">
        <div className="p-4 sm:p-6">
          <Layers3 className="mb-6 h-5 w-5 text-primary" />
          <p className="metric-number text-3xl sm:text-5xl">{routines.length}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-background/50">Routines</p>
        </div>
        <div className="border-x border-background/15 p-4 sm:p-6">
          <Play className="mb-6 h-5 w-5 text-primary" />
          <p className="metric-number text-3xl sm:text-5xl">{activeRoutines}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-background/50">Active</p>
        </div>
        <div className="p-4 sm:p-6">
          <Dumbbell className="mb-6 h-5 w-5 text-primary" />
          <p className="metric-number text-3xl sm:text-5xl">{habitsInRoutines}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-background/50">Habits linked</p>
        </div>
      </section>

      {routines.length ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {routines.map((routine) => {
            const Icon = ROUTINE_ICONS[routine.type];
            const routineHabits = routine.habit_ids.map((id) => habitById.get(id)).filter(Boolean) as Tables<"habits">[];
            const completed = routineHabits.filter((habit) => {
              const log = todayLogByHabit.get(habit.id);
              return log && log.value >= habit.target_value;
            }).length;
            const progress = routineHabits.length ? Math.round((completed / routineHabits.length) * 100) : 0;

            return (
              <article key={routine.id} className="editorial-card overflow-hidden">
                <div className="flex items-start gap-4 border-b border-border p-5 sm:p-6">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${routine.is_active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-xl font-extrabold tracking-[-0.035em]">{routine.name}</h2>
                      {routine.is_active && <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-primary-foreground">Active</span>}
                    </div>
                    <p className="mt-1 text-xs font-semibold capitalize text-muted-foreground">{routine.type} · {routineHabits.length} {routineHabits.length === 1 ? "step" : "steps"}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground" aria-label={`Actions for ${routine.name}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2" onSelect={() => openEditRoutine(routine)}><Pencil className="h-4 w-4" />Edit routine</DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onSelect={() => updateRoutine.mutate({ id: routine.id, is_active: !routine.is_active })}>
                        {routine.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {routine.is_active ? "Unpin routine" : "Pin as active"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onSelect={() => setDeleteRoutine(routine)}><Trash2 className="h-4 w-4" />Delete routine</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="space-y-2">
                    {routineHabits.length ? routineHabits.map((habit, index) => {
                      const log = todayLogByHabit.get(habit.id);
                      const isComplete = !!log && log.value >= habit.target_value;
                      return (
                        <div key={habit.id} className="flex items-center gap-3 rounded-xl bg-secondary/65 p-3">
                          <span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-black ${isComplete ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>{isComplete ? <Check className="h-4 w-4" /> : index + 1}</span>
                          <span className="text-base" aria-hidden="true">{habit.icon}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{habit.name}</span>
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{habit.target_value} {habit.unit}</span>
                        </div>
                      );
                    }) : (
                      <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">The habits in this routine no longer exist. Edit it to add new steps.</div>
                    )}
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
                    <span className="text-xs font-black tabular-nums">{completed}/{routineHabits.length}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="editorial-card grid min-h-96 place-items-center p-8 text-center">
          <div className="max-w-md">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-secondary"><Layers3 className="h-7 w-7 text-muted-foreground" /></span>
            <p className="editorial-kicker mt-6">Your first sequence</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.045em]">Link actions that belong together.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">A morning reset, evening shutdown, or pre-workout sequence can reduce the friction of getting started.</p>
            <Button className="mt-6 gap-2 rounded-xl font-bold" onClick={openNewRoutine} disabled={!habits.length}><Plus className="h-4 w-4" />Build a routine</Button>
            {!habits.length && <p className="mt-3 text-xs text-muted-foreground">Create at least one habit first.</p>}
          </div>
        </section>
      )}

      <RoutineDialog open={showRoutineDialog} onOpenChange={(open) => { setShowRoutineDialog(open); if (!open) { setEditRoutine(null); } }} routine={editRoutine} habits={habits.filter((habit) => habit.is_active)} />

      <Dialog open={!!deleteRoutine} onOpenChange={(open) => !open && setDeleteRoutine(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete {deleteRoutine?.name}?</DialogTitle>
            <DialogDescription>The routine will be removed, but its habits and their history will stay intact.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteRoutine(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl" disabled={deleteRoutineMutation.isPending} onClick={() => deleteRoutine && deleteRoutineMutation.mutate(deleteRoutine.id, { onSuccess: () => setDeleteRoutine(null) })}>Delete routine</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function RoutinesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3"><Skeleton className="h-4 w-48" /><Skeleton className="h-14 w-full max-w-2xl" /></div>
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>
    </div>
  );
}
