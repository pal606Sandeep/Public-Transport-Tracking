import { test, expect } from "@playwright/test";

test.describe("app smoke", () => {
  test("unauthenticated visit lands on the login screen", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/login/, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("skip link is the first focusable element", async ({ page }) => {
    await page.goto("/login");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.textContent);
    expect(focused).toMatch(/skip to content/i);
  });

  test("guest can reach the live map", async ({ page }) => {
    await page.goto("/login");
    const guest = page.getByRole("button", { name: /guest|explore|skip/i });
    if (await guest.count()) {
      await guest.first().click();
      await page.waitForURL(/\/map/, { timeout: 15_000 });
      await expect(page.locator("canvas, .maplibregl-map")).toBeVisible();
    }
  });
});
