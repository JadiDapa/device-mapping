/**
 * Runtime migrator (not drizzle-kit): applies the committed migrations in
 * ./drizzle. If your app needs singleton/default rows, seed them here after
 * the migration step.
 */
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb, getSqlite } from "@/lib/db";

async function main() {
  const db = getDb();

  console.log("Running migrations...");
  migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete.");

  getSqlite().close();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
