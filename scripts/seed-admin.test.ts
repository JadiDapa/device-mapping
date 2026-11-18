import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { verifyPassword } from "better-auth/crypto";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { user, account } from "@/db/schema";
import { seedAdmin } from "./seed-admin";

describe("seedAdmin", () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: "./drizzle" });
  });

  it("creates a user and a credential account when no user exists", async () => {
    await seedAdmin(db, {
      email: "admin@example.com",
      password: "a-secure-password",
    });

    const users = db.select().from(user).all();
    expect(users).toHaveLength(1);
    expect(users[0]?.email).toBe("admin@example.com");
    expect(users[0]?.emailVerified).toBe(true);

    const accounts = db.select().from(account).all();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.providerId).toBe("credential");
    expect(accounts[0]?.password).toBeTruthy();
  });

  it("stores a password hash that verifies against the plaintext", async () => {
    await seedAdmin(db, {
      email: "admin@example.com",
      password: "a-secure-password",
    });

    const [row] = db.select().from(account).all();
    const hash = row?.password;
    expect(hash).toBeTruthy();

    const valid = await verifyPassword({
      hash: hash as string,
      password: "a-secure-password",
    });
    expect(valid).toBe(true);

    const invalid = await verifyPassword({
      hash: hash as string,
      password: "wrong-password",
    });
    expect(invalid).toBe(false);
  });

  it("is a no-op when a user already exists", async () => {
    await seedAdmin(db, {
      email: "admin@example.com",
      password: "first-password",
    });

    await seedAdmin(db, {
      email: "someone-else@example.com",
      password: "second-password",
    });

    const users = db.select().from(user).all();
    expect(users).toHaveLength(1);
    expect(users[0]?.email).toBe("admin@example.com");
  });
});
