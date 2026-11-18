import { defineConfig, devices } from "@playwright/test";

// E2E tests are added from M2 onward (PRD §11). Chromium is installed with
// `npx playwright install chromium` when first needed.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
  },
});
