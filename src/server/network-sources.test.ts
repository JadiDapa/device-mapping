import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/db";
import { devices, deviceTypes, networkSources, user, zones } from "@/db/schema";
import type { DeviceCreateInput } from "@/lib/validators/device";
import { createDevice, getDevice, updateDevice } from "./devices";
import {
  createNetworkSource,
  deleteNetworkSource,
  getNetworkSource,
  listNetworkSources,
  listSourceDevices,
  listSourceKinds,
  listSourcesForZone,
  moveNetworkSourcePosition,
  NetworkSourceNotFoundError,
  updateNetworkSource,
} from "./network-sources";
import { ZoneNotFoundError } from "./zones";

const NIL = "00000000-0000-0000-0000-000000000000";

describe("network sources data layer", () => {
  let t: TestDb;
  let userId: string;
  let typeId: string;
  let zoneA: string;
  let zoneB: string;

  const src = (
    over: Partial<Parameters<typeof createNetworkSource>[1]> = {},
  ) => ({
    name: "Shelter",
    kind: "Shelter",
    description: null,
    zoneId: null,
    lat: -3,
    lng: 104.8,
    ...over,
  });
  const dev = (over: Partial<DeviceCreateInput> = {}): DeviceCreateInput => ({
    zoneId: zoneA,
    deviceTypeId: typeId,
    isRouter: false,
    locationDetail: null,
    notes: null,
    networkSourceId: null,
    lat: -3,
    lng: 104.8,
    status: "not_installed",
    hasPower: false,
    hasFo: false,
    hasEthernet: false,
    partialNote: null,
    ...over,
  });

  beforeAll(async () => {
    t = await createTestDb();
    const [u] = await t.db
      .insert(user)
      .values({ name: "Budi", email: "budi@example.com", role: "admin" })
      .returning();
    userId = u!.id;
    const [ty] = await t.db
      .insert(deviceTypes)
      .values({ name: "Gateway", icon: "radio" })
      .returning();
    typeId = ty!.id;
  });

  beforeEach(async () => {
    await t.db.delete(networkSources);
    await t.db.delete(zones);
    const [a] = await t.db.insert(zones).values({ name: "A" }).returning();
    const [b] = await t.db.insert(zones).values({ name: "B" }).returning();
    zoneA = a!.id;
    zoneB = b!.id;
  });

  afterAll(async () => {
    await t.close();
  });

  it("creates, reads, updates and moves a source", async () => {
    const s = await createNetworkSource(t.db, src({ zoneId: zoneA }));
    expect((await getNetworkSource(t.db, s.id))?.name).toBe("Shelter");

    const u = await updateNetworkSource(
      t.db,
      s.id,
      src({ name: "Control Room", kind: "Control Room", zoneId: null }),
    );
    expect(u).toMatchObject({ name: "Control Room", zoneId: null });

    const m = await moveNetworkSourcePosition(t.db, s.id, { lat: 1, lng: 2 });
    expect(m).toMatchObject({ lat: 1, lng: 2 });
  });

  it("maps a missing zone and a missing source to domain errors", async () => {
    await expect(
      createNetworkSource(t.db, src({ zoneId: NIL })),
    ).rejects.toBeInstanceOf(ZoneNotFoundError);
    await expect(updateNetworkSource(t.db, NIL, src())).rejects.toBeInstanceOf(
      NetworkSourceNotFoundError,
    );
    await expect(
      moveNetworkSourcePosition(t.db, NIL, { lat: 0, lng: 0 }),
    ).rejects.toBeInstanceOf(NetworkSourceNotFoundError);
    await expect(deleteNetworkSource(t.db, NIL)).rejects.toBeInstanceOf(
      NetworkSourceNotFoundError,
    );
  });

  it("links a device to a source (optional) and rejects an unknown source", async () => {
    const s = await createNetworkSource(t.db, src());
    const d = await createDevice(t.db, dev({ networkSourceId: s.id }), userId);
    expect(d.networkSourceId).toBe(s.id);

    const unlinked = await updateDevice(
      t.db,
      d.id,
      {
        deviceTypeId: typeId,
        isRouter: false,
        locationDetail: null,
        notes: null,
        networkSourceId: null,
      },
      userId,
    );
    expect(unlinked.device.networkSourceId).toBeNull();

    await expect(
      createDevice(t.db, dev({ networkSourceId: NIL }), userId),
    ).rejects.toBeInstanceOf(NetworkSourceNotFoundError);
  });

  it("deleting a source detaches its devices instead of deleting them", async () => {
    const s = await createNetworkSource(t.db, src());
    const d = await createDevice(t.db, dev({ networkSourceId: s.id }), userId);
    await deleteNetworkSource(t.db, s.id);
    expect((await getDevice(t.db, d.id))?.networkSourceId).toBeNull();
  });

  it("lists sources with zone name and device count computed in the DB", async () => {
    const s1 = await createNetworkSource(
      t.db,
      src({ name: "A1", zoneId: zoneA }),
    );
    await createNetworkSource(t.db, src({ name: "B1" }));
    await createDevice(t.db, dev({ networkSourceId: s1.id }), userId);
    await createDevice(t.db, dev({ networkSourceId: s1.id }), userId);

    const rows = await listNetworkSources(t.db);
    expect(rows.map((r) => [r.name, r.zoneName, r.deviceCount])).toEqual([
      ["A1", "A", 2],
      ["B1", null, 0],
    ]);
  });

  it("lists sources for a zone: own, zone-less, and ones its devices use", async () => {
    await createNetworkSource(t.db, src({ name: "own", zoneId: zoneA }));
    await createNetworkSource(t.db, src({ name: "free", zoneId: null }));
    await createNetworkSource(t.db, src({ name: "other", zoneId: zoneB }));
    const used = await createNetworkSource(
      t.db,
      src({ name: "used", zoneId: zoneB }),
    );
    await createDevice(t.db, dev({ networkSourceId: used.id }), userId);

    const names = (await listSourcesForZone(t.db, zoneA)).map((s) => s.name);
    expect(names).toEqual(["free", "own", "used"]);
    // A device-linked source appears once even with several devices.
    await createDevice(t.db, dev({ networkSourceId: used.id }), userId);
    expect(
      (await listSourcesForZone(t.db, zoneA)).filter((s) => s.name === "used"),
    ).toHaveLength(1);
  });

  it("lists distinct kinds and a source's connected devices", async () => {
    const s = await createNetworkSource(t.db, src({ kind: "Panel" }));
    await createNetworkSource(t.db, src({ name: "x", kind: "Panel" }));
    await createNetworkSource(t.db, src({ name: "y", kind: "Shelter" }));
    expect(await listSourceKinds(t.db)).toEqual(["Panel", "Shelter"]);

    await createDevice(t.db, dev({ networkSourceId: s.id }), userId);
    await createDevice(
      t.db,
      dev({ zoneId: zoneB, networkSourceId: s.id }),
      userId,
    );
    const list = await listSourceDevices(t.db, s.id);
    expect(list.map((d) => [d.zoneName, d.seq, d.typeName])).toEqual([
      ["A", 1, "Gateway"],
      ["B", 1, "Gateway"],
    ]);
    expect(
      await t.db
        .select()
        .from(devices)
        .where(eq(devices.networkSourceId, s.id)),
    ).toHaveLength(2);
  });
});
