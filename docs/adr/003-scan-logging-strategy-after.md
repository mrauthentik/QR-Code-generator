# ADR 003: Scan Ingestion Strategy via Next.js `after()`

## Context
When a user scans a QR code, two competing priorities exist:
1. **Redirect speed:** The user must be redirected to their target destination as quickly as humanly possible (sacred path). Any latency introduced by analytics degrades user experience.
2. **Scan Telemetry Reliability:** Scan counts, location, device, and referrer must be accurately captured without data loss.

Architectural options considered:
1. *Synchronous Ingestion:* Await DB insert before returning 302.
2. *Client-side Beacons:* Redirect through an intermediate HTML/JS redirect page that fires `navigator.sendBeacon`.
3. *External Message Queue:* Push events to SQS/Kafka/Cloudflare Queues.
4. *Server-Side Post-Response Execution:* Return 302 response immediately, then perform telemetry enrichment and persistence in Next.js `after()`.

## Decision
We select **Option 4: Next.js `after()` API**.

## Rationale
- **Zero Redirect Delay:** The HTTP response (headers, status 302) is flushed and delivered to the network immediately upon slug resolution. The client begins navigating without waiting for geolocation parsing, user agent parsing, or Postgres insert.
- **Fail-Safe Decoupling:** If the database experiences a transient timeout, network hiccup, or contention, the error occurs inside the `after()` callback. The user's redirect has already completed successfully.
- **No Client Interstitial:** Client-side beaconing (Option 2) requires rendering an interstitial HTML page with JavaScript. This causes visible white flashes and completely breaks non-browser QR scanners that do not execute client-side JavaScript.
- **Low Operational Complexity:** Unlike Option 3 (Message Queue), Option 4 does not introduce external worker infrastructure, consumer scaling setups, or additional managed service fees for v1.

## Failure Handling
The scan recorder inside `after()` is wrapped in a top-level `try/catch` block:
- Exceptions are logged with full context (`slug`, `timestamp`, `error`, `requestId`) to the structured logger.
- The exception is never thrown upward or allowed to trigger unhandled rejection crashes.
