import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@/db/schema";
import type { Database } from "@/db";

/**
 * Test database helper. Every call to createTestDb() WIPES the target
 * database (DROP SCHEMA public/drizzle CASCADE) and re-applies the committed
 * migrations, so each test file starts from a clean, fully migrated schema.
 *
 * Because it is destructive, resolveTestDatabaseUrl() refuses anything that
 * could be real data: it must come from TEST_DATABASE_URL, must not point at
 * the same database as DATABASE_URL, and the database name must contain "test".
 */
type EnvLike = Record<string, string | undefined>;

function identity(url: string): string {
  const u = new URL(url);
  return `${u.hostname.toLowerCase()}:${u.port || "5432"}${u.pathname}`;
}

export function resolveTestDatabaseUrl(env: EnvLike = process.env): string {
  const url = env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Point it at a dedicated, empty Postgres " +
        "database (e.g. postgresql://user:pass@localhost:5432/device-mapper-test).",
    );
  }
  if (env.DATABASE_URL && identity(url) === identity(env.DATABASE_URL)) {
    throw new Error(
      "TEST_DATABASE_URL must not point at the same database as DATABASE_URL: " +
        "tests drop and recreate the schema.",
    );
  }
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!/test/i.test(dbName)) {
    throw new Error(
      `Refusing to wipe database "${dbName}": the test database name must contain "test".`,
    );
  }
  return url;
}

export type TestDb = {
  db: Database;
  sql: ReturnType<typeof postgres>;
  close: () => Promise<void>;
};

export async function createTestDb(): Promise<TestDb> {
  const url = resolveTestDatabaseUrl();
  const sql = postgres(url, { max: 4, onnotice: () => {} });

  await sql.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
  await sql.unsafe("DROP SCHEMA public CASCADE");
  await sql.unsafe("CREATE SCHEMA public");

  const db = drizzle({ client: sql, schema });
  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "src/db/migrations"),
  });

  return { db, sql, close: () => sql.end({ timeout: 5 }) };
}
