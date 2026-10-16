import { describe, it, expect } from "vitest";
import { calculateVisitorHash, getUtcDayString } from "@/server/security/ip-hash";

describe("Privacy-Preserving Visitor Hash", () => {
  it("should generate a 64-character SHA-256 hex string", () => {
    const hash = calculateVisitorHash("192.168.1.100", "Mozilla/5.0 (iPhone)");
    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
  });

  it("should be deterministic for the same IP, UA, and date", () => {
    const hash1 = calculateVisitorHash("203.0.113.1", "Mozilla/5.0", "2026-10-14");
    const hash2 = calculateVisitorHash("203.0.113.1", "Mozilla/5.0", "2026-10-14");
    expect(hash1).toBe(hash2);
  });

  it("should rotate and produce completely uncorrelated hashes across different days", () => {
    const day1Hash = calculateVisitorHash("203.0.113.1", "Mozilla/5.0", "2026-10-14");
    const day2Hash = calculateVisitorHash("203.0.113.1", "Mozilla/5.0", "2026-10-15");
    expect(day1Hash).not.toBe(day2Hash);
  });

  it("should produce different hashes for different IPs on the same day", () => {
    const userA = calculateVisitorHash("203.0.113.1", "Mozilla/5.0", "2026-10-14");
    const userB = calculateVisitorHash("203.0.113.2", "Mozilla/5.0", "2026-10-14");
    expect(userA).not.toBe(userB);
  });

  it("should return valid UTC day string format YYYY-MM-DD", () => {
    const now = new Date("2026-10-14T15:30:00Z");
    expect(getUtcDayString(now)).toBe("2026-10-14");
  });
});
