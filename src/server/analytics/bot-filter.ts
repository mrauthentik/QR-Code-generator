/**
 * Bot, Crawler, and Prefetch Detection Engine
 * Discards automated non-human scans (search bots, social link unfurlers, head requests, prefetches)
 */

const BOT_PATTERNS = [
  // Search engines & web crawlers
  /googlebot/i,
  /bingbot/i,
  /yandex/i,
  /duckduckbot/i,
  /baiduspider/i,
  /sogou/i,
  /exabot/i,
  /applebot/i,
  /ia_archiver/i,

  // Social media link preview crawlers
  /twitterbot/i,
  /facebookexternalhit/i,
  /facebot/i,
  /whatsapp/i,
  /slackbot/i,
  /discordbot/i,
  /telegrambot/i,
  /linkedinbot/i,
  /pinterest/i,
  /embedly/i,
  /quora link preview/i,
  /outbrain/i,
  /vkshare/i,
  /w3c_validator/i,

  // Headless browsers & automated testing tools
  /headlesschrome/i,
  /phantomjs/i,
  /puppeteer/i,
  /playwright/i,
  /selenium/i,
  /webdriver/i,

  // Developer HTTP clients & scraping utilities
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /python-urllib/i,
  /aiohttp/i,
  /httpx/i,
  /httpie/i,
  /postmanruntime/i,
  /insomnia/i,
  /go-http-client/i,
  /axios\//i,
  /node-fetch/i,
  /apache-httpclient/i,
  /java\//i,
  /libwww-perl/i,
  /zgrab/i,
  /censys/i,
  /shodan/i,
];

export interface BotFilterInput {
  userAgent?: string | null;
  method?: string;
  purposeHeader?: string | null;
  secPurposeHeader?: string | null;
}

/**
 * Determines whether an incoming scan request originates from a bot, crawler, or prefetch
 */
export function isBotOrCrawler(input: BotFilterInput): boolean {
  // 1. Skip HEAD requests (analytics only tracks GET user navigations)
  if (input.method && input.method.toUpperCase() === "HEAD") {
    return true;
  }

  // 2. Skip prefetch and preview requests sent by modern browsers
  const purpose = (input.purposeHeader || "").toLowerCase();
  const secPurpose = (input.secPurposeHeader || "").toLowerCase();
  if (
    purpose.includes("prefetch") ||
    purpose.includes("preview") ||
    secPurpose.includes("prefetch") ||
    secPurpose.includes("preview")
  ) {
    return true;
  }

  // 3. User-Agent inspection
  const ua = (input.userAgent || "").trim();
  if (!ua) {
    // Empty User-Agent on a public web redirect is almost exclusively non-browser automated scraping
    return true;
  }

  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(ua)) {
      return true;
    }
  }

  return false;
}
