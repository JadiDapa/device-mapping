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
import { user, zones } from "@/db/schema";
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

import { createZoneAction, deleteZoneAction, updateZoneAction } from "./zones";

describe("zone server actions", () => {
  let t: TestDb;
  let adminId: string;

  beforeAll(async () => {
    t = await createTestDb();
    h.db = t.db;
    const [u] = await t.db
      .insert(user)
      .values({ name: "A", email: "a@example.com", role: "admin" })
      .returning();
    adminId = u!.id;
  });

  beforeEach(async () => {
    await t.db.delete(zones);
    h.session = { user: { id: adminId, role: "admin" } };
  });

  afterAll(async () => {
    await t.close();
  });

  const valid = { name: "Pusri 2B", description: "", boundary: null };

  it("admin can create, update and delete a zone", async () => {
    const created = await createZoneAction(valid);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const zoneId = created.data.id;

    const updated = await updateZoneAction(zoneId, { ...valid, name: "P2B" });
    expect(updated.ok).toBe(true);

    const del = await deleteZoneAction(zoneId, "P2B");
    expect(del.ok).toBe(true);
    expect(await t.db.select().from(zones)).toHaveLength(0);
  });

  it("a guest is rejected with 403 and the database is unchanged", async () => {
    h.session = "forbidden";
    const res = await createZoneAction(valid);
    expect(res).toMatchObject({ ok: false, status: 403 });
    expect(await t.db.select().from(zones)).toHaveLength(0);
  });

  it("guest cannot update or delete an existing zone", async () => {
    const created = await createZoneAction(valid);
    if (!created.ok) throw new Error("setup failed");
    h.session = "forbidden";

    expect(
      await updateZoneAction(created.data.id, { ...valid, name: "X" }),
    ).toMatchObject({ ok: false, status: 403 });
    expect(await deleteZoneAction(created.data.id, "Pusri 2B")).toMatchObject({
      ok: false,
      status: 403,
    });
    const rows = await t.db.select().from(zones);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe("Pusri 2B");
  });

  it("no session => 401", async () => {
    h.session = "anon";
    expect(await createZoneAction(valid)).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("re-validates input on the server (422 with field errors)", async () => {
    const res = await createZoneAction({ name: "  ", boundary: null });
    expect(res).toMatchObject({ ok: false, status: 422 });
    if (!res.ok) expect(res.fieldErrors?.name?.length).toBeGreaterThan(0);
  });

  it("maps a duplicate name to 409 and a wrong confirmation to 422", async () => {
    const a = await createZoneAction(valid);
    expect(await createZoneAction(valid)).toMatchObject({
      ok: false,
      status: 409,
    });
    if (!a.ok) throw new Error("setup failed");
    expect(await deleteZoneAction(a.data.id, "nope")).toMatchObject({
      ok: false,
      status: 422,
    });
  });

  it("returns 404 for an unknown zone", async () => {
    expect(
      await updateZoneAction("00000000-0000-0000-0000-000000000000", valid),
    ).toMatchObject({ ok: false, status: 404 });
  });
});
