/**
 * System Constants, Reserved Slugs, and Default Configurations
 */

export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "callback",
  "cron",
  "dashboard",
  "docs",
  "favicon.ico",
  "health",
  "login",
  "logout",
  "privacy",
  "r",
  "robots.txt",
  "settings",
  "signin",
  "signup",
  "sitemap.xml",
  "static",
  "terms",
  "webhook",
  "well-known",
]);

export const SLUG_REGEX = /^[a-zA-Z0-9_-]{3,16}$/;
export const MAX_URL_LENGTH = 2048;
export const DEFAULT_SLUG_LENGTH = 7;

export const DEFAULT_QR_STYLE = {
  dotsOptions: {
    color: "#0f172a",
    type: "rounded" as const,
  },
  cornersSquareOptions: {
    color: "#2563eb",
    type: "extra-rounded" as const,
  },
  cornersDotOptions: {
    color: "#2563eb",
    type: "dot" as const,
  },
  backgroundOptions: {
    color: "#ffffff",
  },
  imageOptions: {
    hideBackgroundDots: true,
    imageSize: 0.35,
    margin: 4,
  },
  errorCorrectionLevel: "H" as const,
};

export const RATE_LIMITS = {
  REDIRECT_PER_MINUTE: 120,
  CREATE_PER_MINUTE: 30,
};
