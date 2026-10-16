import { serverEnv } from "@/lib/env.server";
import { logger } from "@/lib/logger";

export interface CachedSlugData {
  id: string;
  destination_url: string;
  status: string;
}

export interface ISlugCache {
  get(slug: string): Promise<CachedSlugData | null>;
  set(slug: string, data: CachedSlugData, ttlSeconds?: number): Promise<void>;
  invalidate(slug: string): Promise<void>;
}

/**
 * In-memory fallback cache for development and test environments
 */
export class MemorySlugCache implements ISlugCache {
  private static store = new Map<string, { data: CachedSlugData; expiresAt: number }>();

  async get(slug: string): Promise<CachedSlugData | null> {
    const entry = MemorySlugCache.store.get(slug);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      MemorySlugCache.store.delete(slug);
      return null;
    }
    return entry.data;
  }

  async set(slug: string, data: CachedSlugData, ttlSeconds: number = 300): Promise<void> {
    MemorySlugCache.store.set(slug, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async invalidate(slug: string): Promise<void> {
    MemorySlugCache.store.delete(slug);
  }

  static clear(): void {
    MemorySlugCache.store.clear();
  }
}

import { Redis } from "@upstash/redis";

/**
 * Distributed Upstash Redis slug cache implementation
 */
export class UpstashSlugCache implements ISlugCache {
  private redisClient: Redis | null = null;

  constructor() {
    if (serverEnv.UPSTASH_REDIS_REST_URL && serverEnv.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.redisClient = new Redis({
          url: serverEnv.UPSTASH_REDIS_REST_URL,
          token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
        });
      } catch (err) {
        logger.warn("Failed to initialize Upstash Redis slug cache, using memory fallback", { err });
      }
    }
  }

  async get(slug: string): Promise<CachedSlugData | null> {
    if (!this.redisClient) {
      return memoryCache.get(slug);
    }

    try {
      return await this.redisClient.get<CachedSlugData>(`slug:${slug}`);
    } catch (err) {
      logger.warn("Error reading from Redis slug cache, degrading to DB", { slug, err });
      return null;
    }
  }

  async set(slug: string, data: CachedSlugData, ttlSeconds: number = 300): Promise<void> {
    if (!this.redisClient) {
      return memoryCache.set(slug, data, ttlSeconds);
    }

    try {
      await this.redisClient.set(`slug:${slug}`, data, { ex: ttlSeconds });
    } catch (err) {
      logger.warn("Failed to write to Redis slug cache", { slug, err });
    }
  }

  async invalidate(slug: string): Promise<void> {
    if (!this.redisClient) {
      return memoryCache.invalidate(slug);
    }

    try {
      await this.redisClient.del(`slug:${slug}`);
    } catch (err) {
      logger.warn("Failed to invalidate Redis slug cache", { slug, err });
    }
  }
}

const memoryCache = new MemorySlugCache();
let defaultCache: ISlugCache | null = null;

export function getSlugCache(): ISlugCache {
  if (!defaultCache) {
    if (serverEnv.UPSTASH_REDIS_REST_URL && serverEnv.UPSTASH_REDIS_REST_TOKEN) {
      defaultCache = new UpstashSlugCache();
    } else {
      defaultCache = memoryCache;
    }
  }
  return defaultCache;
}
