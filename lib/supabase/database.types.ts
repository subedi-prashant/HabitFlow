export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users_profile: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          timezone: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          icon: string;
          color: string;
          category: "Health" | "Fitness" | "Learning" | "Mindfulness" | "Custom";
          frequency: "daily" | "weekly" | "custom";
          frequency_days: number[];
          target_value: number;
          unit: string;
          reminder_time: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          icon?: string;
          color?: string;
          category?: "Health" | "Fitness" | "Learning" | "Mindfulness" | "Custom";
          frequency?: "daily" | "weekly" | "custom";
          frequency_days?: number[];
          target_value?: number;
          unit?: string;
          reminder_time?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          icon?: string;
          color?: string;
          category?: "Health" | "Fitness" | "Learning" | "Mindfulness" | "Custom";
          frequency?: "daily" | "weekly" | "custom";
          frequency_days?: number[];
          target_value?: number;
          unit?: string;
          reminder_time?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      habit_logs: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          logged_at: string;
          value: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          logged_at?: string;
          value?: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          habit_id?: string;
          user_id?: string;
          logged_at?: string;
          value?: number;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      kharcha_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          currency: string;
          source: "NIMB" | "NIC_ASIA" | "ESEWA" | "MANUAL";
          channel: "merchant_payment" | "qr_payment" | "bank_transfer" | "wallet_top_up" | "card_payment" | "cash_withdrawal" | "fee" | "cash" | "other";
          category: "Food & Drink" | "Transport" | "Bills & Utilities" | "Shopping" | "Health" | "Education" | "Entertainment" | "Housing" | "Travel" | "Transfers" | "Cash Withdrawal" | "Fees" | "Other";
          merchant: string;
          description: string;
          external_transaction_id: string | null;
          gmail_message_id: string | null;
          occurred_at: string;
          occurred_on: string;
          bs_year: number;
          bs_month: number;
          bs_day: number;
          ingestion_method: "email" | "manual";
          status: "posted" | "reversed" | "excluded";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          currency?: string;
          source: "NIMB" | "NIC_ASIA" | "ESEWA" | "MANUAL";
          channel: "merchant_payment" | "qr_payment" | "bank_transfer" | "wallet_top_up" | "card_payment" | "cash_withdrawal" | "fee" | "cash" | "other";
          category?: "Food & Drink" | "Transport" | "Bills & Utilities" | "Shopping" | "Health" | "Education" | "Entertainment" | "Housing" | "Travel" | "Transfers" | "Cash Withdrawal" | "Fees" | "Other";
          merchant?: string;
          description?: string;
          external_transaction_id?: string | null;
          gmail_message_id?: string | null;
          occurred_at: string;
          occurred_on: string;
          bs_year: number;
          bs_month: number;
          bs_day: number;
          ingestion_method: "email" | "manual";
          status?: "posted" | "reversed" | "excluded";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          currency?: string;
          source?: "NIMB" | "NIC_ASIA" | "ESEWA" | "MANUAL";
          channel?: "merchant_payment" | "qr_payment" | "bank_transfer" | "wallet_top_up" | "card_payment" | "cash_withdrawal" | "fee" | "cash" | "other";
          category?: "Food & Drink" | "Transport" | "Bills & Utilities" | "Shopping" | "Health" | "Education" | "Entertainment" | "Housing" | "Travel" | "Transfers" | "Cash Withdrawal" | "Fees" | "Other";
          merchant?: string;
          description?: string;
          external_transaction_id?: string | null;
          gmail_message_id?: string | null;
          occurred_at?: string;
          occurred_on?: string;
          bs_year?: number;
          bs_month?: number;
          bs_day?: number;
          ingestion_method?: "email" | "manual";
          status?: "posted" | "reversed" | "excluded";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      kharcha_ingestion_events: {
        Row: {
          id: string;
          user_id: string;
          gmail_message_id: string;
          sender: string;
          subject: string;
          received_at: string;
          source: "NIMB" | "NIC_ASIA" | "ESEWA" | null;
          status: "processed" | "duplicate" | "needs_review" | "unsupported" | "failed";
          reason: string;
          transaction_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          gmail_message_id: string;
          sender: string;
          subject?: string;
          received_at: string;
          source?: "NIMB" | "NIC_ASIA" | "ESEWA" | null;
          status: "processed" | "duplicate" | "needs_review" | "unsupported" | "failed";
          reason?: string;
          transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          gmail_message_id?: string;
          sender?: string;
          subject?: string;
          received_at?: string;
          source?: "NIMB" | "NIC_ASIA" | "ESEWA" | null;
          status?: "processed" | "duplicate" | "needs_review" | "unsupported" | "failed";
          reason?: string;
          transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      kharcha_sync_state: {
        Row: {
          user_id: string;
          last_checked_at: string | null;
          last_success_at: string | null;
          last_message_at: string | null;
          last_error_at: string | null;
          last_error: string | null;
          consecutive_failures: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          last_checked_at?: string | null;
          last_success_at?: string | null;
          last_message_at?: string | null;
          last_error_at?: string | null;
          last_error?: string | null;
          consecutive_failures?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          last_checked_at?: string | null;
          last_success_at?: string | null;
          last_message_at?: string | null;
          last_error_at?: string | null;
          last_error?: string | null;
          consecutive_failures?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          performed_on: string;
          duration_minutes: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          performed_on?: string;
          duration_minutes?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          performed_on?: string;
          duration_minutes?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workout_exercises: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          name: string;
          muscle_group: "Chest" | "Back" | "Legs" | "Shoulders" | "Arms" | "Core" | "Full Body" | "Other";
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          name: string;
          muscle_group?: "Chest" | "Back" | "Legs" | "Shoulders" | "Arms" | "Core" | "Full Body" | "Other";
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          name?: string;
          muscle_group?: "Chest" | "Back" | "Legs" | "Shoulders" | "Arms" | "Core" | "Full Body" | "Other";
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_sets: {
        Row: {
          id: string;
          exercise_id: string;
          user_id: string;
          set_number: number;
          reps: number;
          weight_kg: number;
          rpe: number | null;
          is_warmup: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          exercise_id: string;
          user_id: string;
          set_number: number;
          reps: number;
          weight_kg?: number;
          rpe?: number | null;
          is_warmup?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          exercise_id?: string;
          user_id?: string;
          set_number?: number;
          reps?: number;
          weight_kg?: number;
          rpe?: number | null;
          is_warmup?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          activity_type: "Walking" | "Running" | "Cycling" | "Swimming" | "Hiking" | "Sport" | "Yoga" | "Mobility" | "Other";
          name: string;
          performed_on: string;
          duration_minutes: number;
          distance_km: number | null;
          calories: number | null;
          intensity: "Low" | "Moderate" | "High";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_type: "Walking" | "Running" | "Cycling" | "Swimming" | "Hiking" | "Sport" | "Yoga" | "Mobility" | "Other";
          name: string;
          performed_on?: string;
          duration_minutes: number;
          distance_km?: number | null;
          calories?: number | null;
          intensity?: "Low" | "Moderate" | "High";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          activity_type?: "Walking" | "Running" | "Cycling" | "Swimming" | "Hiking" | "Sport" | "Yoga" | "Mobility" | "Other";
          name?: string;
          performed_on?: string;
          duration_minutes?: number;
          distance_km?: number | null;
          calories?: number | null;
          intensity?: "Low" | "Moderate" | "High";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      routines: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "morning" | "evening" | "fitness" | "custom";
          habit_ids: string[];
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: "morning" | "evening" | "fitness" | "custom";
          habit_ids?: string[];
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: "morning" | "evening" | "fitness" | "custom";
          habit_ids?: string[];
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      streaks: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_logged_date: string | null;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_logged_date?: string | null;
        };
        Update: {
          id?: string;
          habit_id?: string;
          user_id?: string;
          current_streak?: number;
          longest_streak?: number;
          last_logged_date?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
