import { defineConfig, devices } from "@playwright/test";

// Credentials (SEED_ADMIN_*) come from .env; real environment variables win.
try {
  process.loadEnvFile();
} catch {
  // no .env — rely on the real environment
}

// E2E_BASE_URL points the tests at an already running server (e.g. the
// standalone build); without it the dev server is started/reused on :3000.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// E2E tests (PRD §11). They run against the dev server and the dev database
// (`npm run db:migrate && npm run db:seed && npm run seed:dev`), and clean
// up the zone they create. Chromium: `npx playwright install chromium`.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 90_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000/api/health",
        reuseExistingServer: true,
      },
});
