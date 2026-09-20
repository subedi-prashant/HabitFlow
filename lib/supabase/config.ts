const LOCAL_SUPABASE_HOSTS = new Set(["127.0.0.1", "localhost"]);

export function GetSupabaseConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  if (process.env.NODE_ENV !== "production" && !LOCAL_SUPABASE_HOSTS.has(new URL(url).hostname)) {
    throw new Error("Development must use the local Supabase instance");
  }

  return { url, anonKey };
}
