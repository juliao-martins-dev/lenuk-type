/**
 * Captures a cropped screenshot of the leaderboard podium from the live site
 * and saves it to public/leaderboard-podium.png so the README can embed it
 * as a repo-local asset (fast, always renders, no third-party screenshot
 * service).
 *
 * Run:  npx playwright install chromium   (first time only)
 *       npx tsx scripts/capture-podium.ts
 */
import { chromium } from "@playwright/test";
import path from "node:path";

const TARGET_URL = process.env.PODIUM_URL ?? "https://lenuktype.fun/leaderboard";
const OUT_PATH = path.join(process.cwd(), "public", "leaderboard-podium.png");

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1800 },
    colorScheme: "dark",
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log(`→ loading ${TARGET_URL}`);
  await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 60_000 });

  // Prefer the data-testid when present (future builds); fall back to the
  // "Top 3 Champions" header on the currently deployed build.
  let podium = page.locator('[data-testid="podium-stage"]').first();
  if ((await podium.count()) === 0) {
    const header = page.getByText(/Top\s*3\s*Champions/i).first();
    await header.waitFor({ state: "visible", timeout: 30_000 });
    // Walk up to the rounded-3xl stage wrapper.
    podium = header.locator(
      'xpath=ancestor::div[contains(@class,"rounded-3xl")][1]'
    );
  }
  await podium.waitFor({ state: "visible", timeout: 30_000 });

  // Let fonts + trophy SVG gradients settle.
  await page.waitForTimeout(1500);

  console.log(`→ capturing podium to ${OUT_PATH}`);
  await podium.screenshot({ path: OUT_PATH });

  await browser.close();
  console.log("✓ done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
