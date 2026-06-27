import { test, expect } from "@playwright/test";

// Visual regression tests for the home page.
// First run creates baseline snapshots in __snapshots__/.
// Subsequent runs compare against the baseline — fail if diff > 2%.
// To update baselines after intentional design changes:
//   npx playwright test --update-snapshots

test.describe("Home page — visual snapshots", () => {
  test.beforeEach(async ({ page }) => {
    // Block auth/Supabase calls so we always render as guest
    await page.route("**/auth/v1/**", (route) => route.fulfill({ status: 200, body: "{}" }));
    await page.route("**/rest/v1/**", (route) => route.fulfill({ status: 200, body: "{}" }));
    await page.goto("/", { waitUntil: "networkidle" });
  });

  test("guest form view", async ({ page }) => {
    // Wait for the form card to be visible
    await page.waitForSelector("form, [data-phase='form']", { timeout: 10_000 }).catch(() => {});
    await expect(page).toHaveScreenshot("home-guest-form.png");
  });

  test("prompt filled state", async ({ page }) => {
    const textarea = page.locator("textarea").first();
    await textarea.fill("ילדה קטנה שטסה עם כוכב להרפתקה בין העננים");
    await expect(page).toHaveScreenshot("home-prompt-filled.png");
  });

  test("mobile — guest form view", async ({ page }) => {
    // This test is run with iPhone 12 Pro viewport from playwright.config.ts
    await expect(page).toHaveScreenshot("home-mobile-guest-form.png");
  });
});
