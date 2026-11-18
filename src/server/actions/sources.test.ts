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
import { devices, deviceTypes, networkSources, user, zones } from "@/db/schema";
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

import { createDeviceAction, updateDeviceAction } from "./devices";
import {
  createNetworkSourceAction,
  deleteNetworkSourceAction,
  moveNetworkSourcePositionAction,
  updateNetworkSourceAction,
} from "./sources";

const NIL = "00000000-0000-4000-8000-000000000000";

describe("network source server actions", () => {
  let t: TestDb;
  let adminId: string;
  let typeId: string;
  let zoneId: string;

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
    await t.db.delete(networkSources);
    await t.db.delete(zones);
    await t.db.delete(deviceTypes);
    const [ty] = await t.db
      .insert(deviceTypes)
      .values({ name: "Gateway", icon: "radio" })
      .returning();
    typeId = ty!.id;
    const [z] = await t.db.insert(zones).values({ name: "A" }).returning();
    zoneId = z!.id;
    h.session = { user: { id: adminId, role: "admin" } };
  });

  afterAll(async () => {
    await t.close();
  });

  const valid = () => ({
    name: "Shelter",
    kind: "Shelter",
    zoneId,
    lat: -3,
    lng: 104.8,
  });

  it("admin creates, updates, moves and deletes a source", async () => {
    const c = await createNetworkSourceAction(valid());
    if (!c.ok) throw new Error("create failed");
    const sid = c.data.source.id;

    const u = await updateNetworkSourceAction(sid, {
      ...valid(),
      name: "Panel",
      kind: "Panel",
    });
    expect(u).toMatchObject({ ok: true, data: { source: { name: "Panel" } } });

    const m = await moveNetworkSourcePositionAction(sid, { lat: 1, lng: 2 });
    expect(m).toMatchObject({ ok: true, data: { source: { lat: 1, lng: 2 } } });

    expect(await deleteNetworkSourceAction(sid)).toMatchObject({ ok: true });
    expect(await t.db.select().from(networkSources)).toHaveLength(0);
  });

  it("guest is rejected (403) on every mutation and the DB is unchanged", async () => {
    const c = await createNetworkSourceAction(valid());
    if (!c.ok) throw new Error("setup failed");
    const sid = c.data.source.id;

    h.session = "forbidden";
    const forbidden = { ok: false, status: 403 };
    expect(await createNetworkSourceAction(valid())).toMatchObject(forbidden);
    expect(await updateNetworkSourceAction(sid, valid())).toMatchObject(
      forbidden,
    );
    expect(
      await moveNetworkSourcePositionAction(sid, { lat: 1, lng: 2 }),
    ).toMatchObject(forbidden);
    expect(await deleteNetworkSourceAction(sid)).toMatchObject(forbidden);

    const rows = await t.db.select().from(networkSources);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Shelter", lat: -3 });
  });

  it("unauthenticated callers get 401", async () => {
    h.session = "anon";
    expect(await createNetworkSourceAction(valid())).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("re-validates input on the server (422) and maps unknown ids (404)", async () => {
    expect(
      await createNetworkSourceAction({ ...valid(), name: "" }),
    ).toMatchObject({ ok: false, status: 422 });
    expect(
      await createNetworkSourceAction({ ...valid(), lat: 99 }),
    ).toMatchObject({ ok: false, status: 422 });
    expect(await updateNetworkSourceAction(NIL, valid())).toMatchObject({
      ok: false,
      status: 404,
    });
    expect(await deleteNetworkSourceAction(NIL)).toMatchObject({
      ok: false,
      status: 404,
    });
    expect(
      await createNetworkSourceAction({ ...valid(), zoneId: NIL }),
    ).toMatchObject({ ok: false, status: 404 });
  });

  it("device actions accept an optional source and report an unknown one as 404", async () => {
    const c = await createNetworkSourceAction(valid());
    if (!c.ok) throw new Error("setup failed");
    const base = {
      zoneId,
      deviceTypeId: typeId,
      lat: -3,
      lng: 104.8,
      status: "not_installed",
    };

    const withSource = await createDeviceAction({
      ...base,
      networkSourceId: c.data.source.id,
    });
    if (!withSource.ok) throw new Error("create failed");
    expect(withSource.data.device.networkSourceId).toBe(c.data.source.id);

    const detached = await updateDeviceAction(withSource.data.device.id, {
      deviceTypeId: typeId,
      networkSourceId: "",
    });
    expect(detached).toMatchObject({
      ok: true,
      data: { device: { networkSourceId: null } },
    });

    expect(
      await createDeviceAction({ ...base, networkSourceId: NIL }),
    ).toMatchObject({ ok: false, status: 404 });
    expect(await t.db.select().from(devices)).toHaveLength(1);
  });
});
