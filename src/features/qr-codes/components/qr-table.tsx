"use client";

import { useState } from "react";
import Link from "next/link";
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
  BarChart3,
  Pause,
  Play,
  QrCode,
} from "lucide-react";

interface QRTableProps {
  qrCodes: QRCodeModel[];
  onRefresh?: () => void;
}

export function QRTable({ qrCodes, onRefresh }: QRTableProps) {
  const [selectedQR, setSelectedQR] = useState<QRCodeModel | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleCopy = async (id: string, slug: string) => {
    try {
      const shortUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/r/${slug}`;
      await navigator.clipboard.writeText(shortUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleToggleStatus = async (qr: QRCodeModel) => {
    setUpdatingId(qr.id);
    try {
      const nextStatus = qr.status === "active" ? "paused" : "active";
      await setQRCodeStatusAction(qr.id, nextStatus);
      if (onRefresh) onRefresh();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
              <th className="py-3 px-4">QR Code & Label</th>
              <th className="py-3 px-4">Short Link</th>
              <th className="py-3 px-4">Destination Target</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
            {qrCodes.map((qr) => {
              const formattedDate = new Date(qr.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <tr
                  key={qr.id}
                  className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                >
                  {/* Name */}
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                        <QrCode className="h-5 w-5" />
                      </div>
                      <div>
                        <Link
                          href={`/qr-codes/${qr.id}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {qr.name}
                        </Link>
                      </div>
                    </div>
                  </td>

                  {/* Slug */}
                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <span>/r/{qr.slug}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(qr.id, qr.slug)}
                        className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="Copy short URL"
                      >
                        {copiedId === qr.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Destination */}
                  <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate dark:text-slate-400">
                    <a
                      href={qr.destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 truncate"
                    >
                      <span className="truncate">{qr.destinationUrl}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {qr.status === "active" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    )}
                    {qr.status === "paused" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        Paused
                      </span>
                    )}
                    {qr.status === "archived" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Archived
                      </span>
                    )}
                  </td>

                  {/* Created Date */}
                  <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedQR(qr)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800"
                        title="Download SVG/PNG"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        disabled={updatingId === qr.id}
                        onClick={() => handleToggleStatus(qr)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        title={qr.status === "active" ? "Pause redirect" : "Activate redirect"}
                      >
                        {qr.status === "active" ? (
                          <Pause className="h-4 w-4 text-amber-500" />
                        ) : (
                          <Play className="h-4 w-4 text-emerald-500" />
                        )}
                      </button>

                      <Link
                        href={`/qr-codes/${qr.id}/edit`}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                        title="Edit QR Code"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>

                      <Link
                        href={`/qr-codes/${qr.id}`}
                        className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                        title="View Analytics"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedQR && (
        <QRDownloadModal
          isOpen={Boolean(selectedQR)}
          onClose={() => setSelectedQR(null)}
          slug={selectedQR.slug}
          name={selectedQR.name}
          styleConfig={selectedQR.style}
        />
      )}
    </div>
  );
}
