import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { getEnv } from "@/lib/env";

/**
 * Single admin, email/password, sign-up disabled. The admin
 * account is seeded by scripts/seed-admin.ts, not through this auth
 * instance's sign-up endpoint (which is disabled).
 *
 * The app runs on plain HTTP on a LAN reachable by multiple hosts
 * (localhost on the PC, the LAN IP from phones). `allowedHosts`
 * resolves the base URL per request from the Host header instead of a
 * single pinned BETTER_AUTH_URL, and `protocol: "http"` turns off the
 * Secure cookie flag that plain HTTP needs. Host patterns are restricted to
 * loopback and private LAN ranges, not a wildcard, so this isn't an open
 * trusted-origin policy.
 *
 * Built lazily and cached: constructing this eagerly at module load would
 * call getEnv()/getDb() during `next build`'s route-data collection, before
 * any runtime environment variables exist in the Docker build.
 */
let cached: ReturnType<typeof buildAuth> | undefined;

function buildAuth() {
  const env = getEnv();
  const options = {
    database: drizzleAdapter(getDb(), {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24,
    },
    baseURL: {
      allowedHosts: [
        "localhost:*",
        "127.0.0.1:*",
        "192.168.*.*",
        "10.*.*.*",
        "172.16.*.*",
      ],
      protocol: "http",
      fallback: "http://localhost:3000",
    },
    trustedOrigins: env.trustedOrigins,
    secret: env.BETTER_AUTH_SECRET,
    plugins: [nextCookies()],
  } satisfies BetterAuthOptions;

  return betterAuth(options);
}

export function getAuth() {
  if (!cached) {
    cached = buildAuth();
  }
  return cached;
}
