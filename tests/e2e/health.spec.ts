import { test, expect } from "@playwright/test";

test.describe("System Health API", () => {
  test("GET /api/health should respond with json and health status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect([200, 503]).toContain(response.status());

    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(["healthy", "degraded"]).toContain(body.status);
    expect(body).toHaveProperty("checks");
    expect(body.checks).toHaveProperty("database");
    expect(body.checks).toHaveProperty("cache");
  });
});
