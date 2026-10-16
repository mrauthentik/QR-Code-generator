import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createQRCodeAction,
  updateQRCodeAction,
  setQRCodeStatusAction,
  deleteQRCodeAction,
} from "@/features/qr-codes/actions/qr-code.actions";
import { AuthService } from "@/features/auth/services/auth.service";
import { QRCodeService } from "@/features/qr-codes/services/qr-code.service";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/server/db/client", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/server/repositories/qr-codes.repo", () => ({
  QRCodesRepository: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@/features/auth/services/auth.service", () => ({
  AuthService: {
    requireUser: vi.fn(),
  },
}));

vi.mock("@/features/qr-codes/services/qr-code.service", () => ({
  QRCodeService: vi.fn().mockImplementation(() => ({
    createQRCode: vi.fn(),
    updateQRCode: vi.fn(),
    setStatus: vi.fn(),
    deleteQRCode: vi.fn(),
  })),
}));

describe("QR Code Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AuthService.requireUser).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      userMetadata: {},
    });
  });

  describe("createQRCodeAction", () => {
    it("should return validation error if name is empty", async () => {
      const result = await createQRCodeAction({
        name: "",
        destinationUrl: "https://example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should return validation error if destinationUrl is invalid", async () => {
      const result = await createQRCodeAction({
        name: "Test QR",
        destinationUrl: "not-a-url",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should call QRCodeService.createQRCode and return model on valid input", async () => {
      const mockCreated = {
        id: "qr-1",
        ownerId: "user-123",
        slug: "abc1234",
        name: "Test QR",
        destinationUrl: "https://example.com",
        status: "active" as const,
        style: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockServiceInstance = {
        createQRCode: vi.fn().mockResolvedValue(mockCreated),
        updateQRCode: vi.fn(),
        setStatus: vi.fn(),
        deleteQRCode: vi.fn(),
      };
      vi.mocked(QRCodeService).mockImplementation(() => mockServiceInstance as unknown as QRCodeService);

      const result = await createQRCodeAction({
        name: "Test QR",
        destinationUrl: "https://example.com",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("qr-1");
        expect(result.data.name).toBe("Test QR");
      }
    });
  });

  describe("updateQRCodeAction", () => {
    it("should validate input and update QR code", async () => {
      const mockUpdated = {
        id: "qr-1",
        ownerId: "user-123",
        slug: "abc1234",
        name: "Updated Name",
        destinationUrl: "https://new.com",
        status: "active" as const,
        style: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockServiceInstance = {
        createQRCode: vi.fn(),
        updateQRCode: vi.fn().mockResolvedValue(mockUpdated),
        setStatus: vi.fn(),
        deleteQRCode: vi.fn(),
      };
      vi.mocked(QRCodeService).mockImplementation(() => mockServiceInstance as unknown as QRCodeService);

      const result = await updateQRCodeAction("qr-1", {
        name: "Updated Name",
        destinationUrl: "https://new.com",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Updated Name");
      }
    });
  });

  describe("setQRCodeStatusAction", () => {
    it("should toggle status via service", async () => {
      const mockUpdated = {
        id: "qr-1",
        ownerId: "user-123",
        slug: "abc1234",
        name: "Test QR",
        destinationUrl: "https://example.com",
        status: "paused" as const,
        style: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockServiceInstance = {
        createQRCode: vi.fn(),
        updateQRCode: vi.fn(),
        setStatus: vi.fn().mockResolvedValue(mockUpdated),
        deleteQRCode: vi.fn(),
      };
      vi.mocked(QRCodeService).mockImplementation(() => mockServiceInstance as unknown as QRCodeService);

      const result = await setQRCodeStatusAction("qr-1", "paused");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("paused");
      }
    });
  });

  describe("deleteQRCodeAction", () => {
    it("should soft delete via service", async () => {
      const mockServiceInstance = {
        createQRCode: vi.fn(),
        updateQRCode: vi.fn(),
        setStatus: vi.fn(),
        deleteQRCode: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(QRCodeService).mockImplementation(() => mockServiceInstance as unknown as QRCodeService);

      const result = await deleteQRCodeAction("qr-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
      }
    });
  });
});
