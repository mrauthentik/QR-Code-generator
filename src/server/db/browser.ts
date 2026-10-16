import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env.client";
import type { Database } from "@/server/db/types.generated";

/**
 * Creates a browser-side Supabase client for authentication forms and client session listeners.
 */
export function createClientComponentClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
