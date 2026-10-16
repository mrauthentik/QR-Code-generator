import { describe, it, expect } from "vitest";
import {
  createQRCodeSchema,
  updateQRCodeSchema,
  qrStyleSchema,
} from "@/features/qr-codes/schemas/qr-code.schema";

describe("QR Code Validation Schemas", () => {
  it("should validate a valid QR creation payload", () => {
    const valid = {
      name: "Spring Sale 2026",
      destinationUrl: "https://example.com/spring-sale",
      customSlug: "spring26",
      style: {
        dotsOptions: { color: "#2563eb", type: "rounded" },
        cornersSquareOptions: { color: "#1e40af", type: "extra-rounded" },
      },
    };

    const result = createQRCodeSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("should reject invalid URLs", () => {
    const invalid = {
      name: "Bad URL",
      destinationUrl: "not-a-valid-url",
    };

    const result = createQRCodeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject reserved slugs in creation payload", () => {
    const reserved = {
      name: "Reserved",
      destinationUrl: "https://example.com",
      customSlug: "admin",
    };

    const result = createQRCodeSchema.safeParse(reserved);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.customSlug).toBeDefined();
    }
  });

  it("should validate style color hex format", () => {
    const badColor = {
      dotsOptions: { color: "blue" }, // not hex
    };
    expect(qrStyleSchema.safeParse(badColor).success).toBe(false);

    const goodColor = {
      dotsOptions: { color: "#3b82f6" },
    };
    expect(qrStyleSchema.safeParse(goodColor).success).toBe(true);
  });

  it("should validate partial updates", () => {
    const update = {
      destinationUrl: "https://newdestination.com",
      status: "paused" as const,
    };
    expect(updateQRCodeSchema.safeParse(update).success).toBe(true);
  });
});
