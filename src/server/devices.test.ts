import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/db";
import {
  deviceStatusHistory,
  devices,
  deviceTypes,
  user,
  zones,
} from "@/db/schema";
import type { DeviceCreateInput } from "@/lib/validators/device";
import { DeviceTypeNotFoundError } from "./device-types";
import {
  createDevice,
  deleteDevice,
  DeviceNotFoundError,
  listDeviceHistory,
  listZoneDevices,
  moveDevicePosition,
  moveDeviceToZone,
  reorderDevices,
  ReorderMismatchError,
  setDeviceStatus,
  updateDevice,
} from "./devices";
import { getZoneSummary, ZoneNotFoundError } from "./zones";

const NIL = "00000000-0000-0000-0000-000000000000";

describe("devices data layer", () => {
  let t: TestDb;
  let userId: string;
  let typeId: string;
  let zoneA: string;
  let zoneB: string;

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
    await t.db.delete(zones);
    const [a] = await t.db.insert(zones).values({ name: "A" }).returning();
    const [b] = await t.db.insert(zones).values({ name: "B" }).returning();
    zoneA = a!.id;
    zoneB = b!.id;
  });

  afterAll(async () => {
    await t.close();
  });

  function input(over: Partial<DeviceCreateInput> = {}): DeviceCreateInput {
    return {
      zoneId: zoneA,
      deviceTypeId: typeId,
      isRouter: false,
      locationDetail: null,
      notes: null,
      networkSourceId: null,
      lat: -2.9,
      lng: 104.1,
      status: "not_installed",
      hasPower: false,
      hasFo: false,
      hasEthernet: false,
      partialNote: null,
      ...over,
    };
  }

  async function seqs(zoneId: string): Promise<number[]> {
    const rows = await t.db
      .select({ seq: devices.seq })
      .from(devices)
      .where(eq(devices.zoneId, zoneId))
      .orderBy(asc(devices.seq));
    return rows.map((r) => r.seq);
  }

  async function ids(zoneId: string): Promise<string[]> {
    const rows = await t.db
      .select({ id: devices.id })
      .from(devices)
      .where(eq(devices.zoneId, zoneId))
      .orderBy(asc(devices.seq));
    return rows.map((r) => r.id);
  }

  describe("create", () => {
    it("assigns seq = max + 1 per zone", async () => {
      const d1 = await createDevice(t.db, input(), userId);
      const d2 = await createDevice(t.db, input(), userId);
      const d3 = await createDevice(t.db, input(), userId);
      const o1 = await createDevice(t.db, input({ zoneId: zoneB }), userId);
      expect([d1.seq, d2.seq, d3.seq, o1.seq]).toEqual([1, 2, 3, 1]);
      expect(d1.updatedBy).toBe(userId);
    });

    it("writes exactly one history row with from = null", async () => {
      const d = await createDevice(
        t.db,
        input({ status: "partial", hasFo: true, partialNote: "tunggu" }),
        userId,
      );
      const h = await t.db
        .select()
        .from(deviceStatusHistory)
        .where(eq(deviceStatusHistory.deviceId, d.id));
      expect(h).toHaveLength(1);
      expect(h[0]).toMatchObject({
        fromStatus: null,
        toStatus: "partial",
        changedBy: userId,
        snapshot: {
          has_power: false,
          has_fo: true,
          has_ethernet: false,
          partial_note: "tunggu",
        },
      });
    });

    it("stays gap-free under concurrent creates", async () => {
      await Promise.all(
        Array.from({ length: 6 }, () => createDevice(t.db, input(), userId)),
      );
      expect(await seqs(zoneA)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("throws for an unknown zone and an unknown type", async () => {
      await expect(
        createDevice(t.db, input({ zoneId: NIL }), userId),
      ).rejects.toBeInstanceOf(ZoneNotFoundError);
      await expect(
        createDevice(t.db, input({ deviceTypeId: NIL }), userId),
      ).rejects.toBeInstanceOf(DeviceTypeNotFoundError);
      expect(await seqs(zoneA)).toEqual([]);
    });
  });

  describe("delete", () => {
    it("closes the gap so seq stays 1..n", async () => {
      const [d1, d2, d3, d4] = [
        await createDevice(t.db, input(), userId),
        await createDevice(t.db, input(), userId),
        await createDevice(t.db, input(), userId),
        await createDevice(t.db, input(), userId),
      ];
      await deleteDevice(t.db, d2.id);
      expect(await seqs(zoneA)).toEqual([1, 2, 3]);
      expect(await ids(zoneA)).toEqual([d1.id, d3.id, d4.id]);
    });

    it("cascades to history and throws for an unknown device", async () => {
      const d = await createDevice(t.db, input(), userId);
      await deleteDevice(t.db, d.id);
      expect(await t.db.select().from(deviceStatusHistory)).toHaveLength(0);
      await expect(deleteDevice(t.db, d.id)).rejects.toBeInstanceOf(
        DeviceNotFoundError,
      );
    });

    it("only renumbers the affected zone", async () => {
      const a1 = await createDevice(t.db, input(), userId);
      await createDevice(t.db, input(), userId);
      await createDevice(t.db, input({ zoneId: zoneB }), userId);
      await createDevice(t.db, input({ zoneId: zoneB }), userId);
      await deleteDevice(t.db, a1.id);
      expect(await seqs(zoneA)).toEqual([1]);
      expect(await seqs(zoneB)).toEqual([1, 2]);
    });
  });

  describe("reorder", () => {
    it("moves device 3 to position 1 and rewrites seq 1..n", async () => {
      const d1 = await createDevice(t.db, input(), userId);
      const d2 = await createDevice(t.db, input(), userId);
      const d3 = await createDevice(t.db, input(), userId);

      await reorderDevices(t.db, zoneA, [d3.id, d1.id, d2.id]);

      expect(await ids(zoneA)).toEqual([d3.id, d1.id, d2.id]);
      expect(await seqs(zoneA)).toEqual([1, 2, 3]);
      const list = await listZoneDevices(t.db, zoneA);
      expect(list.map((d) => [d.id, d.seq])).toEqual([
        [d3.id, 1],
        [d1.id, 2],
        [d2.id, 3],
      ]);
    });

    it("rejects a set that is not exactly the zone's devices", async () => {
      const d1 = await createDevice(t.db, input(), userId);
      const d2 = await createDevice(t.db, input(), userId);
      const other = await createDevice(t.db, input({ zoneId: zoneB }), userId);

      await expect(reorderDevices(t.db, zoneA, [d2.id])).rejects.toBeInstanceOf(
        ReorderMismatchError,
      );
      await expect(
        reorderDevices(t.db, zoneA, [d2.id, d1.id, other.id]),
      ).rejects.toBeInstanceOf(ReorderMismatchError);
      await expect(
        reorderDevices(t.db, zoneA, [d2.id, d2.id]),
      ).rejects.toBeInstanceOf(ReorderMismatchError);
      expect(await ids(zoneA)).toEqual([d1.id, d2.id]);
    });

    it("throws for an unknown zone", async () => {
      await expect(reorderDevices(t.db, NIL, [])).rejects.toBeInstanceOf(
        ZoneNotFoundError,
      );
    });
  });

  describe("move to another zone", () => {
    it("appends to the target zone and closes the gap in the source", async () => {
      const a1 = await createDevice(t.db, input(), userId);
      const a2 = await createDevice(t.db, input(), userId);
      const a3 = await createDevice(t.db, input(), userId);
      const b1 = await createDevice(t.db, input({ zoneId: zoneB }), userId);

      const moved = await moveDeviceToZone(t.db, a1.id, zoneB, userId);

      expect(moved).toMatchObject({ zoneId: zoneB, seq: 2 });
      expect(await ids(zoneA)).toEqual([a2.id, a3.id]);
      expect(await seqs(zoneA)).toEqual([1, 2]);
      expect(await ids(zoneB)).toEqual([b1.id, a1.id]);
      expect(await seqs(zoneB)).toEqual([1, 2]);
    });

    it("moving into an empty zone gives seq 1", async () => {
      const a1 = await createDevice(t.db, input(), userId);
      const moved = await moveDeviceToZone(t.db, a1.id, zoneB, userId);
      expect(moved.seq).toBe(1);
      expect(await seqs(zoneA)).toEqual([]);
    });

    it("is a no-op for the same zone and throws for unknown ids", async () => {
      const a1 = await createDevice(t.db, input(), userId);
      const same = await moveDeviceToZone(t.db, a1.id, zoneA, userId);
      expect(same.seq).toBe(1);
      await expect(
        moveDeviceToZone(t.db, a1.id, NIL, userId),
      ).rejects.toBeInstanceOf(ZoneNotFoundError);
      await expect(
        moveDeviceToZone(t.db, NIL, zoneB, userId),
      ).rejects.toBeInstanceOf(DeviceNotFoundError);
      expect(await seqs(zoneA)).toEqual([1]);
    });
  });

  describe("status + history", () => {
    it("records one history row per status change", async () => {
      const d = await createDevice(t.db, input(), userId);
      const r = await setDeviceStatus(
        t.db,
        d.id,
        {
          status: "partial",
          hasPower: true,
          hasFo: false,
          hasEthernet: false,
          partialNote: null,
          note: "kabel menyusul",
        },
        userId,
      );
      expect(r.changed).toBe(true);
      expect(r.device.status).toBe("partial");
      expect(r.device.hasPower).toBe(true);

      await setDeviceStatus(
        t.db,
        d.id,
        {
          status: "tested",
          hasPower: true,
          hasFo: false,
          hasEthernet: false,
          partialNote: null,
          note: null,
        },
        userId,
      );

      const history = await listDeviceHistory(t.db, d.id);
      expect(history).toHaveLength(3);
      // newest first
      expect(history.map((h) => [h.fromStatus, h.toStatus])).toEqual([
        ["partial", "tested"],
        ["not_installed", "partial"],
        [null, "not_installed"],
      ]);
      expect(history[1]).toMatchObject({
        note: "kabel menyusul",
        changedByName: "Budi",
      });
    });

    it("keeps the checklist stored when the status is no longer partial", async () => {
      const d = await createDevice(
        t.db,
        input({ status: "partial", hasFo: true, hasEthernet: true }),
        userId,
      );
      const r = await setDeviceStatus(
        t.db,
        d.id,
        {
          status: "tested",
          hasPower: false,
          hasFo: true,
          hasEthernet: true,
          partialNote: null,
          note: null,
        },
        userId,
      );
      expect(r.device).toMatchObject({
        status: "tested",
        hasFo: true,
        hasEthernet: true,
      });
    });

    it("is a no-op (no history row) when nothing changed", async () => {
      const d = await createDevice(t.db, input(), userId);
      const r = await setDeviceStatus(
        t.db,
        d.id,
        {
          status: "not_installed",
          hasPower: false,
          hasFo: false,
          hasEthernet: false,
          partialNote: null,
          note: "x",
        },
        userId,
      );
      expect(r.changed).toBe(false);
      expect(await listDeviceHistory(t.db, d.id)).toHaveLength(1);
    });

    it("changing only the partial checklist is recorded", async () => {
      const d = await createDevice(
        t.db,
        input({ status: "partial", hasPower: true }),
        userId,
      );
      const r = await setDeviceStatus(
        t.db,
        d.id,
        {
          status: "partial",
          hasPower: true,
          hasFo: true,
          hasEthernet: false,
          partialNote: null,
          note: null,
        },
        userId,
      );
      expect(r.changed).toBe(true);
      const history = await listDeviceHistory(t.db, d.id);
      expect(history[0]).toMatchObject({
        fromStatus: "partial",
        toStatus: "partial",
      });
    });

    it("throws for an unknown device", async () => {
      await expect(
        setDeviceStatus(
          t.db,
          NIL,
          {
            status: "tested",
            hasPower: false,
            hasFo: false,
            hasEthernet: false,
            partialNote: null,
            note: null,
          },
          userId,
        ),
      ).rejects.toBeInstanceOf(DeviceNotFoundError);
    });
  });

  describe("update + position", () => {
    it("updates detail fields without touching status or seq", async () => {
      const d = await createDevice(t.db, input({ status: "tested" }), userId);
      const { device } = await updateDevice(
        t.db,
        d.id,
        {
          deviceTypeId: typeId,
          isRouter: true,
          locationDetail: "Lantai 2",
          notes: "n",
          networkSourceId: null,
        },
        userId,
      );
      expect(device).toMatchObject({
        isRouter: true,
        locationDetail: "Lantai 2",
        status: "tested",
        seq: 1,
      });
      expect(await listDeviceHistory(t.db, d.id)).toHaveLength(1);
    });

    it("flags a stale write but still saves (last write wins)", async () => {
      const d = await createDevice(t.db, input(), userId);
      await new Promise((r) => setTimeout(r, 5));
      await moveDevicePosition(t.db, d.id, { lat: -3, lng: 104 }, userId);
      const { device, staleWrite } = await updateDevice(
        t.db,
        d.id,
        {
          deviceTypeId: typeId,
          isRouter: false,
          locationDetail: "baru",
          notes: null,
          networkSourceId: null,
          expectedUpdatedAt: d.updatedAt.toISOString(),
        },
        userId,
      );
      expect(staleWrite).toBe(true);
      expect(device.locationDetail).toBe("baru");
    });

    it("moves the marker position", async () => {
      const d = await createDevice(t.db, input(), userId);
      const moved = await moveDevicePosition(
        t.db,
        d.id,
        { lat: -3.1, lng: 104.2 },
        userId,
      );
      expect(moved).toMatchObject({ lat: -3.1, lng: 104.2 });
      await expect(
        moveDevicePosition(t.db, NIL, { lat: 0, lng: 0 }, userId),
      ).rejects.toBeInstanceOf(DeviceNotFoundError);
    });
  });

  describe("queries", () => {
    it("lists zone devices with their type ordered by seq", async () => {
      await createDevice(t.db, input({ locationDetail: "x" }), userId);
      await createDevice(t.db, input(), userId);
      const list = await listZoneDevices(t.db, zoneA);
      expect(list.map((d) => d.seq)).toEqual([1, 2]);
      expect(list[0]).toMatchObject({ typeName: "Gateway", typeIcon: "radio" });
    });

    it("summarises one zone with GROUP BY (matches the devices)", async () => {
      await createDevice(
        t.db,
        input({ status: "tested", isRouter: true }),
        userId,
      );
      await createDevice(t.db, input({ status: "tested" }), userId);
      await createDevice(
        t.db,
        input({ status: "partial", hasPower: true }),
        userId,
      );
      await createDevice(t.db, input({ zoneId: zoneB }), userId);

      const s = await getZoneSummary(t.db, zoneA);
      expect(s).toMatchObject({
        total: 3,
        routers: 1,
        counts: {
          not_installed: 0,
          partial: 1,
          installed_untested: 0,
          tested: 2,
        },
      });
      expect(await getZoneSummary(t.db, NIL)).toBeNull();
    });
  });
});
