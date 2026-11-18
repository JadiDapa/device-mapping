import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Export renders pages in headless Chromium at request time; keep Playwright
  // out of the bundle and let Next trace it into the standalone output.
  serverExternalPackages: ["playwright", "playwright-core"],
  // playwright-core reads files such as browsers.json at runtime, which the
  // file tracer cannot see, so ship the whole package with the export routes.
  outputFileTracingIncludes: {
    "/api/export/png": ["./node_modules/playwright-core/**/*"],
    "/api/export/pdf": ["./node_modules/playwright-core/**/*"],
  },
};

export default nextConfig;
