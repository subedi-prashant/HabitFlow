import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";

const supabase = createClient();

export function useStreaks() {
  return useQuery({
    queryKey: ["streaks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as Tables<"streaks">[];
    },
  });
}

export function useHabitStreak(habitId: string) {
  return useQuery({
    queryKey: ["streaks", habitId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", user.id)
        .eq("habit_id", habitId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as Tables<"streaks"> | null;
    },
    enabled: !!habitId,
  });
}
