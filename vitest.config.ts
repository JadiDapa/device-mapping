import { defineConfig } from "vitest/config";
import path from "node:path";

// Make TEST_DATABASE_URL / DATABASE_URL from .env available to DB tests.
// Real environment variables (CI) win over the file; a missing file is fine.
try {
  process.loadEnvFile();
} catch {
  // no .env — rely on the real environment
}

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    exclude: ["node_modules", "e2e/**", ".next/**"],
    // DB tests share one Postgres test database and reset it per file.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
