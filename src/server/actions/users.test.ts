import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createTestDb, type TestDb } from "@/test/db";
import { user } from "@/db/schema";
import { ForbiddenError, UnauthorizedError } from "@/lib/authz";

const h = vi.hoisted(() => ({
  db: undefined as unknown,
  session: undefined as
    undefined | { user: { id: string; role: string } } | "forbidden" | "anon",
}));

vi.mock("@/db", () => ({ getDb: () => h.db }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireAdmin: async () => {
    if (h.session === "anon") throw new UnauthorizedError();
    if (h.session === "forbidden" || h.session === undefined) {
      throw new ForbiddenError();
    }
    return h.session;
  },
}));

import {
  createUserAction,
  resetUserPasswordAction,
  setUserActiveAction,
  setUserRoleAction,
} from "./users";

describe("user server actions", () => {
  let t: TestDb;
  let adminId: string;

  const valid = {
    name: "Budi",
    email: "budi@example.com",
    password: "rahasia123",
    role: "guest",
  };

  beforeAll(async () => {
    t = await createTestDb();
    h.db = t.db;
  });
  beforeEach(async () => {
    await t.db.delete(user);
    const [u] = await t.db
      .insert(user)
      .values({ name: "A", email: "a@example.com", role: "admin" })
      .returning();
    adminId = u!.id;
    h.session = { user: { id: adminId, role: "admin" } };
  });
  afterAll(async () => {
    await t.close();
  });

  it("admin creates a user and changes role, password and active state", async () => {
    const created = await createUserAction(valid);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const uid = created.data.id;

    expect(await setUserRoleAction(uid, "admin")).toMatchObject({ ok: true });
    expect(
      await resetUserPasswordAction(uid, { password: "baru12345" }),
    ).toMatchObject({ ok: true });
    expect(await setUserActiveAction(uid, false)).toMatchObject({ ok: true });
  });

  it("a guest is rejected with 403 and nothing changes", async () => {
    h.session = "forbidden";
    expect(await createUserAction(valid)).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(await t.db.select().from(user)).toHaveLength(1);
    expect(await setUserRoleAction(adminId, "guest")).toMatchObject({
      status: 403,
    });
    expect(await setUserActiveAction(adminId, false)).toMatchObject({
      status: 403,
    });
    expect(
      await resetUserPasswordAction(adminId, { password: "baru12345" }),
    ).toMatchObject({ status: 403 });
  });

  it("no session => 401", async () => {
    h.session = "anon";
    expect(await createUserAction(valid)).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("maps validation, duplicate email and self-modify errors", async () => {
    expect(await createUserAction({ ...valid, password: "x" })).toMatchObject({
      status: 422,
    });
    await createUserAction(valid);
    expect(await createUserAction(valid)).toMatchObject({ status: 409 });
    expect(await setUserRoleAction(adminId, "guest")).toMatchObject({
      status: 422,
    });
  });
});
