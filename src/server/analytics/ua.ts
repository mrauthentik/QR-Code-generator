import { UAParser } from "ua-parser-js";

export interface ParsedUserAgent {
  deviceType: "mobile" | "tablet" | "desktop" | "other";
  os: string | null;
  browser: string | null;
}

/**
 * Parses raw User-Agent string into normalized device type, operating system, and browser
 */
export function parseUserAgentString(rawUa?: string | null): ParsedUserAgent {
  if (!rawUa || typeof rawUa !== "string" || !rawUa.trim()) {
    return {
      deviceType: "other",
      os: null,
      browser: null,
    };
  }

  const parser = new UAParser(rawUa);
  const device = parser.getDevice();
  const os = parser.getOS();
  const browser = parser.getBrowser();

  // Normalize device type
  let deviceType: ParsedUserAgent["deviceType"] = "desktop";
  const rawType = (device.type || "").toLowerCase();

  if (rawType === "mobile") {
    deviceType = "mobile";
  } else if (rawType === "tablet") {
    deviceType = "tablet";
  } else if (!rawType) {
    // If device type is not explicitly detected, check if OS is mobile
    const osName = (os.name || "").toLowerCase();
    if (osName === "ios" || osName === "android") {
      deviceType = "mobile";
    } else {
      deviceType = "desktop";
    }
  } else {
    deviceType = "other";
  }

  return {
    deviceType,
    os: os.name ? `${os.name}${os.version ? ` ${os.version}` : ""}`.trim() : null,
    browser: browser.name
      ? `${browser.name}${browser.version ? ` ${browser.version.split(".")[0]}` : ""}`.trim()
      : null,
  };
}
