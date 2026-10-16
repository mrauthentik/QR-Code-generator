import { serverEnv } from "@/lib/env.server";
import { RATE_LIMITS } from "@/lib/constants";
import { RateLimitError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

export interface IRateLimiter {
  limit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<RateLimitResult>;
}

/**
 * In-memory sliding-window token bucket implementation.
 * Used for development, testing, or as a seamless fallback if Upstash Redis is not configured.
 */
export class MemoryRateLimiter implements IRateLimiter {
  private static store = new Map<string, { count: number; resetAt: number }>();

  async limit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = MemoryRateLimiter.store.get(key);

    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowSeconds * 1000;
      MemoryRateLimiter.store.set(key, { count: 1, resetAt });
      return {
        success: true,
        remaining: maxRequests - 1,
        resetTime: resetAt,
      };
    }

    if (entry.count < maxRequests) {
      entry.count += 1;
      return {
        success: true,
        remaining: maxRequests - entry.count,
        resetTime: entry.resetAt,
      };
    }

    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetAt,
    };
  }

  static clear(): void {
    MemoryRateLimiter.store.clear();
  }
}

import { Redis } from "@upstash/redis";

/**
 * Distributed Upstash Redis rate limiter.
 */
export class UpstashRateLimiter implements IRateLimiter {
  private redisClient: Redis | null = null;

  constructor() {
    if (serverEnv.UPSTASH_REDIS_REST_URL && serverEnv.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.redisClient = new Redis({
          url: serverEnv.UPSTASH_REDIS_REST_URL,
          token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
        });
      } catch (err) {
        logger.warn("Failed to initialize Upstash Redis rate limiter, using in-memory fallback", { err });
      }
    }
  }

  async limit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    if (!this.redisClient) {
      return memoryLimiter.limit(key, maxRequests, windowSeconds);
    }

    try {
      const pipe = this.redisClient.pipeline();
      pipe.incr(key);
      pipe.expire(key, windowSeconds);
      const results = await pipe.exec<[number, number]>();
      const count = Number(results[0]) || 0;

      const remaining = Math.max(0, maxRequests - count);
      return {
        success: count <= maxRequests,
        remaining,
        resetTime: Date.now() + windowSeconds * 1000,
      };
    } catch (err) {
      logger.warn("Upstash Redis error during rate limit check, falling back to memory", { err });
      return memoryLimiter.limit(key, maxRequests, windowSeconds);
    }
  }
}

const memoryLimiter = new MemoryRateLimiter();
let defaultLimiter: IRateLimiter | null = null;

export function getRateLimiter(): IRateLimiter {
  if (!defaultLimiter) {
    if (serverEnv.UPSTASH_REDIS_REST_URL && serverEnv.UPSTASH_REDIS_REST_TOKEN) {
      defaultLimiter = new UpstashRateLimiter();
    } else {
      defaultLimiter = memoryLimiter;
    }
  }
  return defaultLimiter;
}

/**
 * Rate limit check for mutations (create, update, delete).
 * Policy: FAIL-CLOSED. Throws RateLimitError if exceeded or abused.
 */
export async function checkMutationRateLimit(
  userId: string,
  limiter: IRateLimiter = getRateLimiter()
): Promise<void> {
  const key = `ratelimit:mutation:${userId}`;
  const result = await limiter.limit(key, RATE_LIMITS.CREATE_PER_MINUTE, 60);

  if (!result.success) {
    throw new RateLimitError(
      `Rate limit exceeded. Maximum ${RATE_LIMITS.CREATE_PER_MINUTE} mutations allowed per minute.`
    );
  }
}

/**
 * Rate limit check for sacred redirect path GET /r/[slug].
 * Policy: FAIL-OPEN. If rate limiter errors out, allow request through.
 */
export async function checkRedirectRateLimit(
  ip: string,
  limiter: IRateLimiter = getRateLimiter()
): Promise<boolean> {
  const key = `ratelimit:redirect:${ip.trim().toLowerCase()}`;
  try {
    const result = await limiter.limit(key, RATE_LIMITS.REDIRECT_PER_MINUTE, 60);
    return result.success;
  } catch (err) {
    logger.warn("Redirect rate limit check failed open", { ip, err });
    return true; // Fail-open invariant
  }
}
