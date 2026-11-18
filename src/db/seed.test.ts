import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "@/test/db";
import { deviceTypes } from "./schema";
import { seedDeviceTypes } from "./seed";

describe("seedDeviceTypes", () => {
  let t: TestDb;

  beforeAll(async () => {
    t = await createTestDb();
  });

  afterAll(async () => {
    await t.close();
  });

  it("creates Gateway (radio) and BLE Receiver (bluetooth)", async () => {
    await seedDeviceTypes(t.db);
    const rows = await t.db.select().from(deviceTypes);
    const byName = Object.fromEntries(rows.map((r) => [r.name, r.icon]));
    expect(byName).toEqual({ Gateway: "radio", "BLE Receiver": "bluetooth" });
  });

  it("is idempotent", async () => {
    await seedDeviceTypes(t.db);
    await seedDeviceTypes(t.db);
    expect(await t.db.select().from(deviceTypes)).toHaveLength(2);
  });

  it("does not overwrite edits an admin already made", async () => {
    const { eq } = await import("drizzle-orm");
    await t.db
      .update(deviceTypes)
      .set({ icon: "wifi" })
      .where(eq(deviceTypes.name, "Gateway"));
    await seedDeviceTypes(t.db);
    const [gateway] = await t.db
      .select()
      .from(deviceTypes)
      .where(eq(deviceTypes.name, "Gateway"));
    expect(gateway!.icon).toBe("wifi");
  });
});
