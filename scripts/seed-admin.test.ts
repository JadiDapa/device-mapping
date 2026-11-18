import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { createTestDb, type TestDb } from "@/test/db";
import { account, deviceTypes, user } from "@/db/schema";
import {
  requireSeedCredentials,
  seedAdmin,
  seedAdminAndDefaults,
} from "./seed-admin";

describe("requireSeedCredentials", () => {
  it("returns the credentials when both are set", () => {
    expect(
      requireSeedCredentials({
        SEED_ADMIN_EMAIL: "admin@example.com",
        SEED_ADMIN_PASSWORD: "supersecret1",
      }),
    ).toEqual({ email: "admin@example.com", password: "supersecret1" });
  });

  it("fails with a clear message when either is missing", () => {
    expect(() => requireSeedCredentials({})).toThrow(
      /SEED_ADMIN_EMAIL.*SEED_ADMIN_PASSWORD/,
    );
    expect(() =>
      requireSeedCredentials({ SEED_ADMIN_EMAIL: "a@b.co" }),
    ).toThrow(/SEED_ADMIN_PASSWORD/);
    expect(() =>
      requireSeedCredentials({ SEED_ADMIN_PASSWORD: "supersecret1" }),
    ).toThrow(/SEED_ADMIN_EMAIL/);
  });

  it("rejects a password shorter than Better Auth's 8-character minimum", () => {
    expect(() =>
      requireSeedCredentials({
        SEED_ADMIN_EMAIL: "a@b.co",
        SEED_ADMIN_PASSWORD: "short",
      }),
    ).toThrow(/8/);
  });
});

describe("seedAdmin", () => {
  let t: TestDb;
  const credentials = { email: "admin@example.com", password: "supersecret1" };

  beforeAll(async () => {
    t = await createTestDb();
  });

  afterAll(async () => {
    await t.close();
  });

  it("creates an admin user with a verifiable credential account", async () => {
    const result = await seedAdmin(t.db, credentials);
    expect(result).toEqual({ created: true });

    const [row] = await t.db
      .select()
      .from(user)
      .where(eq(user.email, credentials.email));
    expect(row).toBeDefined();
    expect(row!.role).toBe("admin");
    expect(row!.emailVerified).toBe(true);
    expect(row!.id).toMatch(/^[0-9a-f-]{36}$/);

    const [acc] = await t.db
      .select()
      .from(account)
      .where(eq(account.userId, row!.id));
    expect(acc!.providerId).toBe("credential");
    expect(acc!.password).toBeTruthy();
    expect(acc!.password).not.toBe(credentials.password);
    expect(
      await verifyPassword({
        hash: acc!.password!,
        password: credentials.password,
      }),
    ).toBe(true);
  });

  it("is idempotent for the same email", async () => {
    const again = await seedAdmin(t.db, credentials);
    expect(again).toEqual({ created: false });
    expect(await t.db.select().from(user)).toHaveLength(1);
    expect(await t.db.select().from(account)).toHaveLength(1);
  });

  it("still creates the admin when other users already exist", async () => {
    const result = await seedAdmin(t.db, {
      email: "second@example.com",
      password: "supersecret1",
    });
    expect(result).toEqual({ created: true });
    expect(await t.db.select().from(user)).toHaveLength(2);
  });

  it("does not demote or alter an existing user with the same email", async () => {
    await t.db
      .update(user)
      .set({ name: "Renamed" })
      .where(eq(user.email, credentials.email));
    await seedAdmin(t.db, credentials);
    const [row] = await t.db
      .select()
      .from(user)
      .where(eq(user.email, credentials.email));
    expect(row!.name).toBe("Renamed");
  });
});

describe("seedAdminAndDefaults", () => {
  let t: TestDb;

  beforeAll(async () => {
    t = await createTestDb();
  });

  afterAll(async () => {
    await t.close();
  });

  it("creates the admin and the default device types, idempotently", async () => {
    const opts = { email: "admin@example.com", password: "supersecret1" };
    await seedAdminAndDefaults(t.db, opts);
    await seedAdminAndDefaults(t.db, opts);
    expect(await t.db.select().from(user)).toHaveLength(1);
    const types = await t.db.select().from(deviceTypes);
    expect(types.map((x) => x.name).sort()).toEqual([
      "BLE Receiver",
      "Gateway",
    ]);
  });
});
