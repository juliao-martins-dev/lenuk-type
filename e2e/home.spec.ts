import { test, expect } from "@playwright/test";

test.describe("Home page loads", () => {
  test("renders typing surface", async ({ page }) => {
    await page.goto("/");
    // The typing prompt area should be visible
    await expect(page.locator("text=15s")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=30s")).toBeVisible();
    await expect(page.locator("text=60s")).toBeVisible();
  });

  test("status badge shows ready state", async ({ page }) => {
    await page.goto("/");
    // Status badge — any of the known states is acceptable on first load
    const badge = page.locator("span").filter({ hasText: /Ready|Preparing|Finished/i }).first();
    await expect(badge).toBeVisible({ timeout: 10_000 });
  });
});
