/**
 * Idempotent admin seed: "Single admin account created on first
 * boot from environment variables; public sign-up disabled."
 *
 * Sign-up is disabled on the Better Auth instance, so this inserts the
 * `user` and `account` rows directly rather than calling a sign-up
 * endpoint — the same scrypt hashPassword Better Auth's own admin plugin
 * uses internally, so the stored hash verifies correctly on sign-in.
 */
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { hashPassword } from "better-auth/crypto";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";
import { user, account } from "@/db/schema";

export async function seedAdmin(
  db: BetterSQLite3Database<typeof schema>,
  options: { email: string; password: string },
): Promise<{ created: boolean }> {
  const existingUser = db.select().from(user).get();
  if (existingUser) {
    return { created: false };
  }

  const now = new Date();
  const userId = randomUUID();

  db.insert(user)
    .values({
      id: userId,
      name: "Admin",
      email: options.email,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const hashedPassword = await hashPassword(options.password);

  db.insert(account)
    .values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { created: true };
}

async function main() {
  const { getEnv } = await import("@/lib/env");
  const { getDb, getSqlite } = await import("@/db");
  const env = getEnv();

  const result = await seedAdmin(getDb(), {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  });

  if (result.created) {
    console.log(`Admin user created: ${env.ADMIN_EMAIL}`);
  } else {
    console.log("Admin user already exists, skipping seed.");
  }

  getSqlite().close();
}

// Only run as a script, not when imported by tests.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error("Admin seed failed:", error);
    process.exit(1);
  });
}
