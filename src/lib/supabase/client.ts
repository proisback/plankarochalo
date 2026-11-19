import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDemoClient, isDemoPath } from "@/lib/demo/backend";

/**
 * Browser Supabase client.
 *
 * On /demo this returns an in-memory stand-in with the same call surface, so
 * the demo runs the real screens without touching the production database.
 */
export function createClient(): SupabaseClient {
  if (typeof window !== "undefined" && isDemoPath(window.location.pathname)) {
    return getDemoClient() as unknown as SupabaseClient;
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** True when the page is running against the in-memory demo trip. */
export function isDemo(): boolean {
  return typeof window !== "undefined" && isDemoPath(window.location.pathname);
}
