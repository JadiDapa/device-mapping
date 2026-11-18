import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "@/test/db";
import { devices, deviceTypes, zones } from "@/db/schema";
import {
  createDeviceType,
  deleteDeviceType,
  DeviceTypeInUseError,
  DeviceTypeNameTakenError,
  DeviceTypeNotFoundError,
  listDeviceTypes,
  updateDeviceType,
} from "./device-types";

describe("device types data layer", () => {
  let t: TestDb;

  beforeAll(async () => {
    t = await createTestDb();
  });

  beforeEach(async () => {
    await t.db.delete(devices);
    await t.db.delete(zones);
    await t.db.delete(deviceTypes);
  });

  afterAll(async () => {
    await t.close();
  });

  it("creates and lists types ordered by name with usage counts", async () => {
    const b = await createDeviceType(t.db, {
      name: "BLE Receiver",
      icon: "bluetooth",
      description: null,
    });
    await createDeviceType(t.db, {
      name: "Gateway",
      icon: "radio",
      description: "GW",
    });
    const [zone] = await t.db.insert(zones).values({ name: "Z" }).returning();
    await t.db.insert(devices).values([
      { zoneId: zone!.id, seq: 1, deviceTypeId: b.id, lat: 0, lng: 0 },
      { zoneId: zone!.id, seq: 2, deviceTypeId: b.id, lat: 0, lng: 0 },
    ]);

    const list = await listDeviceTypes(t.db);
    expect(list.map((x) => [x.name, x.usageCount])).toEqual([
      ["BLE Receiver", 2],
      ["Gateway", 0],
    ]);
  });

  it("rejects a duplicate name on create and update", async () => {
    await createDeviceType(t.db, {
      name: "A",
      icon: "radio",
      description: null,
    });
    const b = await createDeviceType(t.db, {
      name: "B",
      icon: "radio",
      description: null,
    });
    await expect(
      createDeviceType(t.db, { name: "A", icon: "wifi", description: null }),
    ).rejects.toBeInstanceOf(DeviceTypeNameTakenError);
    await expect(
      updateDeviceType(t.db, b.id, {
        name: "A",
        icon: "radio",
        description: null,
      }),
    ).rejects.toBeInstanceOf(DeviceTypeNameTakenError);
  });

  it("updates a type; unknown id throws not found", async () => {
    const a = await createDeviceType(t.db, {
      name: "A",
      icon: "radio",
      description: null,
    });
    const u = await updateDeviceType(t.db, a.id, {
      name: "A2",
      icon: "wifi",
      description: "x",
    });
    expect(u).toMatchObject({ name: "A2", icon: "wifi", description: "x" });
    await expect(
      updateDeviceType(t.db, "00000000-0000-0000-0000-000000000000", {
        name: "Q",
        icon: "radio",
        description: null,
      }),
    ).rejects.toBeInstanceOf(DeviceTypeNotFoundError);
  });

  it("refuses to delete a type in use and reports the count", async () => {
    const a = await createDeviceType(t.db, {
      name: "A",
      icon: "radio",
      description: null,
    });
    const [zone] = await t.db.insert(zones).values({ name: "Z" }).returning();
    await t.db
      .insert(devices)
      .values({ zoneId: zone!.id, seq: 1, deviceTypeId: a.id, lat: 0, lng: 0 });

    const err = await deleteDeviceType(t.db, a.id).catch((e) => e);
    expect(err).toBeInstanceOf(DeviceTypeInUseError);
    expect((err as DeviceTypeInUseError).count).toBe(1);
    expect(await t.db.select().from(deviceTypes)).toHaveLength(1);
  });

  it("deletes an unused type and 404s on an unknown one", async () => {
    const a = await createDeviceType(t.db, {
      name: "A",
      icon: "radio",
      description: null,
    });
    await deleteDeviceType(t.db, a.id);
    expect(await t.db.select().from(deviceTypes)).toHaveLength(0);
    await expect(deleteDeviceType(t.db, a.id)).rejects.toBeInstanceOf(
      DeviceTypeNotFoundError,
    );
  });
});
