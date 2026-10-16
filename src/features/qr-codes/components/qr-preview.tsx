"use client";

import { useEffect, useRef, useState } from "react";
import type QRCodeStyling from "qr-code-styling";
import type { Options as QRCodeStylingOptions } from "qr-code-styling";
import type { QRStyleConfig } from "../types/qr-code.types";
import { clientEnv } from "@/lib/env.client";
import { Loader2 } from "lucide-react";

interface QRPreviewProps {
  slug: string;
  styleConfig?: QRStyleConfig;
  size?: number;
  className?: string;
  onInstanceReady?: (instance: QRCodeStyling) => void;
}

export function QRPreview({
  slug,
  styleConfig = {},
  size = 280,
  className = "",
  onInstanceReady,
}: QRPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const shortUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/r/${slug || "preview"}`;

  useEffect(() => {
    let mounted = true;

    async function initQR() {
      if (typeof window === "undefined") return;

      const QRCodeStylingLib = (await import("qr-code-styling")).default;

      // When a logo is present, force Error Correction Level to 'H' (30% recovery)
      const errorCorrectionLevel = styleConfig.logoUrl
        ? "H"
        : styleConfig.errorCorrectionLevel || "M";

      const options: QRCodeStylingOptions = {
        width: size,
        height: size,
        type: "svg",
        data: shortUrl,
        margin: styleConfig.imageOptions?.margin ?? 6,
        qrOptions: {
          errorCorrectionLevel,
        },
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
      };

      if (!qrCodeRef.current) {
        const qr = new QRCodeStylingLib(options);
        qrCodeRef.current = qr;
        if (containerRef.current && mounted) {
          containerRef.current.innerHTML = "";
          qr.append(containerRef.current);
          if (onInstanceReady) onInstanceReady(qr);
        }
      } else {
        qrCodeRef.current.update(options);
      }

      if (mounted) {
        setIsInitializing(false);
      }
    }

    initQR();

    return () => {
      mounted = false;
    };
  }, [slug, styleConfig, size, shortUrl, onInstanceReady]);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-white p-4 shadow-sm transition-all dark:bg-slate-900 ${className}`}
      style={{ width: size + 32, height: size + 32 }}
    >
      {isInitializing && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}
      <div ref={containerRef} className="flex items-center justify-center" />
    </div>
  );
}
