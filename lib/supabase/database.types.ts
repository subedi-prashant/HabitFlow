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
