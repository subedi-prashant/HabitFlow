"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Dumbbell, Loader2, Plus, Trash2, Zap } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useCreateWorkout } from "@/hooks/useTraining";
import { EXERCISE_SUGGESTIONS, MUSCLE_GROUPS, MuscleGroup } from "@/lib/training";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WorkoutLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DraftSet {
  key: string;
  reps: string;
  weightKg: string;
  rpe: string;
  isWarmup: boolean;
}

interface DraftExercise {
  key: string;
  name: string;
  muscleGroup: MuscleGroup;
  sets: DraftSet[];
}

let draftKey = 0;

function createKey() {
  draftKey += 1;
  return `training-draft-${draftKey}`;
}

function createSet(): DraftSet {
  return { key: createKey(), reps: "8", weightKg: "", rpe: "", isWarmup: false };
}

function createExercise(): DraftExercise {
  return {
    key: createKey(),
    name: "",
    muscleGroup: "Full Body",
    sets: [createSet(), createSet(), createSet()],
  };
}

export function WorkoutLogDialog({ open, onOpenChange }: WorkoutLogDialogProps) {
  const createWorkout = useCreateWorkout();
  const [name, setName] = useState("Strength session");
  const [performedOn, setPerformedOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<DraftExercise[]>(() => [createExercise()]);

  const resetForm = () => {
    setName("Strength session");
    setPerformedOn(format(new Date(), "yyyy-MM-dd"));
    setDurationMinutes("60");
    setNotes("");
    setExercises([createExercise()]);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const updateExercise = (exerciseKey: string, updates: Partial<DraftExercise>) => {
    setExercises((current) => current.map((exercise) => (
      exercise.key === exerciseKey ? { ...exercise, ...updates } : exercise
    )));
  };

  const updateSet = (exerciseKey: string, setKey: string, updates: Partial<DraftSet>) => {
    setExercises((current) => current.map((exercise) => (
      exercise.key === exerciseKey
        ? {
            ...exercise,
            sets: exercise.sets.map((set) => set.key === setKey ? { ...set, ...updates } : set),
          }
        : exercise
    )));
  };

  const removeSet = (exerciseKey: string, setKey: string) => {
    setExercises((current) => current.map((exercise) => (
      exercise.key === exerciseKey
        ? { ...exercise, sets: exercise.sets.filter((set) => set.key !== setKey) }
        : exercise
    )));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedDuration = durationMinutes ? Number(durationMinutes) : null;
    const invalidExercise = exercises.some((exercise) => !exercise.name.trim() || !exercise.sets.length);
    const invalidSet = exercises.some((exercise) => exercise.sets.some((set) => {
      const reps = Number(set.reps);
      const weight = set.weightKg ? Number(set.weightKg) : 0;
      const rpe = set.rpe ? Number(set.rpe) : null;
      return !Number.isInteger(reps) || reps < 1 || reps > 1000 || weight < 0 || (rpe !== null && (rpe < 1 || rpe > 10));
    }));

    if (!name.trim()) {
      toast.error("Give this workout a name.");
      return;
    }
    if (parsedDuration !== null && (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 1440)) {
      toast.error("Duration must be between 1 and 1,440 minutes.");
      return;
    }
    if (invalidExercise) {
      toast.error("Every exercise needs a name and at least one set.");
      return;
    }
    if (invalidSet) {
      toast.error("Check the reps, weight, and RPE values.");
      return;
    }

    createWorkout.mutate({
      name: name.trim(),
      performedOn,
      durationMinutes: parsedDuration,
      notes: notes.trim() || null,
      exercises: exercises.map((exercise) => ({
        name: exercise.name.trim(),
        muscleGroup: exercise.muscleGroup,
        sets: exercise.sets.map((set) => ({
          reps: Number(set.reps),
          weightKg: set.weightKg ? Number(set.weightKg) : 0,
          rpe: set.rpe ? Number(set.rpe) : null,
          isWarmup: set.isWarmup,
        })),
      })),
    }, {
      onSuccess: () => {
        resetForm();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 sm:w-full">
        <DialogHeader className="border-b border-border px-5 py-5 text-left sm:px-7">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-primary">
            <Dumbbell className="h-5 w-5" />
          </div>
          <DialogTitle className="text-2xl font-extrabold tracking-[-0.04em]">Log a workout</DialogTitle>
          <DialogDescription>Record the session, then capture each working set.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="workoutName">Session name</Label>
                <Input id="workoutName" value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-xl" placeholder="Upper body strength" autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workoutDate">Date</Label>
                <Input id="workoutDate" type="date" value={performedOn} onChange={(event) => setPerformedOn(event.target.value)} className="h-11 rounded-xl" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workoutDuration">Duration</Label>
                <div className="relative">
                  <Input id="workoutDuration" type="number" min={1} max={1440} value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} className="h-11 rounded-xl pr-16" />
                  <span className="pointer-events-none absolute right-3 top-3 text-xs font-semibold text-muted-foreground">MIN</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="editorial-kicker">Working sets</p>
                  <h3 className="mt-1 text-xl font-extrabold tracking-tight">Exercises</h3>
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => setExercises((current) => [...current, createExercise()])}>
                  <Plus className="h-4 w-4" />
                  Exercise
                </Button>
              </div>

              {exercises.map((exercise, exerciseIndex) => (
                <section key={exercise.key} className="rounded-2xl border border-border bg-background/65 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-foreground text-xs font-black text-primary">{exerciseIndex + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                      onClick={() => setExercises((current) => current.filter((item) => item.key !== exercise.key))}
                      disabled={exercises.length === 1}
                      aria-label={`Remove exercise ${exerciseIndex + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                    <div className="space-y-2">
                      <Label htmlFor={`exercise-${exercise.key}`}>Exercise</Label>
                      <Input
                        id={`exercise-${exercise.key}`}
                        list="exercise-suggestions"
                        value={exercise.name}
                        onChange={(event) => updateExercise(exercise.key, { name: event.target.value })}
                        className="h-11 rounded-xl"
                        placeholder="Bench press"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Muscle group</Label>
                      <Select value={exercise.muscleGroup} onValueChange={(value) => updateExercise(exercise.key, { muscleGroup: value as MuscleGroup })}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MUSCLE_GROUPS.map((group) => <SelectItem key={group} value={group}>{group}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {exercise.sets.map((set, setIndex) => (
                      <div key={set.key} className="rounded-xl border border-border bg-card p-3">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <span className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Set {setIndex + 1}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className={cn(
                                "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-bold uppercase tracking-wide transition-colors",
                                set.isWarmup ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                              )}
                              onClick={() => updateSet(exercise.key, set.key, { isWarmup: !set.isWarmup })}
                              aria-pressed={set.isWarmup}
                            >
                              <Zap className="h-3 w-3" />
                              Warm-up
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                              onClick={() => removeSet(exercise.key, set.key)}
                              disabled={exercise.sets.length === 1}
                              aria-label={`Remove set ${setIndex + 1}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1.5">
                            <Label htmlFor={`weight-${set.key}`} className="text-xs text-muted-foreground">Weight kg</Label>
                            <Input id={`weight-${set.key}`} type="number" min={0} step="0.25" value={set.weightKg} onChange={(event) => updateSet(exercise.key, set.key, { weightKg: event.target.value })} className="h-10 rounded-lg" placeholder="0" />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`reps-${set.key}`} className="text-xs text-muted-foreground">Reps</Label>
                            <Input id={`reps-${set.key}`} type="number" min={1} max={1000} value={set.reps} onChange={(event) => updateSet(exercise.key, set.key, { reps: event.target.value })} className="h-10 rounded-lg" />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`rpe-${set.key}`} className="text-xs text-muted-foreground">RPE</Label>
                            <Input id={`rpe-${set.key}`} type="number" min={1} max={10} step="0.5" value={set.rpe} onChange={(event) => updateSet(exercise.key, set.key, { rpe: event.target.value })} className="h-10 rounded-lg" placeholder="—" />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="ghost" size="sm" className="w-full gap-2 rounded-xl border border-dashed border-border" onClick={() => updateExercise(exercise.key, { sets: [...exercise.sets, createSet()] })}>
                      <Plus className="h-4 w-4" />
                      Add set
                    </Button>
                  </div>
                </section>
              ))}
              <datalist id="exercise-suggestions">
                {EXERCISE_SUGGESTIONS.map((exercise) => <option key={exercise} value={exercise} />)}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workoutLongNotes">Notes</Label>
              <Textarea id="workoutLongNotes" value={notes} onChange={(event) => setNotes(event.target.value)} className="rounded-xl" placeholder="Technique cues, wins, or what to change next time" maxLength={1000} />
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-card px-5 py-4 sm:px-7">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gap-2 rounded-xl font-bold" disabled={createWorkout.isPending}>
              {createWorkout.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save workout
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
