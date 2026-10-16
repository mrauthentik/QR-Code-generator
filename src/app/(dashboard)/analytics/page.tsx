import { AuthService } from "@/features/auth/services/auth.service";
import { createClient } from "@/server/db/client";
import { QRCodesRepository } from "@/server/repositories/qr-codes.repo";
import { ScansRepository } from "@/server/repositories/scans.repo";
import { RollupsRepository } from "@/server/repositories/rollups.repo";
import { AnalyticsService } from "@/features/analytics/services/analytics.service";
import { AnalyticsDashboard } from "@/features/analytics/components/analytics-dashboard";
import type { TimeRange } from "@/features/analytics/types/analytics.types";

interface AnalyticsPageProps {
  searchParams: Promise<{
    range?: string;
  }>;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const user = await AuthService.requireUser();
  const params = await searchParams;

  const validRanges: Record<string, TimeRange> = {
    "24h": "24h",
    "7d": "7d",
    "30d": "30d",
    "90d": "90d",
    all: "all",
  };
  const range: TimeRange = validRanges[params.range || "7d"] || "7d";

  const db = await createClient();
  const qrRepo = new QRCodesRepository(db);
  const scansRepo = new ScansRepository(db);
  const rollupsRepo = new RollupsRepository(db);
  const analyticsService = new AnalyticsService(qrRepo, scansRepo, rollupsRepo);

  const summary = await analyticsService.getGlobalAnalytics(user.id, range);

  return (
    <div className="space-y-6">
      <AnalyticsDashboard summary={summary} />
    </div>
  );
}
