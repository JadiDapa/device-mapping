import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Export renders pages in headless Chromium at request time; keep Playwright
  // out of the bundle and let Next trace it into the standalone output.
  serverExternalPackages: [
    "playwright",
    "playwright-core",
    "@sparticuz/chromium",
  ],
  // playwright-core reads files such as browsers.json at runtime, which the
  // file tracer cannot see, so ship the whole package with the export routes.
  outputFileTracingIncludes: {
    // @sparticuz/chromium ships the compressed browser in bin/ (used on Vercel).
    "/api/export/png": [
      "./node_modules/playwright-core/**/*",
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
    "/api/export/pdf": [
      "./node_modules/playwright-core/**/*",
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
  },
};

export default nextConfig;
