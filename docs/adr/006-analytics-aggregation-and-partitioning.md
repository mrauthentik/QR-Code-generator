# ADR 006: Analytics Aggregation Strategy & Table Partitioning

## Context
As scans accumulate, running `COUNT(DISTINCT visitor_hash)`, `GROUP BY country`, and time-series bucketing directly on the raw `scans` table becomes computationally expensive and introduces I/O contention on the database primary.

Requirements:
- Sub-second dashboard queries for any date range (Today, 7 days, 30 days, 90 days, All-time).
- User-timezone-aware day bucketing.
- Clean data retention policy.

## Decision
We implement a **Two-Tier Hybrid Aggregation Model**:

```
[Incoming Scans] ---> Raw 'scans' Table (Partitioned by Month)
                             |
                             | Nightly Scheduled Rollup (pg_cron / Vercel Cron)
                             v
                     'scan_daily_stats' Table (Pre-aggregated JSONB)
```

### 1. Ingestion Tier: Raw `scans` Table
- Stores individual scan records with millisecond timestamps and extracted metadata.
- Queried directly only for **recent ranges** (e.g. past 24 hours or last 7 days).
- **Partitioning Threshold:** When the table reaches 5,000,000 total rows or >1,000,000 rows/month, we partition by range on `scanned_at` with monthly child tables (`scans_2026_10`, `scans_2026_11`, etc.).
- **Retention Policy:** Raw scans older than 13 months ($395\text{ days}$) are pruned via automated cron task.

### 2. Rollup Tier: `scan_daily_stats` Table
- Maintains daily aggregates per QR code:
  - `total_scans` (`integer`)
  - `unique_visitors` (`integer`)
  - `country_breakdown` (`jsonb` e.g. `{"US": 140, "GB": 82}`)
  - `device_breakdown` (`jsonb` e.g. `{"mobile": 210, "desktop": 12}`)
  - `os_breakdown` (`jsonb` e.g. `{"iOS": 150, "Android": 60}`)
  - `browser_breakdown` (`jsonb` e.g. `{"Safari": 130, "Chrome": 80}`)
  - `referrer_breakdown` (`jsonb`)
- Maintained by an idempotent scheduled job invoking a Postgres stored procedure (`rollup_daily_stats(date)`).
- Persisted **indefinitely**, providing lifetime historical reporting with near-zero storage footprint.

### 3. Query Tier: Dynamic Routing
The `AnalyticsService` intelligently determines query execution:
- Ranges $\le 7\text{ days}$: Aggregates directly from raw `scans` table (ensures instant real-time reflection of recent scans).
- Ranges $> 7\text{ days}$: Sums and merges JSONB rollups from `scan_daily_stats`, unioned with today's intraday scans from `scans`.
- Response latency remains $< 50\text{ms}$ regardless of whether the account has 100 or 10,000,000 total scans.
