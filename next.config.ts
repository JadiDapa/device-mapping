import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Export renders pages in headless Chromium at request time; keep Playwright
  // out of the bundle and let Next trace it into the standalone output.
  serverExternalPackages: ["playwright", "playwright-core"],
};

export default nextConfig;
