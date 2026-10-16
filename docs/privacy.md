# Data Privacy, Telemetry, and GDPR Compliance Specification

**Document Version:** 1.0.0  
**Effective Date:** October 2026  
**Scope:** Dynamic QR Code Redirect Engine & Analytics Reporting  

---

## 1. Core Privacy Philosophy: Privacy by Design

The QR code platform operates on a strict **zero-raw-IP, zero-tracking-cookie** privacy architecture. In accordance with the EU General Data Protection Regulation (GDPR, Art. 25 & 32), the ePrivacy Directive (Directive 2002/58/EC), and the California Consumer Privacy Act (CCPA), the platform is engineered such that individual end-users cannot be fingerprinted or tracked across distinct calendar days or disparate physical QR code locations.

---

## 2. Telemetry Processing Pipeline

When a user scans a dynamic QR code (`GET /r/[slug]`), the following processing occurs:

```
[HTTP Request]
     │
     ├── 1. Client IP & User Agent Received in Ephemeral Memory
     │
     ├── 2. Geolocation Lookup via Trusted Reverse Proxy Headers
     │      (Extracts Country, Region, City — Never Latitude/Longitude or Street Address)
     │
     ├── 3. Device & Browser Classification (ua-parser-js)
     │      (Extracts Device Type, OS Family, Browser Name — Never Canvas or Hardware Fingerprints)
     │
     ├── 4. Anonymized Visitor Hash Computation
     │      HMAC-SHA256(Secret, IP + UserAgent + UTC_Day)
     │
     └── 5. Immediate Memory Purge
            (Raw IP Address is discarded; never persisted to disk, database, or server logs)
```

---

## 3. Visitor Hashing Mechanics & Mathematical Properties

### 3.1 The Daily Hashing Function
To calculate daily unique scans without persisting Personally Identifiable Information (PII), we utilize:

$$\text{visitor\_hash} = \text{HMAC-SHA256}\Big(K_{\text{secret}}, \text{IP} \mathbin{\Vert} \text{User-Agent} \mathbin{\Vert} \text{Date}_{\text{UTC}}(\text{YYYY-MM-DD})\Big)$$

- **$K_{\text{secret}}$ (HMAC Secret):** A cryptographically secure 256-bit random key maintained in the server's private environment (`VISITOR_HASH_SECRET`). This secret is never shared, never committed to version control, and never exposed to client-side code.
- **$\text{IP}$:** The client IP from the network socket or trusted proxy header.
- **$\text{User-Agent}$:** The User-Agent string sent by the scanner's browser.
- **$\text{Date}_{\text{UTC}}$:** Current UTC date formatted as `YYYY-MM-DD`.

### 3.2 Non-Linkability Across Days
Because $\text{Date}_{\text{UTC}}$ rotates every 24 hours at 00:00:00 UTC:
- A visitor scanning a QR code on Monday generates Hash $H_1$.
- The identical visitor scanning the same QR code on Tuesday generates Hash $H_2$.
- $H_1$ and $H_2$ are cryptographically independent and impossible to correlate without breaking the preimage resistance of SHA-256.
- Cross-day behavioral profiling is strictly impossible by mathematical design.

---

## 4. Cookie-Free Architecture

- **No Cookies Transmitted on `/r/[slug]`:** The redirect route transmits zero `Set-Cookie` headers.
- **No Third-Party Tracker Beacons:** No Google Analytics, Meta Pixel, or external marketing scripts run on the redirect path.
- **ePrivacy Compliance:** Because no information is stored on or retrieved from the user's terminal equipment, no cookie consent banner is legally required for QR code redirection.

---

## 5. Data Retention & Minimization

1. **Raw Scans (`scans` table):** Retained for a maximum rolling window of 13 months ($395\text{ days}$). Automatically purged via database retention cron.
2. **Aggregated Stats (`scan_daily_stats` table):** Contains purely numerical rollups (counts per country, device, browser, referrer). These contain zero personal data or individual identifiers and are retained indefinitely.
3. **Audit Records (`qr_destination_history`):** Tracks administrative modifications made by the QR code owner (target URL changes and timestamps). Retained for the lifetime of the QR code.
