"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MetricKpiCard } from "./metric-kpi-card";
import { TimeSeriesChart } from "./time-series-chart";
import { BreakdownCard } from "./breakdown-card";
import { DeviceBreakdownChart } from "./device-breakdown-chart";
import { OsBrowserChart } from "./os-browser-chart";
import { DestinationHistoryCard } from "./destination-history-card";
import type { AnalyticsSummary, TimeRange } from "../types/analytics.types";
import {
  Activity,
  Users,
  Smartphone,
  Globe,
  Download,
  Share2,
  Calendar,
  ExternalLink,
} from "lucide-react";

interface AnalyticsDashboardProps {
  summary: AnalyticsSummary;
  currentDestinationUrl?: string;
}

const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: "24h", label: "24 Hours" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
  { id: "all", label: "All Time" },
];

export function AnalyticsDashboard({
  summary,
  currentDestinationUrl,
}: AnalyticsDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleRangeChange = (range: TimeRange) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.push(`${pathname}?${params.toString()}`);
  };

  // Derive high-level KPI insights
  const mobileDevice = summary.devices.find((d) => d.name.toLowerCase() === "mobile");
  const mobilePercentage = mobileDevice ? `${mobileDevice.percentage}%` : "0%";

  const topCountry = summary.countries[0]?.name || "N/A";
  const topCountryShare = summary.countries[0] ? `${summary.countries[0].percentage}%` : "";

  return (
    <div className="space-y-8">
      {/* Header with Title, Range Switcher & Export Button */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {summary.qrName ? `${summary.qrName} Analytics` : "Scan Telemetry"}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {summary.slug ? (
              <span>
                Tracking scans for short URL: <code className="font-mono font-bold">/r/{summary.slug}</code>
              </span>
            ) : (
              "Consolidated telemetry across all active and paused QR codes"
            )}
          </p>
        </div>

        {/* Range Selector & CSV Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Range Pills */}
          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50/80 p-1 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950">
            {TIME_RANGES.map((r) => {
              const isActive = summary.timeRange === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRangeChange(r.id)}
                  className={`rounded-xl px-3 py-1.5 transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* CSV Export Button */}
          {summary.qrId && (
            <a
              href={`/api/qr-codes/${summary.qrId}/export`}
              download
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </a>
          )}
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricKpiCard
          title="Total Scans"
          value={summary.totalScans}
          subtitle="Non-blocking edge redirects"
          icon={Activity}
          variant="blue"
        />

        <MetricKpiCard
          title="Unique Visitors"
          value={summary.uniqueVisitors}
          subtitle="Daily salted HMAC anonymization"
          icon={Users}
          variant="emerald"
        />

        <MetricKpiCard
          title="Mobile Scans"
          value={mobilePercentage}
          subtitle="Camera & smartphone engagement"
          icon={Smartphone}
          variant="default"
        />

        <MetricKpiCard
          title="Top Country"
          value={topCountry}
          subtitle={topCountryShare ? `${topCountryShare} of geographic volume` : "Global distribution"}
          icon={Globe}
          variant="amber"
        />
      </div>

      {/* Time-Series Chart */}
      <TimeSeriesChart
        data={summary.timeSeries}
        title={
          summary.timeRange === "24h"
            ? "Hourly Scan Activity (Last 24 Hours)"
            : "Daily Scan Activity"
        }
      />

      {/* Secondary Row: Devices & Operating Systems / Browsers */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <DeviceBreakdownChart devices={summary.devices} />
        <OsBrowserChart os={summary.os} browsers={summary.browsers} />
      </div>

      {/* Tertiary Row: Geographic Distribution & Top Referrers */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <BreakdownCard
          title="Top Countries"
          subtitle="Scans segmented by geographic origin"
          icon={Globe}
          items={summary.countries}
          emptyMessage="No country telemetry available"
        />

        <BreakdownCard
          title="Top Referrers"
          subtitle="Domains passing HTTP referrer headers"
          icon={Share2}
          items={summary.referrers}
          emptyMessage="Direct scans (native camera app scans typically omit referrer headers)"
        />
      </div>

      {/* Destination History (if single QR code view) */}
      {summary.destinationHistory && (
        <DestinationHistoryCard
          history={summary.destinationHistory}
          currentDestinationUrl={currentDestinationUrl}
        />
      )}
    </div>
  );
}
