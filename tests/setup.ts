// Vitest setup file
import { vi } from "vitest";

// Set default test environment variables if not already set
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-service-role-key";
process.env.VISITOR_HASH_SECRET = process.env.VISITOR_HASH_SECRET || "test-visitor-hash-secret-must-be-at-least-32-chars-long";
process.env.CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret-token-key-12345";
(process.env as Record<string, string | undefined>).NODE_ENV = "test";

// Mock 'server-only' so tests can import server modules outside Next.js bundler
vi.mock("server-only", () => {
  return {};
});
