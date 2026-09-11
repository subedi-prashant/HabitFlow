"use client";

import { useEffect, useState } from "react";
import { Check, Layers3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateRoutine, useUpdateRoutine } from "@/hooks/useRoutines";
import { Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ROUTINE_TYPES = ["morning", "evening", "fitness", "custom"] as const;
type RoutineType = (typeof ROUTINE_TYPES)[number];

interface RoutineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine: Tables<"routines"> | null;
  habits: Tables<"habits">[];
}

export function RoutineDialog({ open, onOpenChange, routine, habits }: RoutineDialogProps) {
  const createRoutine = useCreateRoutine();
  const updateRoutine = useUpdateRoutine();
  const [name, setName] = useState("");
  const [type, setType] = useState<RoutineType>("custom");
  const [habitIds, setHabitIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setName(routine?.name || "");
    setType(routine?.type || "custom");
    setHabitIds(routine?.habit_ids || []);
    setIsActive(routine?.is_active || false);
  }, [open, routine]);

  const closeDialog = () => {
    onOpenChange(false);
  };

  const toggleHabit = (habitId: string) => {
    setHabitIds((current) => current.includes(habitId)
      ? current.filter((id) => id !== habitId)
      : [...current, habitId]);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Give this routine a name.");
      return;
    }
    if (!habitIds.length) {
      toast.error("Add at least one habit to the routine.");
      return;
    }

    const values = {
      name: name.trim(),
      type,
      habit_ids: habitIds,
      is_active: isActive,
    };

    if (routine) {
      updateRoutine.mutate({ id: routine.id, ...values }, { onSuccess: closeDialog });
      return;
    }

    createRoutine.mutate(values, { onSuccess: closeDialog });
  };

  const isPending = createRoutine.isPending || updateRoutine.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 sm:w-full">
        <DialogHeader className="border-b border-border px-5 py-5 text-left sm:px-7">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Layers3 className="h-5 w-5" />
          </div>
          <DialogTitle className="text-2xl font-extrabold tracking-[-0.04em]">{routine ? "Edit routine" : "Build a routine"}</DialogTitle>
          <DialogDescription>Bundle related habits into one repeatable sequence.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
            <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
              <div className="space-y-2">
                <Label htmlFor="routineName">Routine name</Label>
                <Input id="routineName" value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-xl" placeholder="Morning reset" autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(value) => setType(value as RoutineType)}>
                  <SelectTrigger className="h-11 rounded-xl capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROUTINE_TYPES.map((routineType) => <SelectItem key={routineType} value={routineType} className="capitalize">{routineType}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Habits</Label>
                <span className="text-xs font-semibold text-muted-foreground">{habitIds.length} selected</span>
              </div>
              {habits.length ? (
                <div className="space-y-2">
                  {habits.map((habit, index) => {
                    const selected = habitIds.includes(habit.id);
                    return (
                      <button
                        key={habit.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                          selected ? "border-foreground bg-secondary" : "border-border bg-background hover:border-foreground/40"
                        )}
                        onClick={() => toggleHabit(habit.id)}
                        aria-pressed={selected}
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-card text-lg" aria-hidden="true">{habit.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{habit.name}</span>
                          <span className="block text-xs text-muted-foreground">Step {index + 1} · {habit.target_value} {habit.unit}</span>
                        </span>
                        <span className={cn("grid h-6 w-6 place-items-center rounded-lg border", selected ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                          {selected && <Check className="h-4 w-4" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">Create a habit before building a routine.</div>
              )}
            </div>

            <div className="flex items-center justify-between gap-5 rounded-xl border border-border bg-background p-4">
              <div>
                <Label htmlFor="activeRoutine">Pin as active</Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Active routines are highlighted for faster access.</p>
              </div>
              <Switch id="activeRoutine" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-card px-5 py-4 sm:px-7">
            <Button type="button" variant="outline" className="rounded-xl" onClick={closeDialog}>Cancel</Button>
            <Button type="submit" className="gap-2 rounded-xl font-bold" disabled={isPending || !habits.length}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {routine ? "Save changes" : "Create routine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
