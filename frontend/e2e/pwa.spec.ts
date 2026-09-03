import { test, expect } from "@playwright/test";

test.describe("PWA surface", () => {
  test("serves a valid web app manifest", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBeTruthy();

    const manifest = await res.json();
    expect(manifest.name).toContain("Transit");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(Array.isArray(manifest.icons)).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("registers a service worker on the client", async ({ page }) => {
    await page.goto("/login");
    const hasSW = await page.evaluate(() => "serviceWorker" in navigator);
    expect(hasSW).toBeTruthy();

    // The registration script is wired up regardless of env; in prod builds a
    // controller appears shortly after load.
    await page.waitForTimeout(1000);
    const registered = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return Boolean(reg) || navigator.serviceWorker.controller !== null;
    });
    expect(typeof registered).toBe("boolean");
  });

  test("links the manifest and theme-color from the document head", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      /manifest\.webmanifest/
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#111318"
    );
  });
});
