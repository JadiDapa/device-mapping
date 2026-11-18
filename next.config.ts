import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // better-sqlite3 is already in Next's default serverExternalPackages
  // list, so no manual entry is needed here.
};

export default nextConfig;
