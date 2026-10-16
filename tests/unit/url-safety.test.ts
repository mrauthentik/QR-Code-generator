import { describe, it, expect } from "vitest";
import { validateDestinationUrl } from "@/server/security/url-safety";
import { UnsafeUrlError } from "@/lib/errors";

describe("Destination URL Safety Engine", () => {
  it("should accept valid public HTTPS and HTTP URLs", async () => {
    const validHttps = "https://example.com/products?ref=qr";
    const res1 = await validateDestinationUrl(validHttps);
    expect(res1).toBe(validHttps);

    const validHttp = "http://example.org/blog/post-1";
    const res2 = await validateDestinationUrl(validHttp);
    expect(res2).toBe(validHttp);
  });

  it("should reject disallowed protocols like javascript:, data:, and file:", async () => {
    await expect(validateDestinationUrl("javascript:alert(1)")).rejects.toThrow(UnsafeUrlError);
    await expect(validateDestinationUrl("data:text/html,<b>pwned</b>")).rejects.toThrow(UnsafeUrlError);
    await expect(validateDestinationUrl("file:///etc/passwd")).rejects.toThrow(UnsafeUrlError);
    await expect(validateDestinationUrl("ftp://ftp.example.com/file")).rejects.toThrow(UnsafeUrlError);
  });

  it("should reject URLs containing embedded credentials", async () => {
    await expect(validateDestinationUrl("https://admin:secret@example.com")).rejects.toThrow(UnsafeUrlError);
  });

  it("should reject localhost and .local destinations", async () => {
    await expect(validateDestinationUrl("http://localhost:8080")).rejects.toThrow(UnsafeUrlError);
    await expect(validateDestinationUrl("http://api.localhost")).rejects.toThrow(UnsafeUrlError);
    await expect(validateDestinationUrl("http://printer.local/status")).rejects.toThrow(UnsafeUrlError);
  });

  it("should reject private RFC 1918 and loopback IP addresses", async () => {
    await expect(validateDestinationUrl("http://127.0.0.1:3000")).rejects.toThrow(UnsafeUrlError);
    await expect(validateDestinationUrl("http://10.0.0.5/internal")).rejects.toThrow(UnsafeUrlError);
    await expect(validateDestinationUrl("http://192.168.1.1/admin")).rejects.toThrow(UnsafeUrlError);
    await expect(validateDestinationUrl("http://172.16.0.100")).rejects.toThrow(UnsafeUrlError);
    await expect(validateDestinationUrl("http://169.254.169.254/latest/meta-data/")).rejects.toThrow(UnsafeUrlError);
  });

  it("should reject self-domain loops", async () => {
    await expect(validateDestinationUrl("http://localhost:3000/r/another-slug")).rejects.toThrow(UnsafeUrlError);
  });

  it("should reject URLs exceeding max length limit", async () => {
    const longUrl = "https://example.com/" + "a".repeat(2050);
    await expect(validateDestinationUrl(longUrl)).rejects.toThrow(UnsafeUrlError);
  });
});
