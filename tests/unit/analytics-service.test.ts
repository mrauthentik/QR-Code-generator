import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnalyticsService } from "@/features/analytics/services/analytics.service";
import { NotFoundError } from "@/lib/errors";
import type { QRCodesRepository } from "@/server/repositories/qr-codes.repo";
import type { ScansRepository } from "@/server/repositories/scans.repo";
import type { RollupsRepository } from "@/server/repositories/rollups.repo";

describe("AnalyticsService", () => {
  let mockQRRepo: Partial<QRCodesRepository>;
  let mockScansRepo: Partial<ScansRepository>;
  let mockRollupsRepo: Partial<RollupsRepository>;
  let service: AnalyticsService;

  beforeEach(() => {
    mockQRRepo = {
      findById: vi.fn(),
      listByOwner: vi.fn(),
    };
    mockScansRepo = {
      getScansForQRsSince: vi.fn().mockResolvedValue([]),
      getAllScansForExport: vi.fn().mockResolvedValue([]),
    };
    mockRollupsRepo = {
      getDestinationHistory: vi.fn().mockResolvedValue([]),
    };

    service = new AnalyticsService(
      mockQRRepo as QRCodesRepository,
      mockScansRepo as ScansRepository,
      mockRollupsRepo as RollupsRepository
    );
  });

  it("should throw NotFoundError if QR code does not exist or user is not owner", async () => {
    vi.mocked(mockQRRepo.findById!).mockResolvedValue(null);

    await expect(
      service.getQRAnalytics("non-existent", "user-1", "7d")
    ).rejects.toThrow(NotFoundError);
  });

  it("should compute accurate 24h hourly analytics from raw scans", async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    vi.mocked(mockQRRepo.findById!).mockResolvedValue({
      id: "qr-1",
      owner_id: "user-1",
      slug: "promo26",
      name: "Promo 26",
      destination_url: "https://target.com",
      status: "active",
      style: {},
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      deleted_at: null,
    });

    vi.mocked(mockScansRepo.getScansForQRsSince!).mockResolvedValue([
      {
        id: 1,
        qr_id: "qr-1",
        scanned_at: oneHourAgo,
        country: "US",
        region: "NY",
        city: "New York",
        device_type: "mobile",
        os: "iOS",
        browser: "Mobile Safari",
        referrer_host: "instagram.com",
        visitor_hash: "visitor-A",
        is_unique_in_day: true,
      },
      {
        id: 2,
        qr_id: "qr-1",
        scanned_at: oneHourAgo,
        country: "US",
        region: "NY",
        city: "New York",
        device_type: "mobile",
        os: "iOS",
        browser: "Mobile Safari",
        referrer_host: "instagram.com",
        visitor_hash: "visitor-A", // duplicate scan by visitor A
        is_unique_in_day: false,
      },
      {
        id: 3,
        qr_id: "qr-1",
        scanned_at: twoHoursAgo,
        country: "GB",
        region: "ENG",
        city: "London",
        device_type: "desktop",
        os: "macOS",
        browser: "Chrome",
        referrer_host: null,
        visitor_hash: "visitor-B",
        is_unique_in_day: true,
      },
    ]);

    const summary = await service.getQRAnalytics("qr-1", "user-1", "24h");

    expect(summary.totalScans).toBe(3);
    expect(summary.uniqueVisitors).toBe(2);
    expect(summary.slug).toBe("promo26");

    // Check device breakdown
    const mobile = summary.devices.find((d) => d.name === "mobile");
    const desktop = summary.devices.find((d) => d.name === "desktop");
    expect(mobile?.count).toBe(2);
    expect(mobile?.percentage).toBe(67);
    expect(desktop?.count).toBe(1);
    expect(desktop?.percentage).toBe(33);

    // Check country breakdown
    expect(summary.countries[0].name).toBe("US");
    expect(summary.countries[0].count).toBe(2);
    expect(summary.countries[1].name).toBe("GB");
    expect(summary.countries[1].count).toBe(1);
  });

  it("should return empty metrics for global analytics when user has no QR codes", async () => {
    vi.mocked(mockQRRepo.listByOwner!).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 1000,
    });

    const summary = await service.getGlobalAnalytics("user-without-qrs", "7d");

    expect(summary.totalScans).toBe(0);
    expect(summary.uniqueVisitors).toBe(0);
    expect(summary.timeSeries).toHaveLength(0);
    expect(summary.devices).toHaveLength(0);
  });
});
