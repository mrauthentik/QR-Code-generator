import { describe, it, expect } from "vitest";
import { RESERVED_SLUGS, SLUG_REGEX, MAX_URL_LENGTH } from "@/lib/constants";

describe("System constants and validation rules", () => {
  it("should contain standard reserved paths", () => {
    expect(RESERVED_SLUGS.has("admin")).toBe(true);
    expect(RESERVED_SLUGS.has("api")).toBe(true);
    expect(RESERVED_SLUGS.has("r")).toBe(true);
    expect(RESERVED_SLUGS.has("dashboard")).toBe(true);
    expect(RESERVED_SLUGS.has("login")).toBe(true);
  });

  it("should validate allowed slug patterns", () => {
    expect(SLUG_REGEX.test("spring26")).toBe(true);
    expect(SLUG_REGEX.test("promo_123")).toBe(true);
    expect(SLUG_REGEX.test("valid-slug")).toBe(true);

    // Invalid: too short (<3)
    expect(SLUG_REGEX.test("ab")).toBe(false);
    // Invalid: too long (>16)
    expect(SLUG_REGEX.test("this-is-far-too-long-for-a-slug")).toBe(false);
    // Invalid: disallowed special characters
    expect(SLUG_REGEX.test("slug with spaces")).toBe(false);
    expect(SLUG_REGEX.test("slug$special")).toBe(false);
    expect(SLUG_REGEX.test("slug/slash")).toBe(false);
  });

  it("should enforce max URL length", () => {
    expect(MAX_URL_LENGTH).toBe(2048);
  });
});
