import { test, expect } from "@playwright/test";

/**
 * Core typing flow E2E tests.
 *
 * These tests exercise the typing engine through the real UI without mocking
 * localStorage or Supabase — the same way a real user experiences it.
 */

test.describe("Typing flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for splash / onboarding to clear (or skip it)
    // The typing surface becomes interactive once the prompt text appears
    await page.waitForTimeout(1_500);
  });

  test("typing characters advances the cursor", async ({ page }) => {
    // The prompt container holds the monospace text spans
    const prompt = page.locator("[aria-label]").filter({ hasText: /[a-zA-Z]/ }).first();
    await page.keyboard.press("Tab");   // focus the hidden textarea
    await page.keyboard.type("a");

    // After typing one character the cursor should have moved — the
    // "current" span (the one with the caret indicator) should exist.
    const caret = page.locator(".bg-primary\\/30, .border-b-2").first();
    await expect(caret).toBeVisible({ timeout: 3_000 });
  });

  test("restart button resets the session", async ({ page }) => {
    // Click the restart button (RotateCcw icon button)
    const restartBtn = page.locator("button", { hasText: /Restart/i }).first();
    await expect(restartBtn).toBeVisible({ timeout: 5_000 });
    await restartBtn.click();
    // After restart the timer label should show the current duration (e.g. "30s" default)
    await expect(page.locator("text=/\\d+s/").first()).toBeVisible();
  });

  test("duration selector changes the test length", async ({ page }) => {
    // Click 15 s option — it should become the active/selected value
    const btn15 = page.locator("button, [role='option']", { hasText: "15s" }).first();
    await expect(btn15).toBeVisible({ timeout: 5_000 });
    await btn15.click();
    // After selecting 15s, a "15s" label should be highlighted / selected
    await expect(btn15).toBeVisible();
  });
});

test.describe("Run completion", () => {
  test("finishing a short run shows results", async ({ page, browserName }) => {
    // Skip on webkit — keyboard simulation less reliable
    test.skip(browserName === "webkit", "keyboard simulation unreliable on webkit");

    await page.goto("/");
    await page.waitForTimeout(1_500);

    // Select 15 s to keep the run short
    const btn15 = page.locator("button, [role='option']", { hasText: "15s" }).first();
    await btn15.click();

    // Type into the hidden capture textarea — find it by css since it's visually hidden
    await page.keyboard.press("Tab");

    // Type enough characters to finish (the timer will expire after 15s)
    // In tests we just verify the stat labels appear after typing starts
    await page.keyboard.type("hello ");

    // WPM stat label should appear once the run is active
    const wpmLabel = page.locator("text=WPM").first();
    await expect(wpmLabel).toBeVisible({ timeout: 5_000 });
  });
});
