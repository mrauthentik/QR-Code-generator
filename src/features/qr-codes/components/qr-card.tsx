"use client";

import { useState } from "react";
import Link from "next/link";
import { QRPreview } from "./qr-preview";
import { QRDownloadModal } from "./qr-download-modal";
import { setQRCodeStatusAction, deleteQRCodeAction } from "../actions/qr-code.actions";
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
  Trash2,
  MoreVertical,
  Calendar,
  AlertTriangle,
} from "lucide-react";

interface QRCardProps {
  qrCode: QRCodeModel;
  onRefresh?: () => void;
}

export function QRCard({ qrCode, onRefresh }: QRCardProps) {
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const shortUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/r/${qrCode.slug}`;
  const formattedDate = new Date(qrCode.createdAt).toLocaleDateString(undefined, {
    month: "short",
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
      const nextStatus = qrCode.status === "active" ? "paused" : "active";
      await setQRCodeStatusAction(qrCode.id, nextStatus);
      if (onRefresh) onRefresh();
    } finally {
      setIsUpdatingStatus(false);
      setMenuOpen(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteQRCodeAction(qrCode.id);
      if (onRefresh) onRefresh();
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setMenuOpen(false);
    }
  };

  return (
    <>
      <div className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
        <div>
          {/* Header row: Status & Actions menu */}
          <div className="flex items-center justify-between">
            {/* Status Pill */}
            {qrCode.status === "active" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            )}
            {qrCode.status === "paused" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <Pause className="h-3 w-3" /> Paused
              </span>
            )}
            {qrCode.status === "archived" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                Archived
              </span>
            )}

            {/* Dropdown menu trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Actions menu"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-8 z-20 w-44 rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-100">
                  <Link
                    href={`/qr-codes/${qrCode.id}/edit`}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Edit className="h-3.5 w-3.5 text-slate-500" /> Edit QR Code
                  </Link>

                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={handleToggleStatus}
                    className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {qrCode.status === "active" ? (
                      <>
                        <Pause className="h-3.5 w-3.5 text-amber-500" /> Pause Redirect
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 text-emerald-500" /> Resume Redirect
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteConfirmOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* QR Preview Thumbnail */}
          <div className="mt-4 flex items-center justify-center">
            <Link
              href={`/qr-codes/${qrCode.id}`}
              className="flex items-center justify-center rounded-2xl p-2 transition hover:scale-105"
            >
              <QRPreview
                slug={qrCode.slug}
                styleConfig={qrCode.style}
                size={140}
                className="pointer-events-none shadow-none"
              />
            </Link>
          </div>

          {/* Title & Destination */}
          <div className="mt-4">
            <Link
              href={`/qr-codes/${qrCode.id}`}
              className="block truncate text-base font-bold text-slate-900 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
            >
              {qrCode.name}
            </Link>

            <a
              href={qrCode.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
            >
              <span className="truncate">{qrCode.destinationUrl}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>

          {/* Short URL Pill */}
          <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-950">
            <span className="truncate font-mono font-medium text-slate-700 dark:text-slate-300">
              /r/{qrCode.slug}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
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

        {/* Footer: Date & Quick Action Buttons */}
        <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 text-[11px]">
              <Calendar className="h-3 w-3" /> {formattedDate}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDownloadModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Download SVG or PNG"
              >
                <Download className="h-3 w-3" /> Export
              </button>

              <Link
                href={`/qr-codes/${qrCode.id}`}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
              >
                <BarChart3 className="h-3 w-3" /> Analytics
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Download Modal */}
      <QRDownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        slug={qrCode.slug}
        name={qrCode.name}
        styleConfig={qrCode.style}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete QR Code?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This QR code will permanently stop redirecting visitors.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
