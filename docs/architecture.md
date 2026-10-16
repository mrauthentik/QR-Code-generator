# Dynamic QR Code Redirect & Analytics Platform — System Architecture

**Document Version:** 1.0.0  
**Status:** PROPOSED (Phase 0 Review)  
**Author:** Staff Software Engineer  
**Target Deployment:** Next.js (App Router) on Vercel + Supabase (Postgres & Auth) + Upstash Redis  

---

## 1. Executive Summary & Scope

The platform provides high-performance, dynamic QR code management and privacy-preserving scan analytics. Physical or digital QR codes encode an immutable, compact short link (`https://<domain>/r/<slug>`). When scanned, the service validates the slug, resolves the active destination URL from an ultra-low-latency cache (with Postgres fallback), and issues an immediate HTTP `302 Found` redirect.

Post-redirect, scan telemetry (geo-location, device, browser, OS, referrer, and daily-rotating anonymized visitor hash) is processed asynchronously using Next.js `after()` to ensure zero impact on redirect response times.

### 1.1 In-Scope (Phase 1–6)
- **Authentication & Authorization:** Supabase Auth (Email + Google OAuth) with session management and Row-Level Security (RLS) enforcement at the database tier.
- **QR Lifecycle Management:** Create, edit, pause, archive, and soft-delete dynamic QR codes. Immutable slugs to prevent breaking physical prints.
- **Destination URL Safety Engine:** Protocol whitelisting (`http`/`https`), SSRF/RFC1918 private IP protection, self-domain loop prevention, URL normalization, and pluggable reputation verification.
- **Sacred Redirect Path (`GET /r/[slug]`):** Sub-50ms target response time, HTTP 302, `Cache-Control: no-store`, non-blocking telemetry via `after()`, graceful fallback branded pages for invalid/paused/archived QR codes.
- **QR Styling & Vector Generation:** Full visual customization (dots, corners, gradients, colors, embedded logo) with client-side SVG (print-ready) and PNG high-res export via `qr-code-styling`.
- **Privacy-Preserving Telemetry:** Daily-rotating HMAC visitor hashing with zero raw IP persistence. Bot, crawler, prefetch, and headless browser filtering.
- **Analytics Engine & Rollups:** Near-real-time raw scan ingestion, scheduled daily rollups (`scan_daily_stats`), SQL aggregation routines (RPC/Views), interactive time-series dashboards (Recharts), and CSV export.
- **Operational Excellence:** Structured JSON logging, health endpoints (`/api/health`), rate limiting (fail-open on redirect, fail-closed on mutations), database migration integrity, and runbooks.

### 1.2 Out-of-Scope (v1 Architecture Considerations)
- **Monetization & Billing:** Stripe/LemonSqueezy integration deferred, but data models include tenant quotas and feature tier abstractions.
- **Multi-Tenant Organizations / Teams:** Currently 1:1 user-to-resource ownership. Schema includes `owner_id` with foreign key paths prepared for an eventual `organization_id`.
- **Custom Domains per Tenant:** CNAME routing deferred; routing engine designed so domain resolution can sit in front of slug resolution.
- **Bulk CSV/API Import:** Deferred to v2.
- **Dynamic Rule-Based Routing (Geo/OS/AB Testing):** Single active destination URL for v1; destination schema is isolated to allow conditional rule trees in future phases.
- **Public API Keys & External SDKs:** All mutations run via authenticated Next.js Server Actions and Route Handlers for the dashboard session.

---

## 2. Architectural Principles & System Design

```
+----------------------------------------------------------------------------------------------------+
|                                         PRESENTATION LAYER                                         |
|                                                                                                    |
|    Marketing & Docs            Dashboard (App Router)                Sacred Redirect Route         |
|     (Static/ISR)          (RSC + Client Components + shadcn)            GET /r/[slug]              |
|           |                               |                                    |                   |
+-----------|-------------------------------|------------------------------------|-------------------+
            |                               |                                    |
            v                               v                                    v
+-----------------------+   +-------------------------------+   +------------------------------------+
|   Public Landing &    |   |    Features / Domain Layer    |   |     Redirect Controller Engine     |
|     Documentation     |   |   - QR Codes (CRUD, Style)    |   |   - Format Validation (Zod)        |
|                       |   |   - Analytics (Stats, Export) |   |   - Cache Resolution (Redis)       |
|                       |   |   - Auth (Session, Profile)   |   |   - DB Fallback (Repository)       |
+-----------------------+   +-------------------------------+   |   - Immediate 302 Response         |
                                            |                   +------------------------------------+
                                            v                                    |
+--------------------------------------------------------------------+           | after()
|                            SERVER CORE                             |           |
|                                                                    |           v
|  +------------------------+  +----------------------------------+  |  +----------------------------+
|  |   Security Services    |  |       Repositories Layer         |  |  |   Background Scan Worker   |
|  | - URL Safety & SSRF    |  | - QRCodesRepository              |  |  | - Bot Filter (UA/Headers)  |
|  | - Rate Limiter (Redis) |  | - ScansRepository                |  |  | - Geo Extraction (Vercel) |
|  | - IP Hash (HMAC Daily) |  | - RollupRepository               |  |  | - Visitor HMAC Hashing     |
|  +------------------------+  +----------------------------------+  |  | - Batch/Async DB Insert    |
+-------------------------------------------|------------------------+  +----------------------------+
                                            v                                    |
+--------------------------------------------------------------------+           |
|                           DATA STORE LAYER                         |           |
|                                                                    |<----------+
|  Supabase PostgreSQL (RLS Enforced, Monthly Partitions, Audit Log) |
|  Upstash Redis (Slug Cache, Distributed Token-Bucket Rate Limiter) |
+--------------------------------------------------------------------+
```

### 2.1 The Sacred Redirect Rule
The path `/r/[slug]` is critical infrastructure. Physical marketing campaigns, packaging, and business operations rely on this endpoint:
1. **Zero External Blocking:** The redirect path must NEVER await analytics ingestion, external API calls, or non-critical logging.
2. **Deterministic Response Times:** Target $p50 < 30\text{ms}$, $p95 < 60\text{ms}$ on Edge/Vercel serverless.
3. **Execution Order:**
   - Step 1: Input syntax check (regex validation of slug). Return 404 immediately if invalid.
   - Step 2: Query Slug Cache (Upstash Redis via REST over HTTP keep-alive).
   - Step 3: On cache miss, query `qr_codes` via PostgreSQL Read Replica or Primary.
   - Step 4: Validate status:
     - If `active`: Construct HTTP 302 with target `destination_url` and `Cache-Control: no-store`.
     - If `paused`: Render friendly 404/Paused branded page.
     - If `archived` or soft-deleted: Render branded 410 Gone page.
     - If not found: Render branded 404 Not Found page.
   - Step 5: Schedule `after()` execution block:
     - Bot & Crawler detection (discard pre-fetches and indexing spiders).
     - Extract client geo headers (`x-vercel-ip-country`, `x-vercel-ip-country-region`, `x-vercel-ip-city`).
     - Parse User Agent (OS, Browser, Device Type).
     - Calculate daily HMAC visitor hash using a rotating daily salt.
     - Insert record into `scans` table using Supabase Service-Role Admin client.
     - Log failure to structured logger if insert fails; **never** crash or surface errors to the user.

### 2.2 Layered Architecture & Dependency Inversion
Enforce strict one-way dependency rules:
- **Presentation Layer (`src/app`)**: Route handlers and React Server Components. Responsible only for HTTP parameters, cookies, rendering, and calling feature actions/services.
- **Feature Layer (`src/features/*`)**: Pure business logic, validation schemas (Zod), and orchestrations.
- **Server Infrastructure Layer (`src/server/*`)**:
  - `repositories/`: Database abstraction. SQL queries, Supabase PostgREST calls, and query mapping.
  - `cache/`: Caching interfaces and Upstash Redis adapter.
  - `security/`: Rate limiting, URL safety verification, HMAC token generators.
- **Core Library (`src/lib/*`)**: Environment validation (`env.ts`), structured logging (`logger.ts`), custom errors (`errors.ts`), and the Result monad (`result.ts`).

### 2.3 Error Handling & The Result Pattern
Exceptions (`throw`) are reserved strictly for unrecoverable infrastructure crashes. All domain logic returns typed `Result<T, E>` structures:
```typescript
type Result<T, E = AppError> = 
  | { success: true; data: T }
  | { success: false; error: E };
```
Errors are strongly typed (`NotFoundError`, `ValidationError`, `RateLimitError`, `UnsafeUrlError`, `UnauthorizedError`) and mapped to corresponding HTTP response codes at the route boundary.

---

## 3. Database Schema & Entity Relationship Model

The storage layer is PostgreSQL hosted on Supabase, guarded with Row Level Security (RLS) policies.

```mermaid
erDiagram
    auth_users ||--o{ qr_codes : "owns"
    auth_users ||--o{ qr_destination_history : "modified_by"
    qr_codes ||--o{ scans : "has"
    qr_codes ||--o{ qr_destination_history : "records"
    qr_codes ||--o{ scan_daily_stats : "aggregates"

    qr_codes {
        uuid id PK
        uuid owner_id FK
        varchar slug UK "unique, indexed, immutable"
        varchar name
        text destination_url "validated safe http/https"
        varchar status "active | paused | archived"
        jsonb style "dots, corners, colors, logo, errorLevel"
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "nullable for soft-delete"
    }

    scans {
        bigint id PK "identity"
        uuid qr_id FK "cascade on delete"
        timestamptz scanned_at "indexed, partition key"
        varchar country "ISO 3166-1 alpha-2"
        varchar region
        varchar city
        varchar device_type "mobile | desktop | tablet | other"
        varchar os
        varchar browser
        varchar referrer_host
        varchar visitor_hash "HMAC(secret, ip + ua + day)"
        boolean is_unique_in_day
    }

    qr_destination_history {
        bigint id PK
        uuid qr_id FK
        text old_url
        text new_url
        uuid changed_by FK
        timestamptz changed_at
    }

    scan_daily_stats {
        bigint id PK
        uuid qr_id FK
        date day "YYYY-MM-DD"
        integer total_scans
        integer unique_visitors
        jsonb country_breakdown "keyed by ISO code"
        jsonb device_breakdown "mobile, desktop, etc."
        jsonb os_breakdown
        jsonb browser_breakdown
        jsonb referrer_breakdown
        timestamptz updated_at
    }
```

### 3.1 DDL Specifications & Constraints

#### `qr_codes`
- `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `owner_id`: `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `slug`: `VARCHAR(16) NOT NULL UNIQUE` (Check constraint: `slug ~ '^[a-zA-Z0-9_-]{5,16}$'`)
- `name`: `VARCHAR(100) NOT NULL`
- `destination_url`: `TEXT NOT NULL` (Check constraint: `char_length(destination_url) <= 2048`)
- `status`: `VARCHAR(12) NOT NULL DEFAULT 'active'` (Check constraint: `status IN ('active', 'paused', 'archived')`)
- `style`: `JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()`
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()`
- `deleted_at`: `TIMESTAMPTZ NULL`
- Indexes:
  - `CREATE UNIQUE INDEX idx_qr_codes_slug ON qr_codes (slug) WHERE deleted_at IS NULL;`
  - `CREATE INDEX idx_qr_codes_owner ON qr_codes (owner_id, created_at DESC) WHERE deleted_at IS NULL;`

#### `scans` (Partitioning Strategy)
- `scans` is structured for high-volume append operations.
- Indexing:
  - `CREATE INDEX idx_scans_qr_time ON scans (qr_id, scanned_at DESC);`
  - `CREATE INDEX idx_scans_visitor_day ON scans (qr_id, visitor_hash, scanned_at);`
- **Partitioning Threshold:** When total scan count exceeds 5,000,000 records or monthly volume exceeds 1,000,000 scans, PostgreSQL declarative range partitioning by `scanned_at` (monthly chunks: `scans_y2026m10`, etc.) will be engaged. The repository is designed with partition-key-aligned queries (`scanned_at BETWEEN :start AND :end`).
- **Retention Policy:** Raw scans are retained for 13 months ($395\text{ days}$). Aggregated rollups in `scan_daily_stats` are preserved indefinitely.

#### `scan_daily_stats`
- Unique constraint: `UNIQUE (qr_id, day)`
- Index: `CREATE INDEX idx_scan_daily_stats_lookup ON scan_daily_stats (qr_id, day DESC);`

### 3.2 Row Level Security (RLS) Policies
1. **`qr_codes`**:
   - `SELECT`: `auth.uid() = owner_id AND deleted_at IS NULL`
   - `INSERT`: `auth.uid() = owner_id`
   - `UPDATE`: `auth.uid() = owner_id`
   - `DELETE`: `auth.uid() = owner_id` (Soft-delete updates `deleted_at`)
2. **`scans`**:
   - `SELECT`: Allowed only if the authenticated user owns the parent QR code (`EXISTS (SELECT 1 FROM qr_codes WHERE qr_codes.id = scans.qr_id AND qr_codes.owner_id = auth.uid())`).
   - `INSERT`: Disallowed for public/authenticated users. Only the Supabase **Service Role** (used by backend redirect `after()` worker) has insertion rights.
3. **`scan_daily_stats`**:
   - `SELECT`: User owns parent QR code.
   - `INSERT / UPDATE`: Service Role only (maintenance rollup cron).
4. **`qr_destination_history`**:
   - `SELECT`: User owns parent QR code.
   - `INSERT`: Trigger-based or service role on destination update.

---

## 4. Request Flow & Sequence Diagrams

### 4.1 Sacred Redirect Flow (`GET /r/[slug]`)
The redirect lifecycle executes with maximum isolation between routing and logging:

```mermaid
sequenceDiagram
    autonumber
    actor Scanner as User / Scanner Device
    participant Route as Next.js GET /r/[slug]
    participant Cache as Upstash Redis (Slug Cache)
    participant DB as Postgres (qr_codes)
    participant Worker as Next.js after() Background Task
    participant AdminDB as Postgres (scans via Service Role)

    Scanner->>Route: GET /r/spring-promo-26
    activate Route
    Route->>Route: Validate slug regex format
    alt Slug invalid format
        Route-->>Scanner: 404 Not Found (Branded page)
    end

    Route->>Cache: GET slug:spring-promo-26
    activate Cache
    Cache-->>Route: Cache Hit or Miss
    deactivate Cache

    alt Cache Miss
        Route->>DB: SELECT id, destination_url, status FROM qr_codes WHERE slug = ...
        activate DB
        DB-->>Route: QR Record
        deactivate DB
        Route->>Cache: SET slug:spring-promo-26 (TTL: 300s)
    end

    alt Status != 'active' or Not Found
        Route-->>Scanner: 404 Not Found / 410 Gone / 403 Paused
    end

    Route-->>Scanner: 302 Found (Location: destination_url, Cache-Control: no-store)
    deactivate Route

    Note over Scanner,Route: Client redirected immediately in < 40ms

    Route-)Worker: Dispatch after() context
    activate Worker
    Worker->>Worker: Check Bot Filter (Disallow Googlebot, Twitterbot, HEAD, etc.)
    alt Is Bot or Prefetch
        Worker->>Worker: Abort logging (No DB write)
    else Legitimate Scan
        Worker->>Worker: Extract Vercel Geo Headers (Country, City, Region)
        Worker->>Worker: Parse User Agent (OS, Browser, Device Type)
        Worker->>Worker: Compute visitor_hash = HMAC(Secret, IP + UA + DaySalt)
        Worker->>AdminDB: INSERT INTO scans (...)
        activate AdminDB
        AdminDB-->>Worker: Scan recorded
        deactivate AdminDB
    end
    deactivate Worker
```

### 4.2 QR Code Mutation & Cache Invalidation Flow
When a user updates a destination URL or changes a QR code's status:

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Authenticated User
    participant Action as Server Action (updateQRCode)
    participant Safety as URL Safety Validator
    participant DB as Postgres (qr_codes & history)
    participant Cache as Upstash Redis

    Owner->>Action: updateQRCode(id, { destination_url: 'https://new-target.com' })
    activate Action
    Action->>Action: Validate session & CSRF
    Action->>Safety: Validate URL (Scheme, SSRF, Blocklists)
    activate Safety
    Safety-->>Action: URL Safe
    deactivate Safety

    Action->>DB: UPDATE qr_codes SET destination_url = ... WHERE id = ... AND owner_id = ...
    activate DB
    DB->>DB: Trigger: Write to qr_destination_history
    DB-->>Action: Success
    deactivate DB

    Action->>Cache: DEL slug:spring-promo-26
    activate Cache
    Cache-->>Action: Invalidated
    deactivate Cache

    Action-->>Owner: Result.ok(updatedQRCode)
    deactivate Action
```

### 4.3 Analytics Aggregation Pipeline (Daily Rollup Job)
To keep queries blisteringly fast for long date ranges without running expensive scans over millions of rows:

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Vercel Cron / pg_cron
    participant Handler as Route /api/cron/aggregate-daily-scans
    participant AdminDB as Postgres Service Role

    Cron->>Handler: POST /api/cron/aggregate-daily-scans (Bearer CRON_SECRET)
    activate Handler
    Handler->>AdminDB: EXECUTE rollup_scans_for_date(target_date)
    activate AdminDB
    Note over AdminDB: Computes total_scans, unique_visitors,<br/>country_breakdown, device_breakdown,<br/>os_breakdown, referrer_breakdown
    AdminDB->>AdminDB: INSERT INTO scan_daily_stats ON CONFLICT (qr_id, day) DO UPDATE
    AdminDB-->>Handler: Row count processed
    deactivate AdminDB
    Handler-->>Cron: 200 OK { processed: N }
    deactivate Handler
```

---

## 5. Security & Privacy Architecture

### 5.1 Privacy-Preserving Visitor Tracking (GDPR / ePrivacy Compliance)
Storing raw IP addresses exposes organizations to substantial legal liabilities and violates user trust. Our platform enforces zero raw IP persistence:
- **Formula:**
  $$\text{visitor\_hash} = \text{HMAC-SHA256}\Big(\text{SECRET}, \text{IP} \mathbin{\Vert} \text{User-Agent} \mathbin{\Vert} \text{Date}(\text{YYYY-MM-DD})\Big)$$
- **Rotating Daily Salt:** The inclusion of `Date(YYYY-MM-DD)` ensures that the hash rotates every 24 hours at midnight UTC. This permits accurate **daily unique visitor counts** while making cross-day surveillance or persistent profiling mathematically impossible.
- **Secret Separation:** The HMAC secret is an encrypted 256-bit server-only environment variable (`VISITOR_HASH_SECRET`), never accessible to the client or stored in the database.

### 5.2 Destination URL Safety & SSRF Defense
Malicious actors must be prevented from using the redirect engine for phishing, internal network port scanning, or infinite redirect loops:
1. **Protocol Restriction:** Only `http:` and `https:` schemes allowed. `javascript:`, `data:`, `file:`, `blob:`, `vbscript:` are immediately rejected.
2. **Credential Stripping:** URLs containing embedded user info (e.g. `https://user:pass@domain.com`) are rejected.
3. **SSRF & Private Network Defense:**
   - Hostnames resolving to RFC 1918 addresses (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16`), and carrier-grade NAT (`100.64.0.0/10`) are rejected.
   - Hostnames matching `localhost`, `*.localhost`, or `.local` are rejected.
4. **Self-Domain Loop Prevention:** The platform's own domain name (`APP_URL` / `NEXT_PUBLIC_APP_URL`) cannot be used as a destination to prevent cyclic redirect attacks.
5. **Pluggable URL Reputation Interface:** Defined via `UrlReputationChecker` interface; default implementation is a passive heuristic validator, with seamless drop-in support for Google Safe Browsing / Cloudflare Radar in future phases.

### 5.3 Abuse Prevention & Rate Limiting
- **Redirect Route (`GET /r/[slug]`):** Protected by a high-throughput, token-bucket rate limiter (e.g. 100 requests per second per IP block). **Fail-Open Policy:** If Upstash Redis is down or times out, the redirect proceeds directly to Postgres. Legitimate users scanning a billboard must never see an error due to rate-limiting infrastructure failure.
- **Mutation Routes (Create / Edit QR):** Token-bucket rate limiter (e.g. 20 creations per minute per user). **Fail-Closed Policy:** Prevents bot spamming and database flooding.
- **Reserved Slugs:** Pre-allocated list (`admin`, `api`, `auth`, `login`, `dashboard`, `r`, `static`, `health`, `webhook`, `assets`, etc.) prevented from being registered.
- **Collision-Safe Slugs:** Slugs generated using `nanoid` with custom alphabet (base62 or unambiguous characters, e.g., omitting `0/O`, `1/l/I`), default length 7–8 characters ($62^7 \approx 3.5 \times 10^{12}$ combinations). Retries up to 3 times on unique constraint collision.

### 5.4 HTTP Security Headers
All routes enforce modern security headers:
- `Content-Security-Policy`: Strict policy preventing unauthorized inline scripts; allows QR canvas/SVG rendering and Supabase auth endpoints.
- `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options`: `nosniff`
- `X-Frame-Options`: `DENY`
- `Referrer-Policy`: `strict-origin-when-cross-origin` on dashboard, `no-referrer-when-downgrade` on redirects.

---

## 6. Target Project File & Folder Structure

```
c:\Users\Uche\Desktop\workspace\QR-Code-generator\
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Lint, typecheck, tests, build, drift check
│       └── playwright.yml         # Playwright E2E suite
├── docs/
│   ├── architecture.md            # This document
│   ├── runbook.md                 # Deployment, migrations, secret rotation, disaster recovery
│   ├── privacy.md                 # Data privacy & GDPR compliance specification
│   └── adr/
│       ├── 001-redirect-status-code-302.md
│       ├── 002-redirect-runtime-selection.md
│       ├── 003-scan-logging-strategy-after.md
│       ├── 004-privacy-preserving-visitor-hashing.md
│       ├── 005-caching-and-rate-limiting-tier.md
│       └── 006-analytics-aggregation-and-partitioning.md
├── supabase/
│   ├── migrations/
│   │   ├── 20261009000001_create_qr_codes.sql
│   │   ├── 20261009000002_create_scans_and_partitions.sql
│   │   ├── 20261009000003_create_audit_and_rollups.sql
│   │   ├── 20261009000004_create_rls_policies.sql
│   │   └── 20261009000005_analytics_views_and_functions.sql
│   ├── tests/
│   │   └── rls_isolation.test.sql # pgTAP tests verifying tenant isolation
│   ├── seed.sql                   # Development seed fixtures
│   └── config.toml                # Supabase local CLI configuration
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── callback/route.ts
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx           # Redirects to /qr-codes
│   │   │   ├── qr-codes/
│   │   │   │   ├── page.tsx       # QR code list view
│   │   │   │   ├── new/page.tsx   # Create QR code
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx   # QR code detail & analytics
│   │   │   │       └── edit/page.tsx # Edit destination & style
│   │   ├── (marketing)/
│   │   │   ├── page.tsx           # Landing page
│   │   │   └── privacy/page.tsx   # Privacy disclosure
│   │   ├── r/
│   │   │   └── [slug]/
│   │   │       └── route.ts       # Sacred redirect handler
│   │   ├── api/
│   │   │   ├── health/route.ts    # Service health probe
│   │   │   └── cron/
│   │   │       └── aggregate/route.ts # Rollup execution endpoint
│   │   ├── layout.tsx
│   │   └── not-found.tsx
│   ├── features/
│   │   ├── qr-codes/
│   │   │   ├── components/        # QRCard, QRTable, QRPreview, QRStyleEditor, DownloadModal
│   │   │   ├── actions/           # create-qr.action.ts, update-qr.action.ts, delete-qr.action.ts
│   │   │   ├── services/          # qr-code.service.ts
│   │   │   ├── schemas/           # qr-code.schema.ts
│   │   │   └── types/             # qr-code.types.ts
│   │   ├── analytics/
│   │   │   ├── components/        # AnalyticsOverview, ScansChart, GeoBreakdown, DeviceBreakdown
│   │   │   ├── services/          # analytics.service.ts, csv-export.service.ts
│   │   │   ├── queries/           # analytics.queries.ts
│   │   │   └── schemas/           # analytics.schema.ts
│   │   └── auth/
│   │       ├── components/        # LoginForm, AuthGuard, UserMenu
│   │       └── services/          # auth.service.ts
│   ├── server/
│   │   ├── db/
│   │   │   ├── client.ts          # Authenticated Supabase server client
│   │   │   ├── admin.ts           # Service role client (scan insert, cron)
│   │   │   └── types.generated.ts # Database types generated from Supabase
│   │   ├── repositories/
│   │   │   ├── qr-codes.repo.ts   # CRUD operations on qr_codes table
│   │   │   ├── scans.repo.ts      # Fast insert & raw query operations on scans
│   │   │   └── rollups.repo.ts    # Aggregated queries & rollup upserts
│   │   ├── cache/
│   │   │   ├── slug-cache.ts      # SlugCache interface + Upstash/Memory implementation
│   │   │   └── cache-keys.ts
│   │   ├── security/
│   │   │   ├── rate-limit.ts      # Rate limiter (fail-open for redirect, fail-closed for CRUD)
│   │   │   ├── url-safety.ts      # SSRF, scheme, and loop prevention
│   │   │   ├── ip-hash.ts         # HMAC-SHA256 daily-rotating visitor hash
│   │   │   └── slug-generator.ts  # Collision-safe nanoid generator with retry
│   │   └── analytics/
│   │       ├── scan-recorder.ts   # after() coordinator for background logging
│   │       ├── bot-filter.ts      # Bot / Crawler / Prefetch detection
│   │       └── ua.ts              # UA string parser (ua-parser-js)
│   ├── lib/
│   │   ├── env.ts                 # Zod-validated environment config
│   │   ├── logger.ts              # Structured JSON logger with request IDs
│   │   ├── errors.ts              # Domain & infrastructure error classes
│   │   ├── result.ts              # Typed Result<T, E> monad
│   │   └── constants.ts           # Reserved slugs, default QR styles, limits
│   ├── components/
│   │   └── ui/                    # shadcn/ui components (button, card, dialog, etc.)
│   └── middleware.ts              # Session refresh & protected route gate
├── tests/
│   ├── unit/                      # url-safety, slug-generator, bot-filter, ip-hash
│   ├── integration/               # repositories, redirect route with mocked DB/Cache
│   └── e2e/                       # Playwright tests (auth -> create -> scan -> analytics)
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── tailwind.config.ts
```

---

## 7. Architectural Decision Records (ADR Summaries)

| ADR ID | Decision Title | Status | Selected Choice & Rationale |
|---|---|---|---|
| **ADR-001** | Redirect Status Code: 302 vs 301 | **Accepted** | **302 Found with `Cache-Control: no-store`**. A 301 (Permanent) is cached aggressively by client browsers and intermediate ISPs, rendering subsequent destination changes ineffective and blinding analytics. 302 guarantees every scan hits the origin. |
| **ADR-002** | Redirect Route Execution Runtime | **Accepted** | **Node.js Serverless Runtime**. Next.js `after()` API is fully supported in Node.js serverless. Furthermore, Node.js provides full compatibility with standard crypto, DB pooling, and error monitors without Edge runtime sandbox limitations. |
| **ADR-003** | Scan Ingestion Strategy via `after()` | **Accepted** | **Non-blocking `after()` Execution**. The HTTP response is dispatched immediately. Background work extracts headers, parses user agents, and writes to Postgres without delaying the redirect or risking redirect aborts if DB is congested. |
| **ADR-004** | Privacy-Preserving Visitor Identification | **Accepted** | **HMAC-SHA256 with Daily Salt**. No raw IPs stored. Combines IP, User-Agent, and daily date string with a secret key. Ensures GDPR compliance while enabling daily unique scan counts. |
| **ADR-005** | Cache & Rate Limiting Strategy | **Accepted** | **Upstash Redis behind swappable Interface with Fail-Open Redirect**. Redis provides sub-10ms slug resolution and distributed token bucket rate limiting. If Redis is unreachable, the redirect degrades gracefully to direct PostgreSQL. |
| **ADR-006** | Analytics Data Storage & Partitioning | **Accepted** | **Hybrid Raw Ingestion + Scheduled Daily Rollups**. Short ranges (<30 days) query `scans` table directly; historical ranges query pre-aggregated `scan_daily_stats`. Raw `scans` partitioned monthly once reaching scale. |

---

## 8. Assumptions, Trade-offs & Open Questions

### 8.1 Key Assumptions
1. **Hosting Environment:** Vercel is the production host, providing geo-location headers (`x-vercel-ip-country`, `x-vercel-ip-country-region`, `x-vercel-ip-city`) on incoming requests. Fallback headers (`cf-ipcountry`, `x-forwarded-for`) are supported for other environments.
2. **Local Development:** Supabase CLI runs locally via Docker (`supabase start`) providing Postgres, Auth, and Storage.
3. **Storage for Logos:** Supabase Storage bucket (`qr-logos`) with public read access and authenticated upload with MIME-type and size limits (max 2MB, SVG/PNG/JPEG only).

### 8.2 Architectural Trade-offs
1. **Edge vs Node.js for Redirects:** Edge runtime offers lower cold starts in distributed regions, but Node.js Serverless offers superior compatibility with `after()`, connection pooling, and libraries. Node.js with warm serverless instances on Vercel meets our sub-50ms SLA while maximizing reliability.
2. **Synchronous Ingestion vs Event Queue (Kafka/SQS):** For v1, `after()` direct DB inserts eliminate the operational overhead and cost of maintaining a message broker while preserving the invariant that redirects are never blocked. If volume scales to tens of millions of scans per day, a message queue can be introduced behind the `ScanRecorder` interface.

### 8.3 Clarifications for Approval
1. **Rate Limiting Defaults:**
   - Redirect Route: 120 requests / 60 seconds per IP (fail-open).
   - QR Code Creation: 30 creates / 60 seconds per user (fail-closed).
2. **Logo Storage:** Embedded as base64 in SVG/PNG export or loaded from Supabase Storage CDN URL? *Recommendation:* Upload to Supabase Storage, store CDN public URL in `style.logoUrl`, load with CORS for client-side canvas rasterization.

---

## 9. Verification & Phase Roadmap

- **Phase 0 (Current):** Architectural blueprint, folder structure, ERD, ADRs, approval gate.
- **Phase 1:** Repository scaffold, Next.js App Router, Tailwind + shadcn/ui, Supabase migrations, RLS policies + pgTAP isolation tests, CI pipeline.
- **Phase 2:** Supabase Auth, Repositories, Services, QR Code CRUD, URL Safety validator, collision-safe slug generator.
- **Phase 3:** Sacred redirect route (`/r/[slug]`), `after()` scan recorder, Upstash Redis cache adapter, branded fallback pages, integration tests.
- **Phase 4:** QR code visual styling engine (`qr-code-styling`), live preview, SVG & PNG download modal, create/edit dashboard UI.
- **Phase 5:** Analytics SQL rollup functions, daily cron handler, Recharts dashboard visualizations, CSV export service.
- **Phase 6:** Security headers, rate limiting, structured logging, health probes, Playwright E2E suite, load sanity check, runbook documentation.
