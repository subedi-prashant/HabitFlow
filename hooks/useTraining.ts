import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";
import {
  ActivityLogInput,
  WorkoutExerciseRecord,
  WorkoutSessionInput,
  WorkoutSessionRecord,
} from "@/lib/training";
import { toast } from "sonner";

const supabase = createClient();

export function useWorkoutSessions(fromDate?: string) {
  return useQuery({
    queryKey: ["training", "workouts", fromDate || "all"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      let sessionsQuery = supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("performed_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (fromDate) {
        sessionsQuery = sessionsQuery.gte("performed_on", fromDate);
      }

      const { data: sessions, error: sessionsError } = await sessionsQuery;
      if (sessionsError) {
        throw sessionsError;
      }

      if (!sessions.length) {
        return [] as WorkoutSessionRecord[];
      }

      const sessionIds = sessions.map((session) => session.id);
      const { data: exercises, error: exercisesError } = await supabase
        .from("workout_exercises")
        .select("*")
        .in("session_id", sessionIds)
        .order("position", { ascending: true });

      if (exercisesError) {
        throw exercisesError;
      }

      const exerciseIds = exercises.map((exercise) => exercise.id);
      let sets: Tables<"workout_sets">[] = [];

      if (exerciseIds.length) {
        const { data, error } = await supabase
          .from("workout_sets")
          .select("*")
          .in("exercise_id", exerciseIds)
          .order("set_number", { ascending: true });

        if (error) {
          throw error;
        }

        sets = data;
      }

      const exercisesBySession = new Map<string, WorkoutExerciseRecord[]>();
      exercises.forEach((exercise) => {
        const sessionExercises = exercisesBySession.get(exercise.session_id) || [];
        sessionExercises.push({
          ...exercise,
          sets: sets.filter((set) => set.exercise_id === exercise.id),
        });
        exercisesBySession.set(exercise.session_id, sessionExercises);
      });

      return sessions.map((session) => ({
        ...session,
        exercises: exercisesBySession.get(session.id) || [],
      })) as WorkoutSessionRecord[];
    },
  });
}

export function useCreateWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workout: WorkoutSessionInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          name: workout.name.trim(),
          performed_on: workout.performedOn,
          duration_minutes: workout.durationMinutes,
          notes: workout.notes,
        })
        .select()
        .single();

      if (sessionError) {
        throw sessionError;
      }

      try {
        for (let exerciseIndex = 0; exerciseIndex < workout.exercises.length; exerciseIndex += 1) {
          const exercise = workout.exercises[exerciseIndex];
          const { data: createdExercise, error: exerciseError } = await supabase
            .from("workout_exercises")
            .insert({
              session_id: session.id,
              user_id: user.id,
              name: exercise.name.trim(),
              muscle_group: exercise.muscleGroup,
              position: exerciseIndex,
            })
            .select()
            .single();

          if (exerciseError) {
            throw exerciseError;
          }

          const setRows = exercise.sets.map((set, setIndex) => ({
            exercise_id: createdExercise.id,
            user_id: user.id,
            set_number: setIndex + 1,
            reps: set.reps,
            weight_kg: set.weightKg,
            rpe: set.rpe,
            is_warmup: set.isWarmup,
          }));
          const { error: setsError } = await supabase.from("workout_sets").insert(setRows);

          if (setsError) {
            throw setsError;
          }
        }
      } catch (error) {
        await supabase.from("workout_sessions").delete().eq("id", session.id);
        throw error;
      }

      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training", "workouts"] });
      toast.success("Workout logged");
    },
    onError: (error: Error) => {
      toast.error(`Could not log workout: ${error.message}`);
    },
  });
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training", "workouts"] });
      toast.success("Workout removed");
    },
    onError: (error: Error) => {
      toast.error(`Could not remove workout: ${error.message}`);
    },
  });
}

export function useActivityLogs(fromDate?: string) {
  return useQuery({
    queryKey: ["training", "activities", fromDate || "all"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      let query = supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("performed_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (fromDate) {
        query = query.gte("performed_on", fromDate);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      return data as Tables<"activity_logs">[];
    },
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: ActivityLogInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          activity_type: activity.activityType,
          name: activity.name.trim(),
          performed_on: activity.performedOn,
          duration_minutes: activity.durationMinutes,
          distance_km: activity.distanceKm,
          calories: activity.calories,
          intensity: activity.intensity,
          notes: activity.notes,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training", "activities"] });
      toast.success("Activity logged");
    },
    onError: (error: Error) => {
      toast.error(`Could not log activity: ${error.message}`);
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activity_logs").delete().eq("id", id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training", "activities"] });
      toast.success("Activity removed");
    },
    onError: (error: Error) => {
      toast.error(`Could not remove activity: ${error.message}`);
    },
  });
}
