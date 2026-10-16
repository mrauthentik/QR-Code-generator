import { describe, it, expect } from "vitest";
import { isBotOrCrawler } from "@/server/analytics/bot-filter";

describe("Bot & Crawler Detection", () => {
  it("should allow legitimate mobile scanners and desktop browsers", () => {
    // iPhone Mobile Safari (standard QR camera scan)
    const iphoneUa =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
    expect(isBotOrCrawler({ userAgent: iphoneUa, method: "GET" })).toBe(false);

    // Android Chrome (standard QR Google Lens / camera scan)
    const androidUa =
      "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36";
    expect(isBotOrCrawler({ userAgent: androidUa, method: "GET" })).toBe(false);

    // Desktop Chrome
    const desktopChrome =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    expect(isBotOrCrawler({ userAgent: desktopChrome, method: "GET" })).toBe(false);
  });

  it("should detect search engine bots", () => {
    expect(
      isBotOrCrawler({
        userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        method: "GET",
      })
    ).toBe(true);

    expect(
      isBotOrCrawler({
        userAgent: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
        method: "GET",
      })
    ).toBe(true);
  });

  it("should detect social media preview bots", () => {
    expect(
      isBotOrCrawler({
        userAgent: "Twitterbot/1.0",
        method: "GET",
      })
    ).toBe(true);

    expect(
      isBotOrCrawler({
        userAgent: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        method: "GET",
      })
    ).toBe(true);

    expect(
      isBotOrCrawler({
        userAgent: "WhatsApp/2.21.12.21 A",
        method: "GET",
      })
    ).toBe(true);
  });

  it("should discard HEAD requests regardless of User-Agent", () => {
    const iphoneUa = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)";
    expect(isBotOrCrawler({ userAgent: iphoneUa, method: "HEAD" })).toBe(true);
  });

  it("should discard browser prefetch requests", () => {
    const iphoneUa = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)";
    expect(
      isBotOrCrawler({
        userAgent: iphoneUa,
        method: "GET",
        purposeHeader: "prefetch",
      })
    ).toBe(true);

    expect(
      isBotOrCrawler({
        userAgent: iphoneUa,
        method: "GET",
        secPurposeHeader: "preview",
      })
    ).toBe(true);
  });

  it("should discard headless tools, scrapers, and CLI clients", () => {
    expect(isBotOrCrawler({ userAgent: "curl/8.4.0", method: "GET" })).toBe(true);
    expect(isBotOrCrawler({ userAgent: "python-requests/2.31.0", method: "GET" })).toBe(true);
    expect(
      isBotOrCrawler({
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
        method: "GET",
      })
    ).toBe(true);
  });
});
