import { NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env.server";
import { getAdminClient } from "@/server/db/admin";
import { RollupsRepository } from "@/server/repositories/rollups.repo";
import { logger } from "@/lib/logger";

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return false;

  return token === serverEnv.CRON_SECRET;
}

async function handleAggregate(request: NextRequest) {
  // 1. Authenticate cron trigger
  if (!verifyCronSecret(request)) {
    logger.warn("Unauthorized cron aggregation attempt", {
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Resolve target date (defaults to yesterday UTC)
  const url = new URL(request.url);
  const paramDate = url.searchParams.get("date");

  let targetDate: string;
  if (paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate)) {
    targetDate = paramDate;
  } else {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    targetDate = yesterday.toISOString().slice(0, 10);
  }

  const startTime = performance.now();
  try {
    const adminDb = getAdminClient();
    const rollupsRepo = new RollupsRepository(adminDb);

    const rowsProcessed = await rollupsRepo.executeDailyRollup(targetDate);
    const durationMs = Math.round(performance.now() - startTime);

    logger.info("Daily scan rollup completed successfully", {
      targetDate,
      rowsProcessed,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      targetDate,
      rowsProcessed,
      durationMs,
      executedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Rollup execution failed";
    logger.error("Daily scan rollup failed", {
      targetDate,
      error: err,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        targetDate,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleAggregate(request);
}

export async function POST(request: NextRequest) {
  return handleAggregate(request);
}
