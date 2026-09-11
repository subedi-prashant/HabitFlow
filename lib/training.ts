import { Tables } from "@/lib/supabase/database.types";

export const MUSCLE_GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body", "Other"] as const;
export const ACTIVITY_TYPES = ["Walking", "Running", "Cycling", "Swimming", "Hiking", "Sport", "Yoga", "Mobility", "Other"] as const;
export const INTENSITY_LEVELS = ["Low", "Moderate", "High"] as const;
export const EXERCISE_SUGGESTIONS = [
  "Back Squat",
  "Bench Press",
  "Deadlift",
  "Overhead Press",
  "Barbell Row",
  "Pull-up",
  "Lat Pulldown",
  "Romanian Deadlift",
  "Leg Press",
  "Lunge",
  "Hip Thrust",
  "Bicep Curl",
  "Tricep Extension",
  "Lateral Raise",
  "Plank",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type IntensityLevel = (typeof INTENSITY_LEVELS)[number];
export type WorkoutSetRecord = Tables<"workout_sets">;
export type WorkoutExerciseRecord = Tables<"workout_exercises"> & { sets: WorkoutSetRecord[] };
export type WorkoutSessionRecord = Tables<"workout_sessions"> & { exercises: WorkoutExerciseRecord[] };

export interface WorkoutSetInput {
  reps: number;
  weightKg: number;
  rpe: number | null;
  isWarmup: boolean;
}

export interface WorkoutExerciseInput {
  name: string;
  muscleGroup: MuscleGroup;
  sets: WorkoutSetInput[];
}

export interface WorkoutSessionInput {
  name: string;
  performedOn: string;
  durationMinutes: number | null;
  notes: string | null;
  exercises: WorkoutExerciseInput[];
}

export interface ActivityLogInput {
  activityType: ActivityType;
  name: string;
  performedOn: string;
  durationMinutes: number;
  distanceKm: number | null;
  calories: number | null;
  intensity: IntensityLevel;
  notes: string | null;
}

export function calculateWorkoutVolume(workout: WorkoutSessionRecord) {
  return workout.exercises.reduce(
    (workoutTotal, exercise) => workoutTotal + exercise.sets.reduce(
      (exerciseTotal, set) => exerciseTotal + (set.is_warmup ? 0 : set.reps * set.weight_kg),
      0
    ),
    0
  );
}

export function calculateWorkoutSets(workout: WorkoutSessionRecord) {
  return workout.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => !set.is_warmup).length,
    0
  );
}

export function formatVolume(volume: number) {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(volume >= 10000 ? 0 : 1)}k kg`;
  }

  return `${Math.round(volume)} kg`;
}
