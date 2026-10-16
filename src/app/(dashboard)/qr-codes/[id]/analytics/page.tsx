import { AuthService } from "@/features/auth/services/auth.service";
import { createClient } from "@/server/db/client";
import { QRCodesRepository } from "@/server/repositories/qr-codes.repo";
import { ScansRepository } from "@/server/repositories/scans.repo";
import { RollupsRepository } from "@/server/repositories/rollups.repo";
import { AnalyticsService } from "@/features/analytics/services/analytics.service";
import { AnalyticsDashboard } from "@/features/analytics/components/analytics-dashboard";
import type { TimeRange } from "@/features/analytics/types/analytics.types";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface QRAnalyticsPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    range?: string;
  }>;
}

export default async function QRAnalyticsPage({
  params,
  searchParams,
}: QRAnalyticsPageProps) {
  const user = await AuthService.requireUser();
  const { id } = await params;
  const queryParams = await searchParams;

  const validRanges: Record<string, TimeRange> = {
    "24h": "24h",
    "7d": "7d",
    "30d": "30d",
    "90d": "90d",
    all: "all",
  };
  const range: TimeRange = validRanges[queryParams.range || "7d"] || "7d";

  const db = await createClient();
  const qrRepo = new QRCodesRepository(db);
  const scansRepo = new ScansRepository(db);
  const rollupsRepo = new RollupsRepository(db);
  const analyticsService = new AnalyticsService(qrRepo, scansRepo, rollupsRepo);

  let summary;
  let qr;
  try {
    qr = await qrRepo.findById(id, user.id);
    if (!qr) notFound();
    summary = await analyticsService.getQRAnalytics(id, user.id, range);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Link href="/qr-codes" className="hover:text-slate-900 dark:hover:text-white">
          QR Codes
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/qr-codes/${qr.id}`}
          className="max-w-[200px] truncate hover:text-slate-900 dark:hover:text-white"
        >
          {qr.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-900 font-semibold dark:text-white">Analytics</span>
      </nav>

      {/* Main Analytics Dashboard */}
      <AnalyticsDashboard
        summary={summary}
        currentDestinationUrl={qr.destination_url}
      />
    </div>
  );
}
