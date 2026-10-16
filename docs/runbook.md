# QR Pulse — Operations & Engineering Runbook

Production operations, deployment guidelines, incident runbooks, and security procedures for the QR Pulse dynamic redirect and scan telemetry platform.

---

## 1. System Architecture & Routing Invariants

### 1.1 The Sacred Redirect Path (`GET /r/:slug`)
- **Latency Target**: Sub-40ms P95 response.
- **Status Code**: `302 Found` with `Cache-Control: no-store` (guarantees every physical scan hits the server to record telemetry).
- **Referrer Policy**: `no-referrer-when-downgrade` (passes origin data to target sites while preventing plain HTTP leakage).
- **Non-blocking Telemetry**: Scan telemetry ingestion occurs asynchronously inside Next.js `after()` with the service-role admin client. Failure in scan recording **never** impedes or delays user redirection.
- **Fault Tolerance**: If Redis is unreachable, queries degrade gracefully to Postgres. If rate limits encounter network faults, redirects **fail-open** (`checkRedirectRateLimit`).

```
[Smartphone Camera / Scanner]
             │
             ▼
     GET /r/:slug (Edge Routing)
             │
             ├──► 1. Check Redis Cache (TTL: 300s)
             │      └── (Miss: Query Postgres with immutable slug)
             │
             ├──► 2. Return HTTP 302 Redirect Immediately (<40ms)
             │
             └──► 3. Background Job (Next.js after()):
                    - Filter bots & prefetch headers
                    - Extract country, device, browser, OS
                    - Compute daily visitor HMAC (zero IP retention)
                    - Append to `scans` table (partition-ready)
```

---

## 2. Environment Configuration

| Variable Name | Exposure | Required | Description |
|:---|:---|:---:|:---|
| `NEXT_PUBLIC_APP_URL` | Client & Server | Yes | Canonical origin URL (e.g. `https://qr.pulse.io` or `http://localhost:3000`). |
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | Yes | Supabase project API gateway endpoint. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | Yes | Public Supabase anon key (enforces Row Level Security). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | Yes | High-privilege key for `after()` scan ingestion & cron rollups. |
| `VISITOR_HASH_SECRET` | Server Only | Yes | Salt for SHA-256 HMAC daily visitor fingerprinting (min 32 chars). |
| `CRON_SECRET` | Server Only | Yes | Bearer token authorizing automated rollup jobs. |
| `UPSTASH_REDIS_REST_URL` | Server Only | Optional | Upstash Redis REST URL (falls back to in-memory cache if omitted). |
| `UPSTASH_REDIS_REST_TOKEN` | Server Only | Optional | Upstash Redis REST access token. |

---

## 3. Database Deployment & Schema Migrations

Migrations are stored chronologically in `supabase/migrations/`:
- `20261009000001_create_qr_codes.sql`: QR code entities, immutable slug enforcement trigger.
- `20261009000002_create_scans.sql`: Partition-ready append-only scan logs.
- `20261009000003_create_audit_and_rollups.sql`: Destination change history & `scan_daily_stats`.
- `20261009000004_create_rls_policies.sql`: Row-level security for tenant isolation.
- `20261009000005_analytics_views_and_functions.sql`: `rollup_scans_for_date()` stored procedure.

### Applying Migrations Locally
```bash
npx supabase start
npx supabase db reset
```

### Applying Migrations to Production
```bash
npx supabase link --project-ref <your-supabase-project-id>
npx supabase db push
```

---

## 4. Scheduled Aggregation (Cron Setup)

The platform includes a dedicated rollup endpoint:
`GET /api/cron/aggregate?date=YYYY-MM-DD` or `POST /api/cron/aggregate`.

### Vercel Cron Configuration (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/cron/aggregate",
      "schedule": "5 0 * * *"
    }
  ]
}
```

### Manual Trigger / Verification via curl
```bash
curl -X POST https://your-domain.com/api/cron/aggregate \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "targetDate": "2026-10-14",
  "rowsProcessed": 12,
  "durationMs": 48,
  "executedAt": "2026-10-15T00:05:02.124Z"
}
```

---

## 5. Security & Privacy Assurance

### Zero-Cookie, Zero-IP Privacy Model
- **No IP Storage**: Raw IP addresses are **never** persisted to Postgres or Redis.
- **Daily Salted HMAC**: Raw client IP is combined with `VISITOR_HASH_SECRET` and the UTC date string (`YYYY-MM-DD`), then hashed using HMAC-SHA-256:
  $$\text{hash} = \text{HMAC-SHA-256}(K = \text{secret}, \text{data} = \text{IP} \mathbin{\Vert} \text{date})$$
  Because the date rotates every 24 hours, visitor hashes cannot be correlated across different days.
- **GDPR / CCPA Exemption**: Because no personally identifiable information (PII) is retained, data subject erasure requests require zero database purging.

### Destination URL SSRF Defense
All destination URLs undergo strict validation before persistence (`src/server/security/url-safety.ts`):
1. **Protocol Restriction**: Only `http:` and `https:` schemes allowed.
2. **Private IP Blocking**: Rejects RFC 1918 addresses (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.1`), link-local (`169.254.0.0/16`), and AWS metadata endpoints (`169.254.169.254`).
3. **DNS Rebinding Defense**: Performs proactive DNS lookups to verify resolved IPs are public routable unicast addresses.

---

## 6. Incident Triage Runbooks

### Runbook 1: Redirect Latency Degradation (>100ms)
1. **Check `/api/health`**: Inspect `database.latencyMs` and `cache.status`.
2. **Inspect Upstash Redis Connection**: If Redis is exhausted or failing, verify fallback to PostgreSQL is active.
3. **Review Database Connection Pool**: Check Supabase Dashboard -> Database -> Pool Connections. Ensure connection pooler (pgBouncer / Supavisor) is active on port 6543 (transaction pooling).
4. **Inspect Redirect Logs**: Filter server logs for `"Redirect resolved from database"`. If cache hit ratio has plummeted, check for recent invalidations or Redis memory exhaustion.

### Runbook 2: Redis Outage / Network Partition
- **Behavior**: The application automatically logs a warning and falls back to database lookup or memory cache.
- **Action**: Check Upstash status page. Once service is restored, the application will automatically reconnect without requiring a restart.

### Runbook 3: Malicious Redirect / Phishing Destination Reported
1. Open the QR Pulse dashboard or Supabase table `qr_codes`.
2. Locate the reported QR record by slug or destination URL.
3. Update `status` to `'archived'` or `'paused'`.
4. The Redis cache key `slug:<slug>` will immediately invalidate, and all future scans will receive HTTP 410 Gone or HTTP 403 Paused.

---

## 7. Key Rotation Procedures

### Rotating `VISITOR_HASH_SECRET`
- **Impact**: Changing this key resets daily unique visitor hashes. It does **not** affect total scan counts or aggregated daily rollups.
- **Procedure**: Update `VISITOR_HASH_SECRET` in environment variables and trigger a redeployment.

### Rotating `CRON_SECRET`
- **Procedure**: Generate a new 32-character random token (`openssl rand -hex 32`). Update both the platform environment variable and the calling cron scheduler.

---

## 8. Verification & Test Commands

```bash
# Run complete unit and integration test suite
npm run test

# Run TypeScript compilation check
npm run typecheck

# Run ESLint validation
npm run lint

# Build production bundle
npm run build

# Run Playwright E2E suite
npm run test:e2e
```
