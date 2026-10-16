import "server-only";
import { z } from "zod";
import { clientEnv } from "./env.client";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required for admin/worker operations"),
  VISITOR_HASH_SECRET: z
    .string()
    .min(32, "VISITOR_HASH_SECRET must be at least 32 characters long for cryptographic safety"),
  CRON_SECRET: z
    .string()
    .min(16, "CRON_SECRET must be at least 16 characters long"),
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal("")),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .optional()
    .or(z.literal("")),
});

const parsedServerEnv = serverEnvSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  VISITOR_HASH_SECRET: process.env.VISITOR_HASH_SECRET,
  CRON_SECRET: process.env.CRON_SECRET,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
});

if (!parsedServerEnv.success) {
  console.error("❌ Invalid server environment variables:", parsedServerEnv.error.format());
  throw new Error("Invalid server environment variables. Check .env.local or production secrets");
}

export const serverEnv = {
  ...clientEnv,
  ...parsedServerEnv.data,
};

export type ServerEnv = typeof serverEnv;
