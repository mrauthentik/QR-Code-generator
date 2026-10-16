import { describe, it, expect, vi } from "vitest";
import {
  generateCandidateSlug,
  isSlugAvailableForGeneration,
  generateCollisionSafeSlug,
} from "@/server/security/slug-generator";
import { SLUG_REGEX, RESERVED_SLUGS } from "@/lib/constants";
import { ConflictError } from "@/lib/errors";

describe("Slug Generator Utility", () => {
  it("should generate slugs that match SLUG_REGEX and omit ambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      const slug = generateCandidateSlug(7);
      expect(slug).toHaveLength(7);
      expect(SLUG_REGEX.test(slug)).toBe(true);
      // Ensure no ambiguous chars: 0, O, 1, l, I
      expect(slug).not.toMatch(/[0O1lI]/);
    }
  });

  it("should reject reserved slugs", () => {
    for (const reserved of Array.from(RESERVED_SLUGS)) {
      expect(isSlugAvailableForGeneration(reserved)).toBe(false);
    }
    expect(isSlugAvailableForGeneration("promo26")).toBe(true);
  });

  it("should return the first candidate when no collision occurs", async () => {
    const checkExistsMock = vi.fn().mockResolvedValue(false);
    const slug = await generateCollisionSafeSlug(checkExistsMock, { length: 8 });

    expect(slug).toHaveLength(8);
    expect(checkExistsMock).toHaveBeenCalledTimes(1);
  });

  it("should retry if a candidate collides in database", async () => {
    // First two attempts collide, third succeeds
    const checkExistsMock = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const slug = await generateCollisionSafeSlug(checkExistsMock, { maxRetries: 5 });
    expect(slug).toBeDefined();
    expect(checkExistsMock).toHaveBeenCalledTimes(3);
  });

  it("should throw ConflictError if max retries exceeded", async () => {
    const checkExistsMock = vi.fn().mockResolvedValue(true);
    await expect(
      generateCollisionSafeSlug(checkExistsMock, { maxRetries: 3 })
    ).rejects.toThrow(ConflictError);
  });
});
