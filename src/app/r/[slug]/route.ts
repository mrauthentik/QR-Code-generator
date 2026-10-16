import { after } from "next/server";
import type { NextRequest } from "next/server";
import { SLUG_REGEX } from "@/lib/constants";
import { getSlugCache } from "@/server/cache/slug-cache";
import { QRCodesRepository } from "@/server/repositories/qr-codes.repo";
import { getAdminClient } from "@/server/db/admin";
import { checkRedirectRateLimit } from "@/server/security/rate-limit";
import { recordScanInBackground } from "@/server/analytics/scan-recorder";
import { renderFallbackHtml } from "@/server/redirect/fallback-html";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

/**
 * The Sacred Redirect Route: GET /r/[slug]
 *
 * Invariants:
 * 1. Minimal, fast, deterministic response (< 40ms SLA).
 * 2. HTTP 302 Found with strict no-store cache headers.
 * 3. Cache lookup with DB fallback.
 * 4. Scan telemetry completely deferred to background via after().
 * 5. Telemetry or cache errors never surface or disrupt the redirect.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  // 1. Slug format validation: reject invalid formats immediately with 404
  if (!slug || !SLUG_REGEX.test(slug)) {
    return renderFallbackHtml({
      title: "QR Code Not Found",
      badge: "Not Found",
      message: "The QR code or short link you scanned does not exist or has an invalid format.",
      statusCode: 404,
    });
  }

  // 2. Abuse protection: per-IP rate limit with FAIL-OPEN guarantee
  const clientIp = getClientIp(request);
  const isAllowed = await checkRedirectRateLimit(clientIp);
  if (!isAllowed) {
    logger.warn("Redirect rate limit exceeded for IP", { ip: clientIp, slug });
    return renderFallbackHtml({
      title: "Too Many Requests",
      badge: "Rate Limit",
      message: "Too many scan attempts detected from your network. Please wait a moment and try again.",
      statusCode: 429,
    });
  }

  // 3. Resolve destination: Query Slug Cache (Upstash Redis / In-Memory)
  const cache = getSlugCache();
  let destination = await cache.get(slug);

  // 4. Cache Miss -> Query Database via isolated Admin Client
  if (!destination) {
    try {
      const adminDb = getAdminClient();
      const qrRepo = new QRCodesRepository(adminDb);
      destination = await qrRepo.findActiveBySlug(slug);

      if (destination) {
        // Populate cache with 5-minute TTL
        await cache.set(slug, destination, 300);
      }
    } catch (err: unknown) {
      logger.error("Database resolution error during redirect", err, { slug });
      return renderFallbackHtml({
        title: "Service Unavailable",
        badge: "503 Error",
        message: "The redirect service is momentarily unable to reach the database. Please try again shortly.",
        statusCode: 503,
      });
    }
  }

  // 5. Handle unknown or non-active states
  if (!destination) {
    return renderFallbackHtml({
      title: "QR Code Not Found",
      badge: "404 Error",
      message: "The dynamic QR code you scanned does not exist or may have been deleted.",
      statusCode: 404,
    });
  }

  if (destination.status === "paused") {
    return renderFallbackHtml({
      title: "Campaign Paused",
      badge: "Paused",
      message: "This QR code has been temporarily paused by its owner. Please check back later.",
      statusCode: 403,
    });
  }

  if (destination.status === "archived") {
    return renderFallbackHtml({
      title: "QR Code Expired",
      badge: "Expired",
      message: "This dynamic QR code has been archived and is no longer redirecting to its destination.",
      statusCode: 410,
    });
  }

  // 6. Schedule non-blocking telemetry ingestion post-response via after()
  const qrId = destination.id;
  const method = request.method;
  const headers = request.headers;

  after(async () => {
    await recordScanInBackground({
      qrId,
      slug,
      method,
      headers,
    });
  });

  // 7. Immediate HTTP 302 Found response
  return new Response(null, {
    status: 302,
    headers: {
      Location: destination.destination_url,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      "Referrer-Policy": "no-referrer-when-downgrade",
    },
  });
}

/**
 * Handle HEAD requests (same redirect headers as GET, but scan recording skipped)
 */
export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  return GET(request, context);
}

/**
 * Disallow unsupported HTTP methods on redirect endpoint
 */
export async function POST() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "GET, HEAD" },
  });
}

export async function PUT() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "GET, HEAD" },
  });
}

export async function DELETE() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "GET, HEAD" },
  });
}
