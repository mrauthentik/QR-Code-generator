import { NextResponse } from "next/server";
import { getAdminClient } from "@/server/db/admin";
import { getSlugCache, UpstashSlugCache } from "@/server/cache/slug-cache";

export async function GET() {
  const startTime = performance.now();
  let dbStatus: "up" | "down" = "up";
  let dbLatencyMs = 0;
  let dbError: string | null = null;

  try {
    const db = getAdminClient();
    const t0 = performance.now();
    const { error } = await db.from("qr_codes").select("id").limit(1);
    dbLatencyMs = Math.round(performance.now() - t0);

    if (error) {
      dbStatus = "down";
      dbError = error.message;
    }
  } catch (err: unknown) {
    dbStatus = "down";
    dbError = err instanceof Error ? err.message : "Database connection failed";
  }

  const cache = getSlugCache();
  const cacheType = cache instanceof UpstashSlugCache ? "redis" : "memory";
  let cacheStatus: "up" | "down" = "up";

  try {
    await cache.get("__healthcheck__");
  } catch {
    cacheStatus = "down";
  }

  const totalDurationMs = Math.round(performance.now() - startTime);
  const isHealthy = dbStatus === "up";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      totalLatencyMs: totalDurationMs,
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
          error: dbError || undefined,
        },
        cache: {
          status: cacheStatus,
          type: cacheType,
        },
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
