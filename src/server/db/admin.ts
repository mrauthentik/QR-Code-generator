import "server-only";
import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env.client";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "@/server/db/types.generated";

/**
 * Service Role Admin Client.
 * Bypasses Row Level Security (RLS).
 *
 * CAUTION: NEVER import or expose this client in client components or customer-facing route handlers.
 * It is reserved exclusively for:
 * 1. Background scan telemetry ingestion inside Next.js `after()`
 * 2. Scheduled cron rollup aggregation
 */
let adminClientInstance: ReturnType<typeof createClient<Database>> | null = null;

export function getAdminClient() {
  if (!adminClientInstance) {
    adminClientInstance = createClient<Database>(
      clientEnv.NEXT_PUBLIC_SUPABASE_URL,
      serverEnv.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return adminClientInstance;
}

export type SupabaseAdminClient = ReturnType<typeof getAdminClient>;
