"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRPreview } from "./qr-preview";
import { QRStyleEditor } from "./qr-style-editor";
import { createQRCodeAction, updateQRCodeAction } from "../actions/qr-code.actions";
import type { QRCodeModel, QRStyleConfig } from "../types/qr-code.types";
import type { QRStatus } from "@/server/db/types.generated";
import { clientEnv } from "@/lib/env.client";
import { DEFAULT_QR_STYLE } from "@/lib/constants";
import {
  Link2,
  ExternalLink,
  ShieldCheck,
  Lock,
  Loader2,
  AlertCircle,
  Save,
  ArrowLeft,
  Sparkles,
  Info,
} from "lucide-react";

interface QRFormProps {
  mode: "create" | "edit";
  initialData?: QRCodeModel;
}

export function QRForm({ mode, initialData }: QRFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name || "");
  const [destinationUrl, setDestinationUrl] = useState(initialData?.destinationUrl || "");
  const [customSlug, setCustomSlug] = useState(initialData?.slug || "");
  const [status, setStatus] = useState<QRStatus>(initialData?.status || "active");
  const [style, setStyle] = useState<QRStyleConfig>(initialData?.style || DEFAULT_QR_STYLE);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});

  const previewSlug = (customSlug || (mode === "edit" ? initialData?.slug : "")) || "sample-slug";
  const displayShortUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/r/${previewSlug}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      if (mode === "create") {
        const result = await createQRCodeAction({
          name,
          destinationUrl,
          customSlug: customSlug.trim() || undefined,
          style,
        });

        if (result.success) {
          router.push(`/qr-codes/${result.data.id}`);
          router.refresh();
        } else {
          setErrorMessage(result.error.message);
          if (result.error.details && typeof result.error.details === "object") {
            setFieldErrors(result.error.details as Record<string, string[]>);
          }
        }
      } else if (initialData) {
        const result = await updateQRCodeAction(initialData.id, {
          name,
          destinationUrl,
          status,
          style,
        });

        if (result.success) {
          router.push(`/qr-codes/${initialData.id}`);
          router.refresh();
        } else {
          setErrorMessage(result.error.message);
          if (result.error.details && typeof result.error.details === "object") {
            setFieldErrors(result.error.details as Record<string, string[]>);
          }
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div>
            <span className="font-semibold">Unable to save QR code:</span> {errorMessage}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Form Fields & Style Controls (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Section 1: Basic Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">QR Code Destination & Details</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Configure where this QR code directs visitors and its organizational label
            </p>

            <div className="mt-6 space-y-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="qr-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  Campaign or Label Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="qr-name"
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Summer Menu Table Tent #4"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.name[0]}</p>
                )}
              </div>

              {/* Destination URL */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="qr-destination"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    Destination URL <span className="text-red-500">*</span>
                  </label>
                  {destinationUrl && (
                    <a
                      href={destinationUrl.startsWith("http") ? destinationUrl : `https://${destinationUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                    >
                      Test link <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="relative mt-1.5">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <input
                    id="qr-destination"
                    type="url"
                    required
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://example.com/promotions"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                {fieldErrors.destinationUrl ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.destinationUrl[0]}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    You can change this URL at any time without having to reprint the QR code.
                  </p>
                )}
              </div>

              {/* Custom Slug */}
              {mode === "create" ? (
                <div>
                  <label
                    htmlFor="qr-slug"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    Custom Short Slug <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="mt-1.5 flex rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800">
                    <span className="inline-flex items-center border-r border-slate-200 bg-slate-50 px-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                      /r/
                    </span>
                    <input
                      id="qr-slug"
                      type="text"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value.toLowerCase().trim())}
                      placeholder="auto-generated-if-blank"
                      className="w-full bg-transparent px-3 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white"
                    />
                  </div>
                  {fieldErrors.customSlug ? (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {fieldErrors.customSlug[0]}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      3-16 characters (letters, numbers, hyphens). Leave blank to auto-generate a collision-safe code.
                    </p>
                  )}
                </div>
              ) : (
                /* Edit Mode: Slug is immutable */
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Short Slug
                    </label>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      <Lock className="h-3 w-3" /> Immutable
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100/70 px-3.5 py-2.5 text-sm font-mono text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                    <span>{displayShortUrl}</span>
                    <span className="text-xs text-slate-400">Locked to protect printed assets</span>
                  </div>
                </div>
              )}

              {/* Status Selector in Edit Mode */}
              {mode === "edit" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Routing Status
                  </label>
                  <div className="mt-2 grid grid-cols-3 gap-3">
                    {[
                      {
                        value: "active" as const,
                        title: "Active",
                        desc: "Scanners are immediately redirected",
                        color: "border-emerald-500 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
                      },
                      {
                        value: "paused" as const,
                        title: "Paused",
                        desc: "Displays branded maintenance page",
                        color: "border-amber-500 bg-amber-50/50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
                      },
                      {
                        value: "archived" as const,
                        title: "Archived",
                        desc: "Inactive (HTTP 410 Gone)",
                        color: "border-slate-500 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-300",
                      },
                    ].map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStatus(s.value)}
                        className={`rounded-xl border p-3 text-left transition ${
                          status === s.value
                            ? `${s.color} font-bold shadow-sm`
                            : "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:text-slate-400"
                        }`}
                      >
                        <div className="text-xs font-bold">{s.title}</div>
                        <div className="mt-0.5 text-[10px] opacity-80">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Style Customization */}
          <QRStyleEditor value={style} onChange={setStyle} />
        </div>

        {/* Right Column: Sticky Live Preview & Action Buttons (5 cols) */}
        <div className="space-y-6 lg:col-span-5 lg:sticky lg:top-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Sparkles className="h-4 w-4 text-blue-600" /> Live Scannable Preview
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" /> High Fidelity
              </span>
            </div>

            {/* QR Preview Component */}
            <div className="mt-4 flex flex-col items-center justify-center">
              <QRPreview
                slug={previewSlug}
                styleConfig={style}
                size={240}
                className="border border-slate-100 dark:border-slate-800"
              />
            </div>

            {/* Target & Redirect Information Callout */}
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900 dark:border-blue-950 dark:bg-blue-950/30 dark:text-blue-200">
              <div className="flex items-center gap-2 font-bold">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Redirect Invariant</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-blue-800/90 dark:text-blue-300/80">
                This QR code points to <span className="font-mono font-semibold">{displayShortUrl}</span>.
                When visitors scan it, our edge routing delivers a 302 redirect in &lt;40ms.
              </p>
            </div>

            {/* Submit Action Buttons */}
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : mode === "create" ? (
                  <>
                    <Save className="h-4 w-4" /> Create Dynamic QR Code
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Changes
                  </>
                )}
              </button>

              <Link
                href={mode === "edit" && initialData ? `/qr-codes/${initialData.id}` : "/qr-codes"}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Cancel & Return
              </Link>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
