import { test, expect } from "@playwright/test";

test.describe("Core Application & Security Invariants", () => {
  test("Landing and Auth Page should render properly with zero errors", async ({ page }) => {
    await page.goto("/login");

    // Title and branding verification
    await expect(page).toHaveTitle(/QR Pulse/i);
    await expect(page.locator("h1")).toContainText(/Welcome to QR Pulse/i);

    // Form inputs presence
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
  });

  test("Sacred Redirect Route should return branded 404 on invalid slug", async ({ page }) => {
    const response = await page.goto("/r/non-existent-test-slug-404");
    expect(response?.status()).toBe(404);

    // Verify branded fallback HTML renderer output
    await expect(page.locator("body")).toContainText(/QR Code Not Found/i);
    await expect(page.locator("body")).toContainText(/QR Pulse/i);
  });

  test("Security Headers should be present on application responses", async ({ request }) => {
    const response = await request.get("/login");
    const headers = response.headers();

    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["strict-transport-security"]).toBeDefined();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
  });
});
