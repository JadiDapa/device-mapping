import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * better-sqlite3 connection, created lazily and cached on globalThis so dev
 * hot-reload doesn't open duplicate handles.
 *
 * Lazy on purpose: Next.js imports every route module during `next build`
 * to collect its config (e.g. `export const runtime`), which happens
 * before any runtime environment variables are available in the Docker
 * build. Opening the connection — and therefore validating env — at import
 * time breaks the build. `getSqlite`/`getDb` only touch the real
 * connection on first actual call, which happens at request time.
 *
 * WAL mode + foreign keys are enabled on startup.
 */
declare global {
  // eslint-disable-next-line no-var
  var __appSqlite: Database.Database | undefined;
  // eslint-disable-next-line no-var
  var __appDb: BetterSQLite3Database<typeof schema> | undefined;
}

function createConnection(): Database.Database {
  const { DATABASE_PATH } = getEnv();
  mkdirSync(dirname(DATABASE_PATH), { recursive: true });

  const sqlite = new Database(DATABASE_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("busy_timeout = 5000");
  return sqlite;
}

export function getSqlite(): Database.Database {
  if (!globalThis.__appSqlite) {
    globalThis.__appSqlite = createConnection();
  }
  return globalThis.__appSqlite;
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!globalThis.__appDb) {
    globalThis.__appDb = drizzle(getSqlite(), { schema });
  }
  return globalThis.__appDb;
}
