"use client";

import { useState } from "react";
import type QRCodeStyling from "qr-code-styling";
import type { QRStyleConfig } from "../types/qr-code.types";
import { clientEnv } from "@/lib/env.client";
import { Download, Copy, Check, X, FileImage, ShieldCheck } from "lucide-react";

interface QRDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  name: string;
  styleConfig?: QRStyleConfig;
}

export function QRDownloadModal({
  isOpen,
  onClose,
  slug,
  name,
  styleConfig = {},
}: QRDownloadModalProps) {
  const [format, setFormat] = useState<"svg" | "png">("svg");
  const [pngSize, setPngSize] = useState<number>(1024);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shortUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/r/${slug}`;
  const filename = `${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-qr`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const QRCodeStylingLib = (await import("qr-code-styling")).default;
      const errorCorrectionLevel = styleConfig.logoUrl
        ? "H"
        : styleConfig.errorCorrectionLevel || "M";

      const downloadSize = format === "svg" ? 1024 : pngSize;

      const qr = new QRCodeStylingLib({
        width: downloadSize,
        height: downloadSize,
        type: format === "svg" ? "svg" : "canvas",
        data: shortUrl,
        margin: styleConfig.imageOptions?.margin ?? 6,
        qrOptions: { errorCorrectionLevel },
        dotsOptions: {
          color: styleConfig.dotsOptions?.color || "#0f172a",
          type: styleConfig.dotsOptions?.type || "rounded",
        },
        cornersSquareOptions: {
          color: styleConfig.cornersSquareOptions?.color || "#2563eb",
          type: styleConfig.cornersSquareOptions?.type || "extra-rounded",
        },
        cornersDotOptions: {
          color: styleConfig.cornersDotOptions?.color || "#2563eb",
          type: styleConfig.cornersDotOptions?.type || "dot",
        },
        backgroundOptions: {
          color: styleConfig.backgroundOptions?.color || "#ffffff",
        },
        image: styleConfig.logoUrl || undefined,
        imageOptions: {
          crossOrigin: "anonymous",
          hideBackgroundDots: styleConfig.imageOptions?.hideBackgroundDots ?? true,
          imageSize: styleConfig.imageOptions?.imageSize ?? 0.35,
          margin: 4,
        },
      });

      await qr.download({
        name: filename,
        extension: format,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Close download modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Export QR Code</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download high-res formats for digital display or commercial print
            </p>
          </div>
        </div>

        {/* Short Link Display */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Encoded Dynamic URL</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" /> Immutable
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <code className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {shortUrl}
            </code>
            <button
              onClick={handleCopyLink}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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

        {/* Format Selector */}
        <div className="mt-6">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            File Format
          </label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat("svg")}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                format === "svg"
                  ? "border-blue-600 bg-blue-50/50 shadow-sm dark:border-blue-500 dark:bg-blue-950/30"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
              }`}
            >
              <FileImage className={`h-5 w-5 mt-0.5 ${format === "svg" ? "text-blue-600" : "text-slate-400"}`} />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">SVG Vector</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Infinitely scalable, ideal for print & packaging
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat("png")}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                format === "png"
                  ? "border-blue-600 bg-blue-50/50 shadow-sm dark:border-blue-500 dark:bg-blue-950/30"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
              }`}
            >
              <FileImage className={`h-5 w-5 mt-0.5 ${format === "png" ? "text-blue-600" : "text-slate-400"}`} />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">PNG Raster</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  High-res raster for web, emails & social media
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* PNG Size Selector */}
        {format === "png" && (
          <div className="mt-5 animate-in fade-in duration-150">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Resolution
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[512, 1024, 2048, 4096].map((res) => (
                <button
                  key={res}
                  type="button"
                  onClick={() => setPngSize(res)}
                  className={`rounded-xl border py-2 text-xs font-semibold transition ${
                    pngSize === res
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                  }`}
                >
                  {res}px
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Generating..." : `Download ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
