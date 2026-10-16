# ADR 001: HTTP Redirect Status Code: 302 vs 301

## Context
When a user or scanner device requests a dynamic QR code redirect endpoint (`GET /r/[slug]`), the server must redirect the client to the destination URL configured by the QR code's owner.

In HTTP semantics:
- **301 Moved Permanently:** Indicates the target resource has been assigned a new permanent URI. RFC 9110 specifies that clients and caching intermediaries may cache this response indefinitely unless explicit caching headers forbid it, and many browsers (and intermediate network proxies) cache 301 responses aggressively even ignoring weak cache headers.
- **302 Found (Temporary Redirect):** Indicates the target resource resides temporarily under a different URI. Clients must use the original URI for future requests.
- **307 Temporary Redirect:** Preserves the HTTP request method across the redirect.

## Decision
We choose **HTTP 302 Found** paired with explicit response headers:
```http
HTTP/1.1 302 Found
Location: <destination_url>
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0
Pragma: no-cache
Expires: 0
Referrer-Policy: no-referrer-when-downgrade
```

## Rationale
1. **Dynamic Re-pointing Invariant:** The core value proposition of a dynamic QR code platform is that the owner can update the destination URL at any time after the physical QR code has been printed. If a 301 status were returned, a user who previously scanned the code would have the original destination URL cached in their mobile browser cache. Subsequent scans on the same device would bypass our server completely, failing to redirect to the new destination.
2. **Scan Ingestion Guarantee:** Every scan must hit our server so that analytics telemetry (timestamp, location, device, referrer) can be logged. Caching at the browser, CDN, or mobile carrier level blinds our analytics engine.
3. **Compatibility:** HTTP 302 is universally supported across every mobile browser, QR scanner app (iOS Camera, Android Google Lens, specialized barcode apps), and web crawler without quirks.

## Consequences
- Every scan creates an HTTP round-trip to our redirect server.
- The server and caching layer must be engineered for ultra-low latency (<50ms target) to maintain an instant-loading user experience.
