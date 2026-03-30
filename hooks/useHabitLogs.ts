import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Tables, InsertTables } from "@/lib/supabase/database.types";
import { format, subDays, startOfDay } from "date-fns";
import { toast } from "sonner";

const supabase = createClient();

export function useTodayLogs() {
  const today = format(new Date(), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["habit-logs", "today", today],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("logged_at", today);

      if (error) throw error;
      return data as Tables<"habit_logs">[];
    },
  });
}

export function useWeeklyLogs() {
  const today = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["habit-logs", "weekly", weekAgo, today],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", weekAgo)
        .lte("logged_at", today);

      if (error) throw error;
      return data as Tables<"habit_logs">[];
    },
  });
}

export function useMonthlyLogs() {
  const today = format(new Date(), "yyyy-MM-dd");
  const monthAgo = format(subDays(new Date(), 29), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["habit-logs", "monthly", monthAgo, today],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", monthAgo)
        .lte("logged_at", today);

      if (error) throw error;
      return data as Tables<"habit_logs">[];
    },
  });
}

export function useLogHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      habitId,
      value,
      note,
      date,
    }: {
      habitId: string;
      value: number;
      note?: string;
      date?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const logDate = date || format(new Date(), "yyyy-MM-dd");

      // Delete existing log for this habit+date, then insert new one
      await supabase
        .from("habit_logs")
        .delete()
        .eq("habit_id", habitId)
        .eq("user_id", user.id)
        .eq("logged_at", logDate);

      const { data, error } = await supabase
        .from("habit_logs")
        .insert({
          habit_id: habitId,
          user_id: user.id,
          logged_at: logDate,
          value,
          note: note || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      toast.success("Habit logged!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to log habit: ${error.message}`);
    },
  });
}

export function useUnlogHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ habitId, date }: { habitId: string; date?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const logDate = date || format(new Date(), "yyyy-MM-dd");

      const { error } = await supabase
        .from("habit_logs")
        .delete()
        .eq("habit_id", habitId)
        .eq("user_id", user.id)
        .eq("logged_at", logDate);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove log: ${error.message}`);
    },
  });
}
