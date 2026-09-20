import "server-only";
import { createClient } from "@supabase/supabase-js";
import { GetSupabaseConfiguration } from "./config";
import { Database } from "./database.types";

export function CreateAdminSupabaseClient() {
  const configuration = GetSupabaseConfiguration();
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Kharcha ingestion is not configured");
  }

  return createClient<Database>(configuration.url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
