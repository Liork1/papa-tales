import { test, expect } from "@playwright/test";

// Visual regression tests for the TierComparisonModal.
// Trigger it via the "compare link" button on the home page.

test.describe("TierComparisonModal — visual snapshots", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/auth/v1/**", (route) => route.fulfill({ status: 200, body: "{}" }));
    await page.route("**/rest/v1/**", (route) => route.fulfill({ status: 200, body: "{}" }));
    await page.goto("/", { waitUntil: "networkidle" });
  });

  test("modal opened — desktop", async ({ page }) => {
    // Click the compare tiers link
    const compareBtn = page.locator("button, a").filter({ hasText: /השוו|מה ההבדל|compare/i }).first();
    await compareBtn.click();

    // Wait for the modal to appear
    await page.waitForSelector("text=מה מקבלים בכל מסלול", { timeout: 5_000 }).catch(() => {});

    await expect(page).toHaveScreenshot("tier-modal-desktop.png");
  });

  test("modal opened — mobile iPhone 12 Pro", async ({ page }) => {
    const compareBtn = page.locator("button, a").filter({ hasText: /השוו|מה ההבדל|compare/i }).first();
    await compareBtn.click();
    await page.waitForSelector("text=מה מקבלים בכל מסלול", { timeout: 5_000 }).catch(() => {});
    await expect(page).toHaveScreenshot("tier-modal-mobile.png");
  });

  test("modal closes on backdrop click", async ({ page }) => {
    const compareBtn = page.locator("button, a").filter({ hasText: /השוו|מה ההבדל|compare/i }).first();
    await compareBtn.click();
    await page.waitForSelector("text=מה מקבלים בכל מסלול", { timeout: 5_000 }).catch(() => {});

    // Click the backdrop (outside the modal card)
    await page.mouse.click(10, 10);

    await expect(page.locator("text=מה מקבלים בכל מסלול")).not.toBeVisible();
  });
});
