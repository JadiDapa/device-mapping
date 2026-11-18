/**
 * Idempotent admin seed: creates one admin account from SEED_ADMIN_EMAIL /
 * SEED_ADMIN_PASSWORD, plus the default device types. Public sign-up is
 * disabled on the Better Auth instance, so this inserts the `user` and
 * `account` rows directly, using the same scrypt hashPassword Better Auth uses
 * internally so the stored hash verifies correctly on sign-in.
 *
 * Idempotent by EMAIL (not "any user exists"): the app is multi-user now.
 */
import { pathToFileURL } from "node:url";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import type { Database } from "@/db";
import { seedDeviceTypes } from "@/db/seed";
import { account, user } from "@/db/schema";

const MIN_PASSWORD_LENGTH = 8;

export type SeedCredentials = { email: string; password: string };

export function requireSeedCredentials(
  env: Record<string, string | undefined>,
): SeedCredentials {
  const email = env.SEED_ADMIN_EMAIL?.trim();
  const password = env.SEED_ADMIN_PASSWORD;
  const missing = [
    !email && "SEED_ADMIN_EMAIL",
    !password && "SEED_ADMIN_PASSWORD",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(
      `${missing.join(" and ")} must be set to seed the admin ` +
        "(SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD).",
    );
  }
  if (password!.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }
  return { email: email!, password: password! };
}

export async function seedAdmin(
  db: Database,
  options: SeedCredentials,
): Promise<{ created: boolean }> {
  const email = options.email.trim().toLowerCase();
  // Hash outside the transaction: it is CPU-bound and needs no DB connection.
  const hashedPassword = await hashPassword(options.password);

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (existing) return { created: false };

    const [created] = await tx
      .insert(user)
      .values({ name: "Admin", email, emailVerified: true, role: "admin" })
      .returning({ id: user.id });

    await tx.insert(account).values({
      accountId: created!.id,
      providerId: "credential",
      userId: created!.id,
      password: hashedPassword,
    });

    return { created: true };
  });
}

export async function seedAdminAndDefaults(
  db: Database,
  options: SeedCredentials,
): Promise<{ created: boolean }> {
  const result = await seedAdmin(db, options);
  await seedDeviceTypes(db);
  return result;
}

async function main() {
  const { getEnv } = await import("@/lib/env");
  const { closeDb, getDb } = await import("@/db");
  getEnv(); // fail fast on bad env, with a readable message
  const credentials = requireSeedCredentials(process.env);

  try {
    const result = await seedAdminAndDefaults(getDb(), credentials);
    console.log(
      result.created
        ? `Admin user created: ${credentials.email}`
        : `Admin user ${credentials.email} already exists, skipping.`,
    );
  } finally {
    await closeDb();
  }
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
