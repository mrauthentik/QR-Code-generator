import crypto from "node:crypto";
import { serverEnv } from "@/lib/env.server";

/**
 * Returns current UTC date string formatted as YYYY-MM-DD
 */
export function getUtcDayString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Calculates a privacy-preserving visitor hash that rotates every 24 hours at midnight UTC.
 * visitor_hash = HMAC-SHA256(secret, ip + user_agent + YYYY-MM-DD)
 *
 * This ensures:
 * 1. Zero raw IP storage
 * 2. Irreversible one-way cryptographic protection
 * 3. Daily unique visitor deduplication
 * 4. Impossibility of tracking visitors across distinct calendar days
 */
export function calculateVisitorHash(
  ip: string,
  userAgent: string,
  dateUtcString: string = getUtcDayString()
): string {
  const secret = serverEnv.VISITOR_HASH_SECRET;
  const normalizedIp = ip.trim().toLowerCase();
  const normalizedUa = (userAgent || "").trim();

  const payload = `${normalizedIp}|${normalizedUa}|${dateUtcString}`;

  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}
