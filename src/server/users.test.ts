import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { createTestDb, type TestDb } from "@/test/db";
import { account, session, user } from "@/db/schema";
import {
  createUser,
  LastAdminError,
  listUsers,
  resetUserPassword,
  SelfModifyError,
  setUserActive,
  setUserRole,
  UserEmailTakenError,
  UserNotFoundError,
} from "./users";

describe("server/users", () => {
  let t: TestDb;
  let adminId: string;

  const input = (email: string, role: "admin" | "guest" = "guest") => ({
    name: "Tes",
    email,
    password: "rahasia123",
    role,
  });
  const hashOf = async (userId: string) => {
    const [acc] = await t.db
      .select()
      .from(account)
      .where(eq(account.userId, userId));
    return acc!.password!;
  };

  beforeAll(async () => {
    t = await createTestDb();
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await t.db.delete(user);
    adminId = (await createUser(t.db, input("admin@example.com", "admin"))).id;
  });

  it("creates a user with a verifiable credential", async () => {
    const { id } = await createUser(t.db, input("a@example.com"));
    expect(
      await verifyPassword({ hash: await hashOf(id), password: "rahasia123" }),
    ).toBe(true);
    expect(await listUsers(t.db)).toHaveLength(2);
  });

  it("rejects a duplicate email", async () => {
    await createUser(t.db, input("a@example.com"));
    await expect(
      createUser(t.db, input("a@example.com")),
    ).rejects.toBeInstanceOf(UserEmailTakenError);
  });

  it("changes role, but never your own and never the last admin", async () => {
    const { id } = await createUser(t.db, input("a@example.com"));
    await setUserRole(t.db, adminId, id, "admin");
    expect((await listUsers(t.db)).find((u) => u.id === id)?.role).toBe(
      "admin",
    );
    await expect(
      setUserRole(t.db, adminId, adminId, "guest"),
    ).rejects.toBeInstanceOf(SelfModifyError);

    // Demote the other admin (adminId remains), then adminId is the last one.
    await setUserRole(t.db, adminId, id, "guest");
    await expect(
      setUserRole(t.db, id, adminId, "guest"),
    ).rejects.toBeInstanceOf(LastAdminError);
    await expect(
      setUserRole(
        t.db,
        adminId,
        "00000000-0000-0000-0000-000000000000",
        "guest",
      ),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("deactivating bans the user and ends their sessions", async () => {
    const { id } = await createUser(t.db, input("a@example.com"));
    await t.db.insert(session).values({
      token: "tok",
      userId: id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await setUserActive(t.db, adminId, id, false);
    expect((await listUsers(t.db)).find((u) => u.id === id)?.banned).toBe(true);
    expect(await t.db.select().from(session)).toHaveLength(0);

    await setUserActive(t.db, adminId, id, true);
    expect((await listUsers(t.db)).find((u) => u.id === id)?.banned).toBe(
      false,
    );
    await expect(
      setUserActive(t.db, adminId, adminId, false),
    ).rejects.toBeInstanceOf(SelfModifyError);
  });

  it("cannot deactivate the last active admin", async () => {
    const { id: c } = await createUser(t.db, input("c@example.com", "admin"));
    await setUserActive(t.db, c, adminId, false);
    await expect(setUserActive(t.db, adminId, c, false)).rejects.toBeInstanceOf(
      LastAdminError,
    );
  });

  it("resets a password", async () => {
    const { id } = await createUser(t.db, input("a@example.com"));
    await resetUserPassword(t.db, id, "passwordbaru1");
    expect(
      await verifyPassword({
        hash: await hashOf(id),
        password: "passwordbaru1",
      }),
    ).toBe(true);
  });
});
