import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end smoke tests. Run with `npm run e2e`.
 *
 * First-time setup (downloads browser binaries): `npx playwright install`.
 * By default this boots `next dev` on :3000; point at a deployed instance with
 * `PLAYWRIGHT_BASE_URL=https://… npm run e2e` and it will skip the local server.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
