import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * PostgreSQL connection (postgres.js + Drizzle), created lazily and cached on
 * globalThis so dev hot-reload doesn't open duplicate pools.
 *
 * Lazy on purpose: Next.js imports every route module during `next build`
 * to collect its config (e.g. `export const runtime`), which happens
 * before any runtime environment variables are available in the Docker
 * build. Opening the connection — and therefore validating env — at import
 * time breaks the build. `getDb` only touches the real connection on first
 * actual call, which happens at request time.
 */
export type Database = PostgresJsDatabase<typeof schema>;

declare global {
  var __appSql: ReturnType<typeof postgres> | undefined;
  var __appDb: Database | undefined;
}

export function getDb(): Database {
  if (!globalThis.__appDb) {
    const { DATABASE_URL } = getEnv();
    globalThis.__appSql = postgres(DATABASE_URL, { max: 10 });
    globalThis.__appDb = drizzle({ client: globalThis.__appSql, schema });
  }
  return globalThis.__appDb;
}

/** Close the pool (scripts must call this or the process never exits). */
export async function closeDb(): Promise<void> {
  const sql = globalThis.__appSql;
  globalThis.__appSql = undefined;
  globalThis.__appDb = undefined;
  if (sql) await sql.end({ timeout: 5 });
}
