import { createBrowserClient } from "@supabase/ssr";
import { GetSupabaseConfiguration } from "./config";

export function createClient() {
  const configuration = GetSupabaseConfiguration();
  return createBrowserClient(configuration.url, configuration.anonKey);
}
