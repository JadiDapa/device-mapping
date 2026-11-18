/**
 * Runtime migrator (not drizzle-kit): applies the committed migrations in
 * ./src/db/migrations.
 */
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDb, getDb } from "@/db";

async function main() {
  // Migrations must use a direct (non-pooled) connection when one is provided.
  if (process.env.DATABASE_URL_UNPOOLED) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
  }
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
