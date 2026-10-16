# ADR 002: Redirect Route Execution Runtime (Node.js vs Edge)

## Context
Next.js App Router allows route handlers to execute either in the **Edge Runtime** (lightweight V8 isolates distributed across CDN points of presence) or the **Node.js Serverless Runtime** (containerized Node.js environments).

The redirect path `GET /r/[slug]` requires:
- Minimal latency for the 302 response
- Execution of background telemetry logging via Next.js `after()`
- Parsing of User-Agent strings via `ua-parser-js`
- Database access to PostgreSQL (Supabase) and Redis (Upstash)
- Cryptographic HMAC generation for visitor privacy

## Decision
We select the **Node.js Serverless Runtime** (`export const runtime = 'nodejs';`).

## Rationale
1. **Support and Reliability of `after()`:** Next.js `after()` schedules execution to run after the HTTP response stream has been closed. In the Node.js Serverless runtime on Vercel, the function execution lifecycle keeps the Lambda container alive until the `after()` promise chain settles. In Edge runtimes, background task execution after response completion has platform-dependent timeouts and isolate lifecycle hazards.
2. **Database & Network Drivers:** Node.js supports standard connection pooling, robust TLS socket handling, and Supabase PostgREST client libraries without requiring polyfills or edge-restricted networking APIs.
3. **Library Compatibility:** Standard Node.js crypto primitives (`crypto.createHmac`) and parsing utilities execute with zero compatibility layers or sandbox limits.
4. **Latency Profile:** When using warm serverless containers and Upstash Redis over HTTP keep-alive, Node.js response times on Vercel are comfortably sub-40ms, well within our performance budget.

## Consequences
- Cold starts on infrequently accessed regions can be 100–250ms higher than edge isolates. This is mitigated by global deployment regions, Redis caching, and connection pooling.
