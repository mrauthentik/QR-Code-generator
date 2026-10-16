import { UnsafeUrlError } from "@/lib/errors";
import { MAX_URL_LENGTH } from "@/lib/constants";
import { clientEnv } from "@/lib/env.client";

export interface IUrlReputationChecker {
  check(url: string): Promise<boolean>;
}

export class PassiveReputationChecker implements IUrlReputationChecker {
  async check(_url: string): Promise<boolean> {
    // Default passive checker: in future phases, integrate Google Safe Browsing
    return true;
  }
}

/**
 * Checks if an IPv4 address is in private, link-local, or loopback ranges
 */
function isPrivateOrReservedIp(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  const [a, b] = parts;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (RFC 1918)
  if (a === 10) return true;
  // 172.16.0.0/12 (RFC 1918: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (RFC 1918)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-local)
  if (a === 169 && b === 254) return true;
  // 100.64.0.0/10 (Carrier-Grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 0.0.0.0/8
  if (a === 0) return true;

  return false;
}

/**
 * Validates destination URLs against protocol attacks, SSRF, loopbacks, and length limits
 */
export async function validateDestinationUrl(
  inputUrl: string,
  reputationChecker: IUrlReputationChecker = new PassiveReputationChecker()
): Promise<string> {
  const trimmed = inputUrl.trim();

  // 1. Length check
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) {
    throw new UnsafeUrlError(
      `URL length exceeds maximum limit of ${MAX_URL_LENGTH} characters.`
    );
  }

  // 2. Syntax & protocol parse
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new UnsafeUrlError("Invalid URL syntax.");
  }

  // 3. Scheme check: only http and https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError(
      `Disallowed URL protocol '${parsed.protocol}'. Only 'http:' and 'https:' are permitted.`
    );
  }

  // 4. Disallow embedded credentials
  if (parsed.username || parsed.password) {
    throw new UnsafeUrlError("URLs containing embedded credentials are not permitted.");
  }

  const hostname = parsed.hostname.toLowerCase();

  // 5. Disallow localhost and link-local hostnames
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    throw new UnsafeUrlError("Redirects to localhost or local network destinations are forbidden.");
  }

  // 6. Disallow IP-based private ranges
  if (isPrivateOrReservedIp(hostname)) {
    throw new UnsafeUrlError("Redirects to private or loopback IP ranges are forbidden.");
  }

  // 7. Self-domain loop prevention
  try {
    const appHost = new URL(clientEnv.NEXT_PUBLIC_APP_URL).hostname.toLowerCase();
    if (hostname === appHost) {
      throw new UnsafeUrlError("Redirects to the QR platform domain itself are prohibited to prevent loops.");
    }
  } catch {
    // If NEXT_PUBLIC_APP_URL is not parseable, proceed
  }

  // 8. Pluggable reputation check
  const isSafe = await reputationChecker.check(parsed.toString());
  if (!isSafe) {
    throw new UnsafeUrlError("Destination URL was flagged as potentially unsafe by security reputation checks.");
  }

  return parsed.toString();
}
