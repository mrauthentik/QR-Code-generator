import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/health/route";
import { getAdminClient } from "@/server/db/admin";
import { getSlugCache } from "@/server/cache/slug-cache";

vi.mock("@/server/db/admin", () => ({
  getAdminClient: vi.fn(),
}));

vi.mock("@/server/cache/slug-cache", () => {
  class MockMemorySlugCache {
    async get() {
      return null;
    }
  }
  return {
    getSlugCache: vi.fn(() => new MockMemorySlugCache()),
    UpstashSlugCache: class {},
    MemorySlugCache: MockMemorySlugCache,
  };
});

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return HTTP 200 with status healthy when database is reachable", async () => {
    vi.mocked(getAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [{ id: "1" }], error: null }),
        }),
      }),
    } as any);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.checks.database.status).toBe("up");
    expect(body.checks.cache.status).toBe("up");
  });

  it("should return HTTP 503 with status degraded when database fails", async () => {
    vi.mocked(getAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "connection timeout" },
          }),
        }),
      }),
    } as any);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.checks.database.status).toBe("down");
    expect(body.checks.database.error).toBe("connection timeout");
  });
});
