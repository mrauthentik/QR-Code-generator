/**
 * Re-export client environment for isomorphic access.
 * For server-only secrets, import `serverEnv` from `@/lib/env.server`.
 */
export { clientEnv, clientEnv as env } from "./env.client";
