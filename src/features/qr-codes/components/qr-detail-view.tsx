"use client";

import { useState } from "react";
import Link from "next/link";
import { QRPreview } from "./qr-preview";
import { QRDownloadModal } from "./qr-download-modal";
import { setQRCodeStatusAction } from "../actions/qr-code.actions";
import type { QRCodeModel } from "../types/qr-code.types";
import { clientEnv } from "@/lib/env.client";
import {
  Download,
  Copy,
  Check,
  ExternalLink,
  Edit,
  Pause,
  Play,
  ShieldCheck,
  Activity,
  Layers,
  Calendar,
  Globe,
  Monitor,
  ArrowRight,
  Info,
  BarChart3,
} from "lucide-react";

interface ScanSummary {
  id: number;
  scanned_at: string;
  country: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
}

interface QRDetailViewProps {
  qrCode: QRCodeModel;
  totalScans: number;
  recentScans: ScanSummary[];
}

export function QRDetailView({ qrCode, totalScans, recentScans }: QRDetailViewProps) {
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(qrCode.status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const shortUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/r/${qrCode.slug}`;
  const formattedCreatedAt = new Date(qrCode.createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedUpdatedAt = new Date(qrCode.updatedAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleToggleStatus = async () => {
    setIsUpdatingStatus(true);
    try {
      const nextStatus = currentStatus === "active" ? "paused" : "active";
      const result = await setQRCodeStatusAction(qrCode.id, nextStatus);
      if (result.success) {
        setCurrentStatus(nextStatus);
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const ecl = qrCode.style.logoUrl
    ? "High (30% recovery)"
    : qrCode.style.errorCorrectionLevel === "H"
      ? "High (30%)"
      : qrCode.style.errorCorrectionLevel === "Q"
        ? "Quartile (25%)"
        : "Medium (15%)";

  return (
    <div className="space-y-8">
      {/* Top Banner / Actions Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {qrCode.name}
            </h1>
            {currentStatus === "active" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            )}
            {currentStatus === "paused" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <Pause className="h-3 w-3" /> Paused
              </span>
            )}
            {currentStatus === "archived" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                Archived
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Created on {formattedCreatedAt} • Last updated {formattedUpdatedAt}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={handleToggleStatus}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
              currentStatus === "active"
                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
            }`}
          >
            {currentStatus === "active" ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Pause Redirect
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Resume Redirect
              </>
            )}
          </button>

          <Link
            href={`/qr-codes/${qrCode.id}/analytics`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Full Analytics
          </Link>

          <Link
            href={`/qr-codes/${qrCode.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Edit className="h-3.5 w-3.5" /> Edit Configuration
          </Link>

          <button
            type="button"
            onClick={() => setDownloadModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-500"
          >
            <Download className="h-3.5 w-3.5" /> Export QR Code
          </button>
        </div>
      </div>

      {/* Main Grid: Visual & Routing vs Scan Analytics */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: QR Visual & Routing Specs (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col items-center justify-center p-2">
              <QRPreview
                slug={qrCode.slug}
                styleConfig={qrCode.style}
                size={240}
                className="border border-slate-100 shadow-none dark:border-slate-800"
              />
            </div>

            {/* Encoded Short URL */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold uppercase tracking-wider">Dynamic Short Link</span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" /> 302 Fast Path
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <code className="text-xs font-bold text-slate-900 truncate dark:text-white">
                  {shortUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Destination Target */}
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold uppercase tracking-wider">Active Destination</span>
                <a
                  href={qrCode.destinationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  Visit <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="mt-2 truncate text-xs font-medium text-slate-900 dark:text-white">
                {qrCode.destinationUrl}
              </p>
            </div>
          </div>

          {/* Design Specs Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Layers className="h-4 w-4 text-blue-600" /> QR Code Specifications
            </h3>

            <dl className="mt-4 divide-y divide-slate-100 text-xs dark:divide-slate-800">
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500 dark:text-slate-400">Error Correction Level</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">{ecl}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500 dark:text-slate-400">Pattern Style</dt>
                <dd className="font-semibold capitalize text-slate-900 dark:text-white">
                  {qrCode.style.dotsOptions?.type || "rounded"}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500 dark:text-slate-400">Corner Eye Shape</dt>
                <dd className="font-semibold capitalize text-slate-900 dark:text-white">
                  {qrCode.style.cornersSquareOptions?.type || "extra-rounded"}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500 dark:text-slate-400">Branded Logo</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">
                  {qrCode.style.logoUrl ? "Embedded (High ECL)" : "None"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Right Column: Scan Telemetry Preview & Recent Traffic (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Scans Recorded
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {totalScans.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Non-blocking telemetry logged asynchronously via edge runtime
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Privacy Compliance
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                Zero-Cookie & Daily HMAC
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                IP addresses are never stored. Anonymized rotating salt guarantees GDPR/CCPA safety.
              </p>
            </div>
          </div>

          {/* Recent Scans Feed */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Live Scan Activity (Last {recentScans.length} Scans)
              </h3>
              <span className="text-[11px] text-slate-400">Real-time stream</span>
            </div>

            {recentScans.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <Activity className="h-6 w-6" />
                </div>
                <h4 className="mt-3 text-xs font-bold text-slate-900 dark:text-white">
                  No scans recorded yet
                </h4>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Scan this QR code with your smartphone camera to watch telemetry stream in.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Device / OS</th>
                      <th className="py-2.5 px-3">Browser</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentScans.map((scan) => {
                      const timeStr = new Date(scan.scanned_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      });
                      const dateStr = new Date(scan.scanned_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      });

                      return (
                        <tr key={scan.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {dateStr} {timeStr}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3 text-slate-400" />
                              {scan.country || "Unknown"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-1">
                              <Monitor className="h-3 w-3 text-slate-400" />
                              {scan.device_type || "Desktop"} ({scan.os || "Unknown"})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {scan.browser || "Unknown"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 text-right">
              <Link
                href={`/qr-codes/${qrCode.id}/analytics`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Explore In-Depth Telemetry & Charts <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <QRDownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        slug={qrCode.slug}
        name={qrCode.name}
        styleConfig={qrCode.style}
      />
    </div>
  );
}
