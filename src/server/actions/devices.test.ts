import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { asc, eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/db";
import {
  deviceStatusHistory,
  devices,
  deviceTypes,
  user,
  zones,
} from "@/db/schema";
import { ForbiddenError, UnauthorizedError } from "@/lib/authz";

const h = vi.hoisted(() => ({
  db: undefined as unknown,
  session: undefined as
    undefined | { user: { id: string; role: string } } | "forbidden" | "anon",
}));

vi.mock("@/db", () => ({ getDb: () => h.db }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => {
  const guard = async (adminOnly: boolean) => {
    if (h.session === "anon") throw new UnauthorizedError();
    if (h.session === "forbidden") {
      if (adminOnly) throw new ForbiddenError();
      return { user: { id: "guest", role: "guest" } };
    }
    if (h.session === undefined) throw new ForbiddenError();
    return h.session;
  };
  return {
    requireAdmin: () => guard(true),
    requireUser: () => guard(false),
  };
});

import {
  createDeviceTypeAction,
  deleteDeviceTypeAction,
  updateDeviceTypeAction,
} from "./deviceTypes";
import {
  createDeviceAction,
  deleteDeviceAction,
  getDeviceHistoryAction,
  moveDevicePositionAction,
  moveDeviceZoneAction,
  reorderDevicesAction,
  setDeviceStatusAction,
  updateDeviceAction,
} from "./devices";

describe("device server actions", () => {
  let t: TestDb;
  let adminId: string;
  let typeId: string;
  let zoneA: string;
  let zoneB: string;

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
    await t.db.delete(deviceTypes);
    const [ty] = await t.db
      .insert(deviceTypes)
      .values({ name: "Gateway", icon: "radio" })
      .returning();
    typeId = ty!.id;
    const [a] = await t.db.insert(zones).values({ name: "A" }).returning();
    const [b] = await t.db.insert(zones).values({ name: "B" }).returning();
    zoneA = a!.id;
    zoneB = b!.id;
    h.session = { user: { id: adminId, role: "admin" } };
  });

  afterAll(async () => {
    await t.close();
  });

  const validDevice = () => ({
    zoneId: zoneA,
    deviceTypeId: typeId,
    lat: -2.9,
    lng: 104.1,
    status: "not_installed",
  });

  async function add(): Promise<string> {
    const r = await createDeviceAction(validDevice());
    if (!r.ok) throw new Error("setup failed");
    return r.data.device.id;
  }

  it("admin creates three devices numbered 1..3 with a history row each", async () => {
    for (let i = 0; i < 3; i++) await add();
    const rows = await t.db.select().from(devices).orderBy(asc(devices.seq));
    expect(rows.map((r) => r.seq)).toEqual([1, 2, 3]);
    expect(await t.db.select().from(deviceStatusHistory)).toHaveLength(3);
  });

  it("guest is rejected (403) on every mutation and the DB is unchanged", async () => {
    const id = await add();
    h.session = "forbidden";
    const forbidden = { ok: false, status: 403 };

    expect(await createDeviceAction(validDevice())).toMatchObject(forbidden);
    expect(
      await updateDeviceAction(id, {
        deviceTypeId: typeId,
        isRouter: true,
      }),
    ).toMatchObject(forbidden);
    expect(
      await moveDevicePositionAction(id, { lat: 1, lng: 1 }),
    ).toMatchObject(forbidden);
    expect(
      await setDeviceStatusAction(id, {
        status: "tested",
        hasPower: false,
        hasFo: false,
        hasEthernet: false,
      }),
    ).toMatchObject(forbidden);
    expect(
      await reorderDevicesAction({ zoneId: zoneA, ids: [id] }),
    ).toMatchObject(forbidden);
    expect(await moveDeviceZoneAction(id, { zoneId: zoneB })).toMatchObject(
      forbidden,
    );
    expect(await deleteDeviceAction(id)).toMatchObject(forbidden);

    const rows = await t.db.select().from(devices);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      zoneId: zoneA,
      status: "not_installed",
      isRouter: false,
      lat: -2.9,
    });
    expect(await t.db.select().from(deviceStatusHistory)).toHaveLength(1);
  });

  it("guest is rejected on device-type mutations too", async () => {
    h.session = "forbidden";
    expect(
      await createDeviceTypeAction({ name: "X", icon: "wifi" }),
    ).toMatchObject({ ok: false, status: 403 });
    expect(
      await updateDeviceTypeAction(typeId, { name: "X", icon: "wifi" }),
    ).toMatchObject({ ok: false, status: 403 });
    expect(await deleteDeviceTypeAction(typeId)).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(await t.db.select().from(deviceTypes)).toHaveLength(1);
  });

  it("no session => 401", async () => {
    h.session = "anon";
    expect(await createDeviceAction(validDevice())).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("partial without checklist or note => 422; with a checkbox => ok", async () => {
    const id = await add();
    const base = {
      hasPower: false,
      hasFo: false,
      hasEthernet: false,
      status: "partial",
    };
    const bad = await setDeviceStatusAction(id, base);
    expect(bad).toMatchObject({ ok: false, status: 422 });
    if (!bad.ok)
      expect(bad.fieldErrors?.partialNote?.length).toBeGreaterThan(0);

    const good = await setDeviceStatusAction(id, { ...base, hasFo: true });
    expect(good.ok).toBe(true);
    const [row] = await t.db.select().from(devices).where(eq(devices.id, id));
    expect(row).toMatchObject({ status: "partial", hasFo: true });
    expect(await t.db.select().from(deviceStatusHistory)).toHaveLength(2);
  });

  it("create with partial and no info is rejected server-side", async () => {
    const r = await createDeviceAction({ ...validDevice(), status: "partial" });
    expect(r).toMatchObject({ ok: false, status: 422 });
    expect(await t.db.select().from(devices)).toHaveLength(0);
  });

  it("validates input (422) and unknown ids (404)", async () => {
    expect(
      await createDeviceAction({ ...validDevice(), lat: 500 }),
    ).toMatchObject({ ok: false, status: 422 });
    expect(
      await deleteDeviceAction("00000000-0000-0000-0000-000000000000"),
    ).toMatchObject({ ok: false, status: 404 });
    expect(await deleteDeviceAction("not-a-uuid")).toMatchObject({
      ok: false,
      status: 422,
    });
  });

  it("reorder: 3 -> position 1, mismatch => 409", async () => {
    const a = await add();
    const b = await add();
    const c = await add();
    expect(
      await reorderDevicesAction({ zoneId: zoneA, ids: [c, a, b] }),
    ).toMatchObject({ ok: true });
    const rows = await t.db.select().from(devices).orderBy(asc(devices.seq));
    expect(rows.map((r) => r.id)).toEqual([c, a, b]);

    expect(
      await reorderDevicesAction({ zoneId: zoneA, ids: [c, a] }),
    ).toMatchObject({ ok: false, status: 409 });
  });

  it("move zone and delete keep both zones numbered without gaps", async () => {
    const a = await add();
    await add();
    const moved = await moveDeviceZoneAction(a, { zoneId: zoneB });
    expect(moved).toMatchObject({ ok: true });
    const rowsA = await t.db
      .select()
      .from(devices)
      .where(eq(devices.zoneId, zoneA));
    expect(rowsA.map((r) => r.seq)).toEqual([1]);

    expect(await deleteDeviceAction(a)).toMatchObject({ ok: true });
    expect(await t.db.select().from(devices)).toHaveLength(1);
  });

  it("device type delete in use => 409 with the count in the message", async () => {
    await add();
    await add();
    const r = await deleteDeviceTypeAction(typeId);
    expect(r).toMatchObject({ ok: false, status: 409 });
    if (!r.ok) expect(r.error).toContain("2");
  });

  it("history is readable by a guest", async () => {
    const id = await add();
    h.session = "forbidden";
    const r = await getDeviceHistoryAction(id);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.history).toHaveLength(1);
  });
});
