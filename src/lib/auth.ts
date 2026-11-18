import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { getEnv } from "@/lib/env";
import { assertRole, UnauthorizedError } from "@/lib/authz";

/**
 * Email/password auth, sign-up disabled, roles `admin | guest` via the Better
 * Auth admin plugin (createUser, setRole, setUserPassword, banUser — used by
 * /admin/users in M7). The first admin is seeded by scripts/seed-admin.ts.
 *
 * Ids are UUIDs (`advanced.database.generateId: "uuid"`) to match PRD §5.
 *
 * The app runs on plain HTTP on a LAN reachable by multiple hosts
 * (localhost on the PC, the LAN IP from phones). Unless BETTER_AUTH_URL pins
 * one origin, `allowedHosts` resolves the base URL per request from the Host
 * header, and `protocol: "http"` turns off the Secure cookie flag that plain
 * HTTP needs. Host patterns are restricted to loopback and private LAN
 * ranges, not a wildcard, so this isn't an open trusted-origin policy.
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
      provider: "pg",
      schema,
    }),
    advanced: {
      database: { generateId: "uuid" },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24,
    },
    baseURL: env.BETTER_AUTH_URL
      ? env.BETTER_AUTH_URL
      : {
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
    plugins: [
      admin({ defaultRole: "guest", adminRoles: ["admin"] }),
      nextCookies(),
    ],
  } satisfies BetterAuthOptions;

  return betterAuth(options);
}

export function getAuth() {
  if (!cached) {
    cached = buildAuth();
  }
  return cached;
}

/** Current session for this request (deduplicated per render pass). */
export const getSession = cache(async () =>
  getAuth().api.getSession({ headers: await headers() }),
);

/**
 * Any signed-in user. In Server Actions / Route Handlers this throws
 * UnauthorizedError (401). Pass `{ redirectTo }` from pages/layouts to
 * redirect to the login page instead.
 */
export async function requireUser(options?: { redirectTo?: string }) {
  const session = await getSession();
  if (!session && options?.redirectTo) redirect(options.redirectTo);
  if (!session) throw new UnauthorizedError();
  return session;
}

/** Admin only. 401 without a session, ForbiddenError (403) for a guest. */
export async function requireAdmin() {
  return assertRole(await getSession(), "admin");
}
