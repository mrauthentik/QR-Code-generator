import { describe, it, expect, beforeEach } from "vitest";
import {
  MemoryRateLimiter,
  checkMutationRateLimit,
  checkRedirectRateLimit,
} from "@/server/security/rate-limit";
import { RateLimitError } from "@/lib/errors";

describe("Rate Limiting Engine", () => {
  beforeEach(() => {
    MemoryRateLimiter.clear();
  });

  it("should allow requests within rate limit threshold", async () => {
    const limiter = new MemoryRateLimiter();
    const res1 = await limiter.limit("test-user-1", 5, 60);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(4);

    const res2 = await limiter.limit("test-user-1", 5, 60);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(3);
  });

  it("should reject requests when threshold is exceeded", async () => {
    const limiter = new MemoryRateLimiter();
    for (let i = 0; i < 3; i++) {
      const res = await limiter.limit("test-user-exceeded", 3, 60);
      expect(res.success).toBe(true);
    }

    const blocked = await limiter.limit("test-user-exceeded", 3, 60);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("checkMutationRateLimit should throw RateLimitError when limit breached (fail-closed)", async () => {
    const limiter = new MemoryRateLimiter();
    // Fill up quota
    for (let i = 0; i < 30; i++) {
      await limiter.limit("ratelimit:mutation:user-abc", 30, 60);
    }

    await expect(checkMutationRateLimit("user-abc", limiter)).rejects.toThrow(
      RateLimitError
    );
  });

  it("checkRedirectRateLimit should fail-open and return true on unexpected error", async () => {
    const brokenLimiter = {
      limit: async () => {
        throw new Error("Redis connection dropped");
      },
    };

    const allowed = await checkRedirectRateLimit("192.168.1.1", brokenLimiter);
    expect(allowed).toBe(true);
  });
});
