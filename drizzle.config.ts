import { defineConfig } from "drizzle-kit";

// drizzle-kit is used only to GENERATE migrations. They are applied at runtime
// by scripts/migrate.ts (drizzle-orm's migrator), not by `drizzle-kit migrate`.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
