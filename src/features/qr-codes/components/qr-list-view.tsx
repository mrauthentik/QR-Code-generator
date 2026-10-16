"use client";

import { useState } from "react";
import Link from "next/link";
import { QRCard } from "./qr-card";
import { QRTable } from "./qr-table";
import type { QRCodeModel } from "../types/qr-code.types";
import { LayoutGrid, List, Plus, QrCode, Search, Sparkles } from "lucide-react";

interface QRListViewProps {
  initialCodes: QRCodeModel[];
  total: number;
  page: number;
  limit: number;
  currentStatus?: string;
  currentSearch?: string;
}

export function QRListView({
  initialCodes,
  total,
  page,
  limit,
  currentStatus = "all",
  currentSearch = "",
}: QRListViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState(currentSearch);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Search, Filter Tabs & View Mode Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 text-xs font-semibold shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "paused", label: "Paused" },
            { id: "archived", label: "Archived" },
          ].map((tab) => {
            const isActive = currentStatus === tab.id;
            const searchParam = currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : "";
            const href = tab.id === "all" ? `/qr-codes?page=1${searchParam}` : `/qr-codes?status=${tab.id}&page=1${searchParam}`;

            return (
              <Link
                key={tab.id}
                href={href}
                className={`rounded-xl px-3.5 py-1.5 transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Search Bar & Grid/Table Toggle */}
        <div className="flex items-center gap-3">
          <form method="GET" action="/qr-codes" className="relative flex-1 sm:w-64">
            {currentStatus !== "all" && (
              <input type="hidden" name="status" value={currentStatus} />
            )}
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              name="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by label or URL..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-1.5 pr-4 pl-9 text-xs text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </form>

          {/* Toggle View Mode */}
          <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded-xl p-1.5 transition ${
                viewMode === "grid"
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-xl p-1.5 transition ${
                viewMode === "table"
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
              title="Table View"
              aria-label="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {initialCodes.length === 0 ? (
        <div className="flex min-h-[380px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <QrCode className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            {currentSearch || currentStatus !== "all"
              ? "No matching QR codes found"
              : "No dynamic QR codes yet"}
          </h3>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {currentSearch || currentStatus !== "all"
              ? "Try adjusting your search query or status filter to find what you're looking for."
              : "Create your first dynamic QR code to begin routing traffic with sub-40ms redirects and zero-cookie telemetry."}
          </p>
          <div className="mt-6">
            <Link
              href="/qr-codes/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" /> Create QR Code
            </Link>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {initialCodes.map((qr) => (
            <QRCard key={qr.id} qrCode={qr} />
          ))}
        </div>
      ) : (
        <QRTable qrCodes={initialCodes} />
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-900 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{total}</span> codes
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={`/qr-codes?page=${page - 1}${currentStatus !== "all" ? `&status=${currentStatus}` : ""}${currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : ""}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                Previous
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
                Previous
              </span>
            )}

            {page < totalPages ? (
              <Link
                href={`/qr-codes?page=${page + 1}${currentStatus !== "all" ? `&status=${currentStatus}` : ""}${currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : ""}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                Next
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
                Next
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
