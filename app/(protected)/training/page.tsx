"use client";

import { useMemo, useState } from "react";
import { format, parseISO, startOfWeek } from "date-fns";
import {
  Activity,
  Bike,
  ChevronDown,
  CircleDot,
  Clock3,
  Dumbbell,
  Footprints,
  Gauge,
  HeartPulse,
  Layers3,
  Mountain,
  Plus,
  Trash2,
  Trophy,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { ActivityLogDialog } from "@/components/training/ActivityLogDialog";
import { WorkoutLogDialog } from "@/components/training/WorkoutLogDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useActivityLogs,
  useDeleteActivity,
  useDeleteWorkout,
  useWorkoutSessions,
} from "@/hooks/useTraining";
import {
  ActivityType,
  calculateWorkoutSets,
  calculateWorkoutVolume,
  formatVolume,
  WorkoutSessionRecord,
} from "@/lib/training";
import { Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  Walking: Footprints,
  Running: Gauge,
  Cycling: Bike,
  Swimming: Waves,
  Hiking: Mountain,
  Sport: Trophy,
  Yoga: HeartPulse,
  Mobility: Activity,
  Other: CircleDot,
};

type EntryFilter = "all" | "workout" | "activity";
type PendingDelete = { id: string; kind: "workout" | "activity"; name: string };

export default function TrainingPage() {
  const [showWorkoutDialog, setShowWorkoutDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [entryFilter, setEntryFilter] = useState<EntryFilter>("all");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const { data: workouts = [], isLoading: workoutsLoading } = useWorkoutSessions();
  const { data: activities = [], isLoading: activitiesLoading } = useActivityLogs();
  const deleteWorkout = useDeleteWorkout();
  const deleteActivity = useDeleteActivity();

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weeklyWorkouts = workouts.filter((workout) => workout.performed_on >= weekStart);
  const weeklyActivities = activities.filter((activityLog) => activityLog.performed_on >= weekStart);
  const weeklyVolume = weeklyWorkouts.reduce((total, workout) => total + calculateWorkoutVolume(workout), 0);
  const activeMinutes = weeklyWorkouts.reduce((total, workout) => total + (workout.duration_minutes || 0), 0)
    + weeklyActivities.reduce((total, activityLog) => total + activityLog.duration_minutes, 0);
  const activeDays = new Set([
    ...weeklyWorkouts.map((workout) => workout.performed_on),
    ...weeklyActivities.map((activityLog) => activityLog.performed_on),
  ]).size;

  const entries = useMemo(() => {
    const workoutEntries = workouts.map((workout) => ({
      id: workout.id,
      kind: "workout" as const,
      performedOn: workout.performed_on,
      createdAt: workout.created_at,
      workout,
    }));
    const activityEntries = activities.map((activityLog) => ({
      id: activityLog.id,
      kind: "activity" as const,
      performedOn: activityLog.performed_on,
      createdAt: activityLog.created_at,
      activityLog,
    }));

    return [...workoutEntries, ...activityEntries]
      .filter((entry) => entryFilter === "all" || entry.kind === entryFilter)
      .sort((first, second) => `${second.performedOn}-${second.createdAt}`.localeCompare(`${first.performedOn}-${first.createdAt}`));
  }, [activities, entryFilter, workouts]);

  const handleDelete = () => {
    if (!pendingDelete) {
      return;
    }

    if (pendingDelete.kind === "workout") {
      deleteWorkout.mutate(pendingDelete.id, {
        onSuccess: () => setPendingDelete(null),
      });
      return;
    }

    deleteActivity.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
    });
  };

  if (workoutsLoading || activitiesLoading) {
    return <TrainingSkeleton />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 lg:space-y-8">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="editorial-kicker mb-3">Training log / week in motion</p>
          <h1 className="editorial-title max-w-3xl text-4xl sm:text-5xl lg:text-6xl">Put the work on record.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Track strength sessions and the movement that happens beyond the gym.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" className="h-11 gap-2 rounded-xl bg-card px-4" onClick={() => setShowActivityDialog(true)}>
            <Footprints className="h-4 w-4" />
            Activity
          </Button>
          <Button className="h-11 gap-2 rounded-xl px-4 font-bold" onClick={() => setShowWorkoutDialog(true)}>
            <Plus className="h-4 w-4" />
            Workout
          </Button>
        </div>
      </header>

      <section className="overflow-hidden rounded-[1.4rem] border border-foreground bg-foreground text-background shadow-[5px_5px_0_hsl(var(--primary))]">
        <div className="grid lg:grid-cols-[1fr_auto]">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <Dumbbell className="h-4 w-4" />
              This week
            </div>
            <p className="mt-8 max-w-2xl text-2xl font-bold leading-tight tracking-[-0.035em] sm:text-3xl">
              {weeklyWorkouts.length || weeklyActivities.length
                ? `${weeklyWorkouts.length} strength ${weeklyWorkouts.length === 1 ? "session" : "sessions"} and ${weeklyActivities.length} ${weeklyActivities.length === 1 ? "activity" : "activities"} logged.`
                : "Your week is an open page. Log the first session when you are ready."}
            </p>
          </div>
          <div className="border-t border-background/15 bg-primary p-6 text-primary-foreground lg:min-w-72 lg:border-l lg:border-t-0 lg:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Training volume</p>
            <p className="metric-number mt-3 text-5xl sm:text-6xl">{formatVolume(weeklyVolume).replace(" kg", "")}</p>
            <p className="mt-1 text-sm font-bold">kilograms moved</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={Clock3} label="Active minutes" value={activeMinutes.toLocaleString()} detail="Workout + activity time" />
        <MetricCard icon={Layers3} label="Strength sessions" value={weeklyWorkouts.length.toString()} detail={`${weeklyWorkouts.reduce((total, workout) => total + calculateWorkoutSets(workout), 0)} working sets`} />
        <MetricCard icon={Activity} label="Active days" value={`${activeDays}/7`} detail="Days with logged movement" />
      </section>

      <section className="editorial-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <p className="editorial-kicker">History</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">Recent training</h2>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
            {(["all", "workout", "activity"] as EntryFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-bold capitalize transition-colors",
                  entryFilter === filter ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setEntryFilter(filter)}
                aria-pressed={entryFilter === filter}
              >
                {filter === "workout" ? "Strength" : filter}
              </button>
            ))}
          </div>
        </div>

        {entries.length ? (
          <div className="divide-y divide-border">
            {entries.map((entry) => entry.kind === "workout" ? (
              <WorkoutEntry
                key={`workout-${entry.id}`}
                workout={entry.workout}
                onDelete={() => setPendingDelete({ id: entry.id, kind: "workout", name: entry.workout.name })}
              />
            ) : (
              <ActivityEntry
                key={`activity-${entry.id}`}
                activityLog={entry.activityLog}
                onDelete={() => setPendingDelete({ id: entry.id, kind: "activity", name: entry.activityLog.name })}
              />
            ))}
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary">
                <Dumbbell className="h-6 w-6 text-muted-foreground" />
              </span>
              <h3 className="mt-5 text-xl font-bold">Nothing logged here yet</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Start with a workout or add any activity that got you moving.</p>
              <div className="mt-5 flex justify-center gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setShowActivityDialog(true)}>Add activity</Button>
                <Button className="rounded-xl" onClick={() => setShowWorkoutDialog(true)}>Log workout</Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <WorkoutLogDialog open={showWorkoutDialog} onOpenChange={setShowWorkoutDialog} />
      <ActivityLogDialog open={showActivityDialog} onOpenChange={setShowActivityDialog} />

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Remove {pendingDelete?.name}?</DialogTitle>
            <DialogDescription>This entry will be permanently removed from your training history.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDelete} disabled={deleteWorkout.isPending || deleteActivity.isPending}>Remove entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <div className="editorial-card flex items-center gap-4 p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="metric-number text-3xl">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function WorkoutEntry({ workout, onDelete }: { workout: WorkoutSessionRecord; onDelete: () => void }) {
  const volume = calculateWorkoutVolume(workout);
  const setCount = calculateWorkoutSets(workout);

  return (
    <article className="grid grid-cols-[1fr_auto] gap-3 p-5 sm:p-6">
      <details className="group min-w-0">
        <summary className="flex cursor-pointer list-none items-start gap-4 [&::-webkit-details-marker]:hidden">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-foreground text-primary">
            <Dumbbell className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="truncate text-base font-bold sm:text-lg">{workout.name}</h3>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{format(parseISO(workout.performed_on), "EEE, MMM d")}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {workout.exercises.length} {workout.exercises.length === 1 ? "exercise" : "exercises"} · {setCount} working sets · {formatVolume(volume)}
              {workout.duration_minutes ? ` · ${workout.duration_minutes} min` : ""}
            </p>
          </div>
          <ChevronDown className="mt-2 hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 sm:block" />
        </summary>
        <div className="ml-0 mt-5 space-y-3 border-t border-border pt-4 sm:ml-[3.75rem]">
          {workout.exercises.map((exercise) => (
            <div key={exercise.id} className="rounded-xl bg-secondary/65 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{exercise.name}</p>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{exercise.muscle_group}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {exercise.sets.map((set) => (
                  <span key={set.id} className={cn("rounded-lg border px-2 py-1 text-xs font-semibold", set.is_warmup ? "border-primary/50 bg-primary/10" : "border-border bg-card")}>
                    {Number(set.weight_kg)} kg × {set.reps}{set.rpe ? ` · RPE ${Number(set.rpe)}` : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {workout.notes && <p className="text-sm leading-6 text-muted-foreground">{workout.notes}</p>}
        </div>
      </details>
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive" onClick={onDelete} aria-label={`Remove ${workout.name}`}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </article>
  );
}

function ActivityEntry({ activityLog, onDelete }: { activityLog: Tables<"activity_logs">; onDelete: () => void }) {
  const Icon = ACTIVITY_ICONS[activityLog.activity_type];

  return (
    <article className="flex items-start gap-4 p-5 sm:p-6">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="truncate text-base font-bold sm:text-lg">{activityLog.name}</h3>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{format(parseISO(activityLog.performed_on), "EEE, MMM d")}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {activityLog.activity_type} · {activityLog.duration_minutes} min
          {activityLog.distance_km !== null ? ` · ${Number(activityLog.distance_km)} km` : ""}
          {activityLog.calories !== null ? ` · ${activityLog.calories} kcal` : ""}
          {` · ${activityLog.intensity} intensity`}
        </p>
        {activityLog.notes && <p className="mt-3 text-sm leading-6 text-muted-foreground">{activityLog.notes}</p>}
      </div>
      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-destructive" onClick={onDelete} aria-label={`Remove ${activityLog.name}`}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </article>
  );
}

function TrainingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-14 w-full max-w-xl" />
        <Skeleton className="h-5 w-full max-w-lg" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
