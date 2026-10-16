import "server-only";
import { isBotOrCrawler } from "./bot-filter";
import { parseUserAgentString } from "./ua";
import { calculateVisitorHash } from "@/server/security/ip-hash";
import { ScansRepository } from "@/server/repositories/scans.repo";
import { getAdminClient } from "@/server/db/admin";
import { logger } from "@/lib/logger";

export interface ScanRecordingContext {
  qrId: string;
  slug: string;
  method: string;
  headers: Headers | Record<string, string>;
}

function getHeader(headers: Headers | Record<string, string>, name: string): string | null {
  if (headers instanceof Headers) {
    return headers.get(name);
  }
  const key = Object.keys(headers).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  return key ? headers[key] : null;
}

function extractClientIp(headers: Headers | Record<string, string>): string {
  // Check standard reverse proxy headers in priority order
  const xForwardedFor = getHeader(headers, "x-forwarded-for");
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  const cfConnectingIp = getHeader(headers, "cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  const xRealIp = getHeader(headers, "x-real-ip");
  if (xRealIp) return xRealIp.trim();

  return "127.0.0.1";
}

function extractReferrerHost(headers: Headers | Record<string, string>): string | null {
  const referer = getHeader(headers, "referer");
  if (!referer) return null;

  try {
    const url = new URL(referer);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Background scan recorder executed inside Next.js `after()`.
 * Completely isolated from the HTTP response pipeline.
 * Failures are safely caught, logged with full diagnostic context, and never surfaced to the end user.
 */
export async function recordScanInBackground(context: ScanRecordingContext): Promise<void> {
  const { qrId, slug, method, headers } = context;

  try {
    const userAgent = getHeader(headers, "user-agent");
    const purpose = getHeader(headers, "purpose");
    const secPurpose = getHeader(headers, "sec-purpose");

    // 1. Discard bots, search indexers, link unfurlers, and browser prefetches
    if (
      isBotOrCrawler({
        userAgent,
        method,
        purposeHeader: purpose,
        secPurposeHeader: secPurpose,
      })
    ) {
      logger.debug("Scan telemetry skipped for bot or prefetch", { slug, method, userAgent });
      return;
    }

    // 2. Extract client IP and compute privacy-preserving daily HMAC hash
    const clientIp = extractClientIp(headers);
    const visitorHash = calculateVisitorHash(clientIp, userAgent || "");

    // 3. Extract geographic headers (native to Vercel, with Cloudflare fallback)
    const country =
      getHeader(headers, "x-vercel-ip-country") ||
      getHeader(headers, "cf-ipcountry") ||
      null;
    const region = getHeader(headers, "x-vercel-ip-country-region") || null;
    const city = getHeader(headers, "x-vercel-ip-city") || null;

    // 4. Parse user agent (device type, operating system, browser)
    const { deviceType, os, browser } = parseUserAgentString(userAgent);

    // 5. Extract referrer hostname
    const referrerHost = extractReferrerHost(headers);

    // 6. Persist to Postgres via ScansRepository with isolated service-role admin client
    const adminDb = getAdminClient();
    const scansRepo = new ScansRepository(adminDb);

    await scansRepo.recordScan({
      qr_id: qrId,
      visitor_hash: visitorHash,
      country: country ? country.toUpperCase().slice(0, 2) : null,
      region: region ? region.slice(0, 100) : null,
      city: city ? city.slice(0, 100) : null,
      device_type: deviceType,
      os: os ? os.slice(0, 50) : null,
      browser: browser ? browser.slice(0, 50) : null,
      referrer_host: referrerHost ? referrerHost.slice(0, 255) : null,
    });

    logger.info("Scan recorded successfully in background", {
      slug,
      qrId,
      country,
      deviceType,
      os,
      browser,
    });
  } catch (error: unknown) {
    // Non-blocking telemetry guarantee: log error with full context and suppress exception
    logger.error("Failed to record scan telemetry in after()", error, {
      qrId,
      slug,
      method,
    });
  }
}
