import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, HEAD, POST, PUT, DELETE } from "@/app/r/[slug]/route";
import { getSlugCache, MemorySlugCache } from "@/server/cache/slug-cache";
import * as adminModule from "@/server/db/admin";

// Mock next/server 'after' to immediately execute or capture the background task
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn((fn: () => Promise<void>) => {
      // Execute asynchronously without blocking
      fn().catch(() => {});
    }),
  };
});

describe("The Sacred Redirect Route: GET /r/[slug]", () => {
  const mockFindActiveBySlug = vi.fn();
  const mockRecordScan = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    MemorySlugCache.clear();

    // Mock admin client database interactions
    vi.spyOn(adminModule, "getAdminClient").mockReturnValue({
      rpc: mockFindActiveBySlug,
      from: vi.fn().mockReturnValue({
        insert: mockRecordScan.mockResolvedValue({ error: null }),
      }),
    } as unknown as ReturnType<typeof adminModule.getAdminClient>);
  });

  function createRequest(url: string, method: string = "GET", headers: Record<string, string> = {}): NextRequest {
    return new NextRequest(new URL(url, "http://localhost:3000"), {
      method,
      headers: {
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile Safari",
        "x-forwarded-for": "203.0.113.195",
        "x-vercel-ip-country": "US",
        "x-vercel-ip-city": "San Francisco",
        ...headers,
      },
    });
  }

  it("should return HTTP 302 with Cache-Control: no-store for an active QR code", async () => {
    mockFindActiveBySlug.mockResolvedValue({
      data: [
        {
          qr_id: "qr-uuid-1",
          destination_url: "https://example.com/summer-sale",
          status: "active",
        },
      ],
      error: null,
    });

    const request = createRequest("/r/summer26");
    const response = await GET(request, {
      params: Promise.resolve({ slug: "summer26" }),
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://example.com/summer-sale");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer-when-downgrade");
  });

  it("should resolve from cache on cache hit without invoking DB", async () => {
    const cache = getSlugCache();
    await cache.set("cached-slug", {
      id: "qr-cached-id",
      destination_url: "https://cached-target.com",
      status: "active",
    });

    const request = createRequest("/r/cached-slug");
    const response = await GET(request, {
      params: Promise.resolve({ slug: "cached-slug" }),
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://cached-target.com");
    // DB RPC should NOT be called on cache hit
    expect(mockFindActiveBySlug).not.toHaveBeenCalled();
  });

  it("should return 404 branded page for an invalid slug format", async () => {
    const request = createRequest("/r/ab"); // < 3 characters
    const response = await GET(request, {
      params: Promise.resolve({ slug: "ab" }),
    });

    expect(response.status).toBe(404);
    const html = await response.text();
    expect(html).toContain("QR Code Not Found");
  });

  it("should return 404 branded page when slug is not found in DB", async () => {
    mockFindActiveBySlug.mockResolvedValue({
      data: [],
      error: null,
    });

    const request = createRequest("/r/non-existent");
    const response = await GET(request, {
      params: Promise.resolve({ slug: "non-existent" }),
    });

    expect(response.status).toBe(404);
    const html = await response.text();
    expect(html).toContain("QR Code Not Found");
  });

  it("should return 403 branded page when QR code is paused", async () => {
    mockFindActiveBySlug.mockResolvedValue({
      data: [
        {
          qr_id: "qr-paused-id",
          destination_url: "https://example.com/target",
          status: "paused",
        },
      ],
      error: null,
    });

    const request = createRequest("/r/paused-code");
    const response = await GET(request, {
      params: Promise.resolve({ slug: "paused-code" }),
    });

    expect(response.status).toBe(403);
    const html = await response.text();
    expect(html).toContain("Campaign Paused");
  });

  it("should return 410 branded page when QR code is archived", async () => {
    mockFindActiveBySlug.mockResolvedValue({
      data: [
        {
          qr_id: "qr-archived-id",
          destination_url: "https://example.com/target",
          status: "archived",
        },
      ],
      error: null,
    });

    const request = createRequest("/r/archived-code");
    const response = await GET(request, {
      params: Promise.resolve({ slug: "archived-code" }),
    });

    expect(response.status).toBe(410);
    const html = await response.text();
    expect(html).toContain("QR Code Expired");
  });

  it("should handle HEAD requests with 302 and correct Location header", async () => {
    mockFindActiveBySlug.mockResolvedValue({
      data: [
        {
          qr_id: "qr-head-id",
          destination_url: "https://example.com/head-target",
          status: "active",
        },
      ],
      error: null,
    });

    const request = createRequest("/r/head-test", "HEAD");
    const response = await HEAD(request, {
      params: Promise.resolve({ slug: "head-test" }),
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://example.com/head-target");
  });

  it("should reject disallowed methods with HTTP 405 Method Not Allowed", async () => {
    const postRes = await POST();
    expect(postRes.status).toBe(405);
    expect(postRes.headers.get("Allow")).toBe("GET, HEAD");

    const putRes = await PUT();
    expect(putRes.status).toBe(405);

    const delRes = await DELETE();
    expect(delRes.status).toBe(405);
  });

  it("should return 503 when the database throws an unrecoverable connection error", async () => {
    mockFindActiveBySlug.mockResolvedValue({
      data: null,
      error: { message: "connection refused" },
    });

    const request = createRequest("/r/db-error-slug");
    const response = await GET(request, {
      params: Promise.resolve({ slug: "db-error-slug" }),
    });

    expect(response.status).toBe(503);
    const html = await response.text();
    expect(html).toContain("Service Unavailable");
  });
});
