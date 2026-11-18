import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "@/test/db";
import { deviceTypes, devices, user, zones } from "@/db/schema";
import type { ZoneInput } from "@/lib/validators/zone";
import {
  createZone,
  deleteZone,
  getZone,
  listZoneSummaries,
  updateZone,
  ZoneConfirmMismatchError,
  ZoneNameTakenError,
  ZoneNotFoundError,
} from "./zones";

const boundary: NonNullable<ZoneInput["boundary"]> = {
  type: "Polygon",
  coordinates: [
    [
      [104.0, -3.0],
      [104.2, -3.0],
      [104.2, -2.8],
      [104.0, -2.8],
      [104.0, -3.0],
    ],
  ],
};

describe("zones data layer", () => {
  let t: TestDb;
  let userId: string;
  let typeId: string;

  beforeAll(async () => {
    t = await createTestDb();
    const [u] = await t.db
      .insert(user)
      .values({
        name: "Admin",
        email: "admin@example.com",
        emailVerified: true,
        role: "admin",
      })
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
  });

  afterAll(async () => {
    await t.close();
  });

  async function addDevice(
    zoneId: string,
    seq: number,
    status: "not_installed" | "partial" | "installed_untested" | "tested",
    isRouter = false,
  ) {
    await t.db.insert(devices).values({
      zoneId,
      seq,
      deviceTypeId: typeId,
      lat: -2.9,
      lng: 104.1,
      status,
      isRouter,
    });
  }

  it("creates a zone and computes the centre from the boundary", async () => {
    const z = await createZone(
      t.db,
      { name: "Pusri 2B", description: null, boundary },
      userId,
    );
    expect(z.centerLat).toBeCloseTo(-2.9);
    expect(z.centerLng).toBeCloseTo(104.1);
    expect(z.createdBy).toBe(userId);
  });

  it("allows a zone without a boundary (centre stays null)", async () => {
    const z = await createZone(
      t.db,
      { name: "Kosong", description: null, boundary: null },
      userId,
    );
    expect(z.boundary).toBeNull();
    expect(z.centerLat).toBeNull();
  });

  it("rejects a duplicate name", async () => {
    await createZone(
      t.db,
      { name: "A", description: null, boundary: null },
      userId,
    );
    await expect(
      createZone(
        t.db,
        { name: "A", description: null, boundary: null },
        userId,
      ),
    ).rejects.toBeInstanceOf(ZoneNameTakenError);
  });

  it("summarises devices per status and routers with GROUP BY", async () => {
    const a = await createZone(
      t.db,
      { name: "A", description: null, boundary: null },
      userId,
    );
    const empty = await createZone(
      t.db,
      { name: "B", description: null, boundary: null },
      userId,
    );
    await addDevice(a.id, 1, "tested", true);
    await addDevice(a.id, 2, "tested");
    await addDevice(a.id, 3, "partial", true);
    await addDevice(a.id, 4, "not_installed");

    const list = await listZoneSummaries(t.db);
    const sa = list.find((z) => z.id === a.id)!;
    const sb = list.find((z) => z.id === empty.id)!;

    expect(sa.total).toBe(4);
    expect(sa.routers).toBe(2);
    expect(sa.counts).toEqual({
      not_installed: 1,
      partial: 1,
      installed_untested: 0,
      tested: 2,
    });
    expect(sb.total).toBe(0);
    expect(sb.routers).toBe(0);
    expect(sb.counts.tested).toBe(0);
  });

  it("lists zones ordered by name", async () => {
    for (const name of ["Zeta", "Alfa"]) {
      await createZone(
        t.db,
        { name, description: null, boundary: null },
        userId,
      );
    }
    expect((await listZoneSummaries(t.db)).map((z) => z.name)).toEqual([
      "Alfa",
      "Zeta",
    ]);
  });

  it("getZone returns null for an unknown id", async () => {
    expect(
      await getZone(t.db, "00000000-0000-0000-0000-000000000000"),
    ).toBeNull();
  });

  it("updates a zone and recomputes the centre; clearing the boundary nulls it", async () => {
    const z = await createZone(
      t.db,
      { name: "A", description: null, boundary: null },
      userId,
    );
    const r1 = await updateZone(t.db, z.id, {
      name: "A2",
      description: "d",
      boundary,
    });
    expect(r1.zone.name).toBe("A2");
    expect(r1.zone.centerLat).toBeCloseTo(-2.9);

    const r2 = await updateZone(t.db, z.id, {
      name: "A2",
      description: "d",
      boundary: null,
    });
    expect(r2.zone.centerLat).toBeNull();
  });

  it("flags a stale write when updated_at changed since the form loaded", async () => {
    const z = await createZone(
      t.db,
      { name: "A", description: null, boundary: null },
      userId,
    );
    // updated_at has millisecond resolution in JS; make sure each write moves it.
    await new Promise((r) => setTimeout(r, 5));
    const fresh = await updateZone(t.db, z.id, {
      name: "A",
      description: null,
      boundary: null,
      expectedUpdatedAt: z.updatedAt.toISOString(),
    });
    expect(fresh.staleWrite).toBe(false);

    // Same stale token again: the row has moved on since.
    await new Promise((r) => setTimeout(r, 5));
    const stale = await updateZone(t.db, z.id, {
      name: "A",
      description: "x",
      boundary: null,
      expectedUpdatedAt: z.updatedAt.toISOString(),
    });
    expect(stale.staleWrite).toBe(true);
    expect(stale.zone.description).toBe("x"); // last write wins
  });

  it("update throws for an unknown zone and for a taken name", async () => {
    await expect(
      updateZone(t.db, "00000000-0000-0000-0000-000000000000", {
        name: "A",
        description: null,
        boundary: null,
      }),
    ).rejects.toBeInstanceOf(ZoneNotFoundError);

    await createZone(
      t.db,
      { name: "A", description: null, boundary: null },
      userId,
    );
    const b = await createZone(
      t.db,
      { name: "B", description: null, boundary: null },
      userId,
    );
    await expect(
      updateZone(t.db, b.id, { name: "A", description: null, boundary: null }),
    ).rejects.toBeInstanceOf(ZoneNameTakenError);
  });

  it("refuses to delete when the confirmation name does not match", async () => {
    const z = await createZone(
      t.db,
      { name: "Pusri 2B", description: null, boundary: null },
      userId,
    );
    await expect(deleteZone(t.db, z.id, "pusri 2b")).rejects.toBeInstanceOf(
      ZoneConfirmMismatchError,
    );
    expect(await getZone(t.db, z.id)).not.toBeNull();
  });

  it("deletes a zone and cascades to its devices", async () => {
    const z = await createZone(
      t.db,
      { name: "Pusri 2B", description: null, boundary: null },
      userId,
    );
    await addDevice(z.id, 1, "tested");
    await deleteZone(t.db, z.id, "Pusri 2B");
    expect(await getZone(t.db, z.id)).toBeNull();
    expect(await t.db.select().from(devices)).toHaveLength(0);
  });
});
