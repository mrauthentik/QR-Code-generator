# ADR 005: Caching and Rate Limiting Architecture

## Context
The platform must serve high-throughput redirects while protecting against database connection starvation and malicious denial-of-service or scraping attacks.
We need:
1. Fast resolution of `slug -> { id, destination_url, status }`.
2. Rate limiting for QR code creation/modifications (to protect against spam/DB exhaustion).
3. Rate limiting for redirects (to protect against scrape storms without blocking real users).

## Decision
We introduce a lightweight caching and rate-limiting layer designed behind abstract interfaces:
- `ISlugCache`
- `IRateLimiter`

The default production provider uses **Upstash Redis** (serverless REST-based Redis client), with a transparent **In-Memory fallback** for local testing or when Redis credentials are not configured.

### Cache Policy
- **Key Scheme:** `slug:{slug}`
- **TTL:** 300 seconds (5 minutes).
- **Invalidation Strategy:** Explicit invalidation (`DEL slug:{slug}`) triggered immediately whenever a QR code is updated, paused, archived, or soft-deleted via server actions.
- **Fail-Open Policy on Cache Failure:** If Redis experiences downtime, network timeouts, or rate limits, the redirect handler logs a warning and queries PostgreSQL directly. Cache failure must never cause an HTTP 500 on the redirect route.

### Rate Limiting Policy
1. **Redirect Route (`GET /r/[slug]`):**
   - Policy: IP-based token bucket (120 req / 60 sec per `/24` IPv4 or `/48` IPv6 subnet).
   - Behavior: **Fail-Open**. If the rate limiter is unavailable or errors out, requests are allowed to proceed. Real users scanning physical codes must never be blocked due to an infrastructure telemetry failure.
2. **Mutation Operations (Create / Edit QR):**
   - Policy: User-ID based token bucket (30 mutations / 60 sec per user).
   - Behavior: **Fail-Closed**. If limit is exceeded, returns HTTP 429 Too Many Requests with retry headers.
