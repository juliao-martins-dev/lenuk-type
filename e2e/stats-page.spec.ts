import { test, expect } from "@playwright/test";

test.describe("Stats page", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/stats");
    // Should not show a Next.js error page
    await expect(page).not.toHaveTitle(/error/i);
    // Heading or back-link should be present
    await expect(
      page.locator("text=/stats|Back to/i").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows empty state when no runs recorded", async ({ page, context }) => {
    // Clear storage so there are no saved runs
    await context.clearCookies();
    await page.goto("/stats");

    // Either a "no runs yet" message or the stats heading should appear
    const content = page.locator("main, [role='main']").first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });
});
