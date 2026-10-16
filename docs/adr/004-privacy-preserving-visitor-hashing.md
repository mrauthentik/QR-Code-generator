# ADR 004: Privacy-Preserving Visitor Identification

## Context
Accurate analytics requires measuring "Unique Visitors" / "Unique Scans per Day". Traditional tracking mechanisms either:
- Store raw IP addresses in the database (creating massive GDPR/ePrivacy liability, risk of data breaches, and tracking concerns).
- Issue client tracking cookies (which triggers cookie banner consent requirements under EU law, breaks non-browser scanners, and introduces cross-origin friction).

## Decision
We implement a zero-cookie, zero-raw-IP privacy-preserving identifier:
$$\text{visitor\_hash} = \text{HMAC-SHA256}\Big(K_{\text{secret}}, \text{IP} \mathbin{\Vert} \text{User-Agent} \mathbin{\Vert} \text{Date}_{\text{UTC}}(\text{YYYY-MM-DD})\Big)$$

Where:
- $K_{\text{secret}}$ is a high-entropy secret (`VISITOR_HASH_SECRET`, at least 32 random bytes) stored in server environment variables and never logged or persisted.
- $\text{IP}$ is the client IP extracted from trusted reverse proxy headers (`x-forwarded-for` or `cf-connecting-ip`).
- $\text{User-Agent}$ is the raw `User-Agent` string.
- $\text{Date}_{\text{UTC}}$ is the current date string (e.g. `2026-10-09`).

## Properties & Security Guarantees
1. **Irreversibility:** Because SHA-256 is a one-way cryptographic hash function and the HMAC secret is withheld from clients and database readers, an attacker possessing the database cannot reverse `visitor_hash` back to the user's IP.
2. **Rainbow Table Immunity:** The secret key acts as an HMAC pepper, preventing precomputed rainbow table attacks against IPv4 address spaces.
3. **Daily Rotation (Unlinkability Across Days):** Because the date string changes at 00:00:00 UTC every day, a user scanning the code on Monday and Tuesday produces two completely uncorrelated hashes. Cross-day surveillance and persistent profiling are mathematically impossible.
4. **Daily Uniqueness Accuracy:** Within the same calendar day, repeated scans from the same device and network yield the identical hash, allowing accurate calculation of daily unique visitors.
5. **Cookie-Free:** No HTTP `Set-Cookie` header is transmitted. The solution is fully compliant with ePrivacy Directive without requiring consent banners on redirects.
