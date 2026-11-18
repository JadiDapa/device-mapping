import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql as dsql } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/db";
import { deviceTypes, devices, zones } from "./schema";

describe("migrations: devices (zone_id, seq) uniqueness", () => {
  let t: TestDb;
  let zoneId: string;
  let typeId: string;

  beforeAll(async () => {
    t = await createTestDb();
    const [zone] = await t.db
      .insert(zones)
      .values({ name: "Zona Uji" })
      .returning();
    const [type] = await t.db
      .insert(deviceTypes)
      .values({ name: "Gateway", icon: "radio" })
      .returning();
    zoneId = zone!.id;
    typeId = type!.id;
  });

  afterAll(async () => {
    await t.close();
  });

  it("declares devices_zone_seq_unique as DEFERRABLE INITIALLY DEFERRED", async () => {
    const rows = await t.db.execute<{
      conname: string;
      condeferrable: boolean;
      condeferred: boolean;
      def: string;
    }>(dsql`
      select conname, condeferrable, condeferred, pg_get_constraintdef(oid) as def
      from pg_constraint
      where conrelid = 'devices'::regclass and conname = 'devices_zone_seq_unique'
    `);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.condeferrable).toBe(true);
    expect(rows[0]!.condeferred).toBe(true);
    expect(rows[0]!.def).toContain("DEFERRABLE INITIALLY DEFERRED");
  });

  it("lets two devices swap seq inside one transaction", async () => {
    const [a, b] = await t.db
      .insert(devices)
      .values([
        { zoneId, seq: 1, deviceTypeId: typeId, lat: 0, lng: 0 },
        { zoneId, seq: 2, deviceTypeId: typeId, lat: 0, lng: 0 },
      ])
      .returning();

    await t.db.transaction(async (tx) => {
      await tx
        .update(devices)
        .set({ seq: 2 })
        .where(dsql`id = ${a!.id}`);
      await tx
        .update(devices)
        .set({ seq: 1 })
        .where(dsql`id = ${b!.id}`);
    });

    const rows = await t.db.select().from(devices);
    const bySeq = Object.fromEntries(rows.map((r) => [r.id, r.seq]));
    expect(bySeq[a!.id]).toBe(2);
    expect(bySeq[b!.id]).toBe(1);
  });

  it("still rejects duplicate seq at commit", async () => {
    await expect(
      t.db.insert(devices).values({
        zoneId,
        seq: 1,
        deviceTypeId: typeId,
        lat: 0,
        lng: 0,
      }),
    ).rejects.toThrow();
  });
});
