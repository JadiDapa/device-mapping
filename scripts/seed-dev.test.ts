import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { createTestDb, type TestDb } from "@/test/db";
import {
  deviceStatusHistory,
  devices,
  networkSources,
  zones,
} from "@/db/schema";
import { DEVICE_STATUSES } from "@/lib/status";
import { seedDev } from "./seed-dev";

describe("seedDev", () => {
  let t: TestDb;

  beforeAll(async () => {
    t = await createTestDb();
    await seedDev(t.db);
  });

  afterAll(async () => {
    await t.close();
  });

  it("creates the Pusri 1B and Pusri 2B zones with polygon boundaries", async () => {
    const rows = await t.db.select().from(zones).orderBy(asc(zones.name));
    expect(rows.map((z) => z.name)).toEqual(["Pusri 1B", "Pusri 2B"]);
    for (const zone of rows) {
      expect(zone.description).toBeTruthy();
      expect(zone.boundary?.type).toBe("Polygon");
      const ring = zone.boundary!.coordinates[0]!;
      expect(ring.length).toBeGreaterThanOrEqual(4);
      expect(ring[0]).toEqual(ring[ring.length - 1]); // closed ring
    }
  });

  it("creates two network sources", async () => {
    expect(await t.db.select().from(networkSources)).toHaveLength(2);
  });

  it("numbers devices 1..n without gaps in every zone", async () => {
    for (const zone of await t.db.select().from(zones)) {
      const rows = await t.db
        .select()
        .from(devices)
        .where(eq(devices.zoneId, zone.id))
        .orderBy(asc(devices.seq));
      expect(rows.length).toBeGreaterThanOrEqual(5);
      expect(rows.map((d) => d.seq)).toEqual(rows.map((_, i) => i + 1));
    }
  });

  it("mixes statuses and includes routers", async () => {
    const rows = await t.db.select().from(devices);
    const statuses = new Set(rows.map((d) => d.status));
    for (const status of DEVICE_STATUSES) expect(statuses).toContain(status);
    expect(rows.some((d) => d.isRouter)).toBe(true);
    expect(rows.some((d) => !d.isRouter)).toBe(true);
  });

  it("gives every partial device a checklist item or a note (PRD §4)", async () => {
    const partial = (await t.db.select().from(devices)).filter(
      (d) => d.status === "partial",
    );
    expect(partial.length).toBeGreaterThan(0);
    for (const d of partial) {
      expect(d.hasPower || d.hasFo || d.hasEthernet || !!d.partialNote).toBe(
        true,
      );
    }
  });

  it("places every device inside its zone polygon", async () => {
    const zoneRows = await t.db.select().from(zones);
    for (const d of await t.db.select().from(devices)) {
      const zone = zoneRows.find((z) => z.id === d.zoneId)!;
      expect(
        booleanPointInPolygon([d.lng, d.lat], zone.boundary!),
        `device ${zone.name} #${d.seq}`,
      ).toBe(true);
    }
  });

  it("writes an initial history row (from_status null) per device", async () => {
    const all = await t.db.select().from(devices);
    const history = await t.db.select().from(deviceStatusHistory);
    for (const d of all) {
      const rows = history.filter((h) => h.deviceId === d.id);
      expect(rows.length).toBeGreaterThanOrEqual(1);
      const first = rows.find((h) => h.fromStatus === null);
      expect(first, `device ${d.seq} has a creation row`).toBeDefined();
    }
  });

  it("keeps each device's latest history entry equal to its current status", async () => {
    const all = await t.db.select().from(devices);
    const history = await t.db
      .select()
      .from(deviceStatusHistory)
      .orderBy(asc(deviceStatusHistory.changedAt));
    for (const d of all) {
      const rows = history.filter((h) => h.deviceId === d.id);
      expect(rows[rows.length - 1]!.toStatus).toBe(d.status);
    }
  });

  it("is idempotent: a second run adds nothing", async () => {
    const before = {
      zones: (await t.db.select().from(zones)).length,
      devices: (await t.db.select().from(devices)).length,
      history: (await t.db.select().from(deviceStatusHistory)).length,
      sources: (await t.db.select().from(networkSources)).length,
    };
    await seedDev(t.db);
    expect({
      zones: (await t.db.select().from(zones)).length,
      devices: (await t.db.select().from(devices)).length,
      history: (await t.db.select().from(deviceStatusHistory)).length,
      sources: (await t.db.select().from(networkSources)).length,
    }).toEqual(before);
  });
});
