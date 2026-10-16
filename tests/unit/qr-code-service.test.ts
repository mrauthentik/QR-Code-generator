import { describe, it, expect, vi, beforeEach } from "vitest";
import { QRCodeService } from "@/features/qr-codes/services/qr-code.service";
import { ConflictError, UnsafeUrlError, NotFoundError } from "@/lib/errors";
import type { QRCodesRepository } from "@/server/repositories/qr-codes.repo";
import type { ISlugCache } from "@/server/cache/slug-cache";

describe("QRCodeService Business Logic", () => {
  let mockRepo: Partial<QRCodesRepository>;
  let mockCache: ISlugCache;
  let service: QRCodeService;

  beforeEach(() => {
    mockRepo = {
      checkSlugExists: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockImplementation((payload) =>
        Promise.resolve({
          id: "mock-qr-id",
          owner_id: payload.owner_id,
          slug: payload.slug,
          name: payload.name,
          destination_url: payload.destination_url,
          status: payload.status || "active",
          style: payload.style || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        })
      ),
      findById: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    };

    mockCache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      invalidate: vi.fn().mockResolvedValue(undefined),
    };

    service = new QRCodeService(mockRepo as QRCodesRepository, mockCache);
  });

  it("should create a QR code with an auto-generated collision-safe slug", async () => {
    const res = await service.createQRCode("user-1", {
      name: "Campaign 1",
      destinationUrl: "https://example.com/target",
    });

    expect(res.id).toBe("mock-qr-id");
    expect(res.destinationUrl).toBe("https://example.com/target");
    expect(res.slug).toBeDefined();
    expect(res.slug.length).toBeGreaterThanOrEqual(7);
    expect(mockRepo.create).toHaveBeenCalledTimes(1);
  });

  it("should reject creation if destination URL is an internal private IP", async () => {
    await expect(
      service.createQRCode("user-1", {
        name: "Malicious Campaign",
        destinationUrl: "http://192.168.1.1/admin",
      })
    ).rejects.toThrow(UnsafeUrlError);
  });

  it("should reject creation if custom slug already exists", async () => {
    mockRepo.checkSlugExists = vi.fn().mockResolvedValue(true);

    await expect(
      service.createQRCode("user-1", {
        name: "Duplicate Slug Campaign",
        destinationUrl: "https://example.com/target",
        customSlug: "taken-slug",
      })
    ).rejects.toThrow(ConflictError);
  });

  it("should update destination URL and invalidate cache", async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: "qr-123",
      owner_id: "user-1",
      slug: "promo26",
      name: "Old Name",
      destination_url: "https://old.com",
      status: "active",
      style: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    mockRepo.update = vi.fn().mockResolvedValue({
      id: "qr-123",
      owner_id: "user-1",
      slug: "promo26",
      name: "New Name",
      destination_url: "https://new.com",
      status: "active",
      style: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    const updated = await service.updateQRCode("qr-123", "user-1", {
      name: "New Name",
      destinationUrl: "https://new.com",
    });

    expect(updated.destinationUrl).toBe("https://new.com");
    expect(mockCache.invalidate).toHaveBeenCalledWith("promo26");
  });

  it("should throw NotFoundError when updating non-existent QR code", async () => {
    mockRepo.findById = vi.fn().mockResolvedValue(null);

    await expect(
      service.updateQRCode("non-existent-id", "user-1", {
        destinationUrl: "https://new.com",
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("should soft delete QR code and invalidate slug in cache", async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: "qr-to-delete",
      owner_id: "user-1",
      slug: "del-slug",
      destination_url: "https://target.com",
      status: "active",
      style: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    });

    await service.deleteQRCode("qr-to-delete", "user-1");

    expect(mockRepo.softDelete).toHaveBeenCalledWith("qr-to-delete", "user-1");
    expect(mockCache.invalidate).toHaveBeenCalledWith("del-slug");
  });
});
