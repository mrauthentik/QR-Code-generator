import { describe, it, expect } from "vitest";
import { Result } from "@/lib/result";

describe("Result pattern utility", () => {
  it("should create an Ok result", () => {
    const res = Result.ok({ slug: "test-slug" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.slug).toBe("test-slug");
    }
  });

  it("should create an Err result", () => {
    const res = Result.err(new Error("Slug conflict"));
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.message).toBe("Slug conflict");
    }
  });

  it("should map over Ok results without altering Err", () => {
    const ok = Result.ok(5);
    const mappedOk = Result.map(ok, (n) => n * 2);
    expect(Result.unwrap(mappedOk)).toBe(10);

    const err = Result.err(new Error("Failed"));
    const mappedErr = Result.map(err, (n: number) => n * 2);
    expect(mappedErr.success).toBe(false);
  });

  it("should throw on unwrap of Err result", () => {
    const err = Result.err(new Error("Unwrap error"));
    expect(() => Result.unwrap(err)).toThrow("Unwrap error");
  });
});
