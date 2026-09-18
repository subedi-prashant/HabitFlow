import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/supabase/database.types";
import {
  GetBsDate,
  GetKathmanduDateKey,
  KharchaCategory,
  KharchaStatus,
  ManualKharchaInput,
} from "@/lib/kharcha";
import { toast } from "sonner";

const supabase = createClient();
const KHARCHA_QUERY_KEY = ["kharcha"] as const;

export type KharchaTransaction = Tables<"kharcha_transactions">;
export type KharchaIngestionEvent = Tables<"kharcha_ingestion_events">;
export type KharchaSyncState = Tables<"kharcha_sync_state">;

export function useKharchaTransactions(fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: [...KHARCHA_QUERY_KEY, "transactions", fromDate || "all", toDate || "all"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      let query = supabase
        .from("kharcha_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(500);

      if (fromDate) {
        query = query.gte("occurred_on", fromDate);
      }
      if (toDate) {
        query = query.lte("occurred_on", toDate);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return data as KharchaTransaction[];
    },
  });
}

export function useKharchaReviewEvents() {
  return useQuery({
    queryKey: [...KHARCHA_QUERY_KEY, "review"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase
        .from("kharcha_ingestion_events")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["needs_review", "failed"])
        .order("received_at", { ascending: false })
        .limit(25);

      if (error) {
        throw error;
      }
      return data as KharchaIngestionEvent[];
    },
  });
}

export function useKharchaSyncState() {
  return useQuery({
    queryKey: [...KHARCHA_QUERY_KEY, "sync"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase
        .from("kharcha_sync_state")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }
      return data as KharchaSyncState | null;
    },
    refetchInterval: 60 * 1000,
  });
}

export function useCreateManualKharcha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ManualKharchaInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      const occurredAt = new Date(input.occurredAt);
      const bsDate = GetBsDate(occurredAt);
      const { data, error } = await supabase
        .from("kharcha_transactions")
        .insert({
          user_id: user.id,
          amount: input.amount,
          currency: "NPR",
          source: "MANUAL",
          channel: input.channel,
          category: input.category,
          merchant: input.merchant,
          description: input.description,
          external_transaction_id: null,
          gmail_message_id: null,
          occurred_at: occurredAt.toISOString(),
          occurred_on: GetKathmanduDateKey(occurredAt),
          bs_year: bsDate.year,
          bs_month: bsDate.month,
          bs_day: bsDate.day,
          ingestion_method: "manual",
          status: "posted",
        })
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KHARCHA_QUERY_KEY });
      toast.success("Expense added");
    },
    onError: (error: Error) => {
      toast.error(`Could not add expense: ${error.message}`);
    },
  });
}

export function useUpdateManualKharcha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ManualKharchaInput }) => {
      const occurredAt = new Date(input.occurredAt);
      const bsDate = GetBsDate(occurredAt);
      const { data, error } = await supabase
        .from("kharcha_transactions")
        .update({
          amount: input.amount,
          channel: input.channel,
          category: input.category,
          merchant: input.merchant,
          description: input.description,
          occurred_at: occurredAt.toISOString(),
          occurred_on: GetKathmanduDateKey(occurredAt),
          bs_year: bsDate.year,
          bs_month: bsDate.month,
          bs_day: bsDate.day,
        })
        .eq("id", id)
        .eq("ingestion_method", "manual")
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KHARCHA_QUERY_KEY });
      toast.success("Expense updated");
    },
    onError: (error: Error) => {
      toast.error(`Could not update expense: ${error.message}`);
    },
  });
}

export function useUpdateKharchaDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      category,
      merchant,
      description,
      status,
    }: {
      id: string;
      category?: KharchaCategory;
      merchant?: string;
      description?: string;
      status?: KharchaStatus;
    }) => {
      const { data, error } = await supabase
        .from("kharcha_transactions")
        .update({ category, merchant, description, status })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KHARCHA_QUERY_KEY });
      toast.success("Expense updated");
    },
    onError: (error: Error) => {
      toast.error(`Could not update expense: ${error.message}`);
    },
  });
}

export function useDeleteManualKharcha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("kharcha_transactions")
        .delete()
        .eq("id", id)
        .eq("ingestion_method", "manual");

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KHARCHA_QUERY_KEY });
      toast.success("Expense deleted");
    },
    onError: (error: Error) => {
      toast.error(`Could not delete expense: ${error.message}`);
    },
  });
}
