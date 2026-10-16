"use client";

import { useRef, useState } from "react";
import type { QRStyleConfig } from "../types/qr-code.types";
import {
  Palette,
  Sparkles,
  Layers,
  Image as ImageIcon,
  RotateCcw,
  Upload,
  Trash2,
  Sliders,
  Check,
} from "lucide-react";

interface QRStyleEditorProps {
  value: QRStyleConfig;
  onChange: (value: QRStyleConfig) => void;
}

type DotType = "rounded" | "dots" | "classy" | "classy-rounded" | "square" | "extra-rounded";
type CornerSquareType = "dot" | "square" | "extra-rounded";
type CornerDotType = "dot" | "square";

const DOT_TYPES: { label: string; value: DotType }[] = [
  { label: "Rounded", value: "rounded" },
  { label: "Dots", value: "dots" },
  { label: "Classy", value: "classy" },
  { label: "Classy Round", value: "classy-rounded" },
  { label: "Square", value: "square" },
  { label: "Extra Round", value: "extra-rounded" },
];

const CORNER_SQUARE_TYPES: { label: string; value: CornerSquareType }[] = [
  { label: "Extra Round", value: "extra-rounded" },
  { label: "Square", value: "square" },
  { label: "Dot", value: "dot" },
];

const CORNER_DOT_TYPES: { label: string; value: CornerDotType }[] = [
  { label: "Dot", value: "dot" },
  { label: "Square", value: "square" },
];

const COLOR_SWATCHES = [
  { name: "Slate", hex: "#0f172a" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Violet", hex: "#7c3aed" },
  { name: "Emerald", hex: "#059669" },
  { name: "Amber", hex: "#d97706" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Pitch Black", hex: "#000000" },
];

const PRESETS: { name: string; description: string; style: QRStyleConfig }[] = [
  {
    name: "Modern Indigo",
    description: "Rounded slate dots with vibrant blue eye markers",
    style: {
      dotsOptions: { type: "rounded", color: "#0f172a" },
      cornersSquareOptions: { type: "extra-rounded", color: "#2563eb" },
      cornersDotOptions: { type: "dot", color: "#2563eb" },
      backgroundOptions: { color: "#ffffff" },
    },
  },
  {
    name: "Cyber Neon",
    description: "High-contrast electric cyan on dark canvas",
    style: {
      dotsOptions: { type: "dots", color: "#38bdf8" },
      cornersSquareOptions: { type: "extra-rounded", color: "#818cf8" },
      cornersDotOptions: { type: "dot", color: "#818cf8" },
      backgroundOptions: { color: "#0f172a" },
    },
  },
  {
    name: "Emerald Eco",
    description: "Organic classy curves with forest green accents",
    style: {
      dotsOptions: { type: "classy-rounded", color: "#065f46" },
      cornersSquareOptions: { type: "extra-rounded", color: "#059669" },
      cornersDotOptions: { type: "dot", color: "#047857" },
      backgroundOptions: { color: "#ffffff" },
    },
  },
  {
    name: "Ultra Minimal",
    description: "Architectural square grid in pure monochrome",
    style: {
      dotsOptions: { type: "square", color: "#000000" },
      cornersSquareOptions: { type: "square", color: "#000000" },
      cornersDotOptions: { type: "square", color: "#000000" },
      backgroundOptions: { color: "#ffffff" },
    },
  },
];

export function QRStyleEditor({ value, onChange }: QRStyleEditorProps) {
  const [activeTab, setActiveTab] = useState<"patterns" | "colors" | "logo" | "presets">("patterns");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dotsColor = value.dotsOptions?.color || "#0f172a";
  const dotsType = value.dotsOptions?.type || "rounded";
  const cornerSquareType = value.cornersSquareOptions?.type || "extra-rounded";
  const cornerSquareColor = value.cornersSquareOptions?.color || "#2563eb";
  const cornerDotType = value.cornersDotOptions?.type || "dot";
  const cornerDotColor = value.cornersDotOptions?.color || "#2563eb";
  const backgroundColor = value.backgroundOptions?.color || "#ffffff";
  const logoUrl = value.logoUrl || null;
  const imageSize = value.imageOptions?.imageSize ?? 0.35;
  const margin = value.imageOptions?.margin ?? 6;
  const hideBgDots = value.imageOptions?.hideBackgroundDots ?? true;

  const handleUpdate = (patch: Partial<QRStyleConfig>) => {
    onChange({
      ...value,
      ...patch,
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, or SVG).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Logo image size should not exceed 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleUpdate({
          logoUrl: reader.result,
          errorCorrectionLevel: "H", // High error correction recommended for logos
          imageOptions: {
            ...value.imageOptions,
            hideBackgroundDots: true,
            imageSize: 0.35,
            margin: 4,
          },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    handleUpdate({
      logoUrl: null,
      errorCorrectionLevel: "M",
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleResetDefaults = () => {
    onChange({
      dotsOptions: { type: "rounded", color: "#0f172a" },
      cornersSquareOptions: { type: "extra-rounded", color: "#2563eb" },
      cornersDotOptions: { type: "dot", color: "#2563eb" },
      backgroundOptions: { color: "#ffffff" },
      imageOptions: { hideBackgroundDots: true, imageSize: 0.35, margin: 6 },
      logoUrl: null,
      errorCorrectionLevel: "M",
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">QR Style & Customization</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Customize shapes, colors, and branding while maintaining scannability
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetDefaults}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          title="Reset to default design"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
        <button
          type="button"
          onClick={() => setActiveTab("patterns")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
            activeTab === "patterns"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Layers className="h-3.5 w-3.5" /> Shapes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("colors")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
            activeTab === "colors"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Palette className="h-3.5 w-3.5" /> Colors
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("logo")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
            activeTab === "logo"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" /> Logo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("presets")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
            activeTab === "presets"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" /> Themes
        </button>
      </div>

      {/* Tab 1: Patterns / Shapes */}
      {activeTab === "patterns" && (
        <div className="mt-5 space-y-5 animate-in fade-in duration-150">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Data Matrix Dots
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {DOT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() =>
                    handleUpdate({
                      dotsOptions: {
                        ...value.dotsOptions,
                        color: dotsColor,
                        type: t.value,
                      },
                    })
                  }
                  className={`rounded-xl border py-2.5 px-3 text-xs font-medium transition ${
                    dotsType === t.value
                      ? "border-blue-600 bg-blue-50/50 font-bold text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Corner Eye Frame (Outer)
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {CORNER_SQUARE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() =>
                    handleUpdate({
                      cornersSquareOptions: {
                        ...value.cornersSquareOptions,
                        color: cornerSquareColor,
                        type: t.value,
                      },
                    })
                  }
                  className={`rounded-xl border py-2.5 px-3 text-xs font-medium transition ${
                    cornerSquareType === t.value
                      ? "border-blue-600 bg-blue-50/50 font-bold text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Corner Eye Center (Inner)
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {CORNER_DOT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() =>
                    handleUpdate({
                      cornersDotOptions: {
                        ...value.cornersDotOptions,
                        color: cornerDotColor,
                        type: t.value,
                      },
                    })
                  }
                  className={`rounded-xl border py-2.5 px-3 text-xs font-medium transition ${
                    cornerDotType === t.value
                      ? "border-blue-600 bg-blue-50/50 font-bold text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300"
                      : "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Colors */}
      {activeTab === "colors" && (
        <div className="mt-5 space-y-5 animate-in fade-in duration-150">
          {/* Quick Color Swatches */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Palette Presets
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() =>
                    handleUpdate({
                      dotsOptions: { ...value.dotsOptions, color: swatch.hex },
                      cornersSquareOptions: { ...value.cornersSquareOptions, color: swatch.hex },
                      cornersDotOptions: { ...value.cornersDotOptions, color: swatch.hex },
                    })
                  }
                  className="group relative flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 shadow-sm transition hover:scale-110 dark:border-slate-700"
                  style={{ backgroundColor: swatch.hex }}
                  title={`${swatch.name} (${swatch.hex})`}
                >
                  {dotsColor.toLowerCase() === swatch.hex.toLowerCase() && (
                    <Check className={`h-4 w-4 ${swatch.hex === "#ffffff" ? "text-slate-900" : "text-white"}`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Dots Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pattern Color
              </label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 p-1.5 dark:border-slate-700">
                <input
                  type="color"
                  value={dotsColor}
                  onChange={(e) =>
                    handleUpdate({
                      dotsOptions: { ...value.dotsOptions, color: e.target.value },
                    })
                  }
                  className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={dotsColor}
                  onChange={(e) =>
                    handleUpdate({
                      dotsOptions: { ...value.dotsOptions, color: e.target.value },
                    })
                  }
                  className="w-full text-xs font-mono uppercase bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Corner Eyes Color */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Corner Markers Color
              </label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 p-1.5 dark:border-slate-700">
                <input
                  type="color"
                  value={cornerSquareColor}
                  onChange={(e) =>
                    handleUpdate({
                      cornersSquareOptions: { ...value.cornersSquareOptions, color: e.target.value },
                      cornersDotOptions: { ...value.cornersDotOptions, color: e.target.value },
                    })
                  }
                  className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={cornerSquareColor}
                  onChange={(e) =>
                    handleUpdate({
                      cornersSquareOptions: { ...value.cornersSquareOptions, color: e.target.value },
                      cornersDotOptions: { ...value.cornersDotOptions, color: e.target.value },
                    })
                  }
                  className="w-full text-xs font-mono uppercase bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Background Color */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Background Canvas Color
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 p-1.5 dark:border-slate-700">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) =>
                  handleUpdate({
                    backgroundOptions: { color: e.target.value },
                  })
                }
                className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) =>
                  handleUpdate({
                    backgroundOptions: { color: e.target.value },
                  })
                }
                className="w-full text-xs font-mono uppercase bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Logo & Geometry */}
      {activeTab === "logo" && (
        <div className="mt-5 space-y-5 animate-in fade-in duration-150">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Center Logo / Icon
            </label>
            <div className="mt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />

              {logoUrl ? (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Logo Preview"
                      className="h-10 w-10 rounded-lg object-contain border border-slate-200 bg-white p-1 dark:border-slate-700"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">Active Logo</div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        Error correction boosted to High (30%)
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Remove logo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-4 text-xs font-semibold text-slate-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400"
                >
                  <Upload className="h-4 w-4" /> Upload Brand Logo (PNG, SVG, Max 2MB)
                </button>
              )}
            </div>
          </div>

          {/* Size slider if logo is active */}
          {logoUrl && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Logo Scaling</span>
                  <span className="font-mono">{Math.round(imageSize * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.45"
                  step="0.05"
                  value={imageSize}
                  onChange={(e) =>
                    handleUpdate({
                      imageOptions: {
                        ...value.imageOptions,
                        imageSize: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="mt-2 w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Hide Background Dots Behind Logo
                </span>
                <input
                  type="checkbox"
                  checked={hideBgDots}
                  onChange={(e) =>
                    handleUpdate({
                      imageOptions: {
                        ...value.imageOptions,
                        hideBackgroundDots: e.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Margin Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <Sliders className="h-3 w-3" /> Quiet Zone Margin
              </span>
              <span className="font-mono">{margin}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="16"
              step="2"
              value={margin}
              onChange={(e) =>
                handleUpdate({
                  imageOptions: {
                    ...value.imageOptions,
                    margin: parseInt(e.target.value, 10),
                  },
                })
              }
              className="mt-2 w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Tab 4: Designer Presets */}
      {activeTab === "presets" && (
        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 animate-in fade-in duration-150">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onChange(preset.style)}
              className="flex flex-col items-start rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-blue-500 hover:bg-blue-50/20 dark:border-slate-800 dark:hover:border-blue-500 dark:hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full border border-black/10"
                  style={{ backgroundColor: preset.style.dotsOptions?.color || "#0f172a" }}
                />
                <span className="text-xs font-bold text-slate-900 dark:text-white">{preset.name}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{preset.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
