import { describe, it, expect } from "vitest";
import { parseUserAgentString } from "@/server/analytics/ua";

describe("User-Agent Parsing Engine", () => {
  it("should parse iOS Safari User-Agent", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1";
    const res = parseUserAgentString(ua);

    expect(res.deviceType).toBe("mobile");
    expect(res.os).toContain("iOS");
    expect(res.browser).toContain("Safari");
  });

  it("should parse Android Chrome User-Agent", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36";
    const res = parseUserAgentString(ua);

    expect(res.deviceType).toBe("mobile");
    expect(res.os).toContain("Android");
    expect(res.browser).toContain("Chrome");
  });

  it("should parse Desktop macOS Chrome", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    const res = parseUserAgentString(ua);

    expect(res.deviceType).toBe("desktop");
    expect(res.os).toMatch(/macOS|Mac OS/i);
    expect(res.browser).toContain("Chrome");
  });

  it("should handle empty or null User-Agents gracefully", () => {
    expect(parseUserAgentString("")).toEqual({
      deviceType: "other",
      os: null,
      browser: null,
    });
    expect(parseUserAgentString(null)).toEqual({
      deviceType: "other",
      os: null,
      browser: null,
    });
  });
});
