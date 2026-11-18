/**
 * Runtime migrator (not drizzle-kit): applies the committed migrations in
 * ./src/db/migrations.
 */
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDb, getDb } from "@/db";

async function main() {
  console.log("Running migrations...");
  try {
    await migrate(getDb(), { migrationsFolder: "./src/db/migrations" });
    console.log("Migrations complete.");
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
