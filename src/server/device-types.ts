/**
 * Device type master data (PRD F5). Authorization and revalidation live in
 * the Server Actions (src/server/actions/deviceTypes.ts).
 */
import { asc, eq, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { devices, deviceTypes } from "@/db/schema";
import type { DeviceTypeInput } from "@/lib/validators/device-type";
import { hasPgCode } from "./pg";

export class DeviceTypeNameTakenError extends Error {
  constructor() {
    super("DEVICE_TYPE_NAME_TAKEN");
    this.name = "DeviceTypeNameTakenError";
  }
}

export class DeviceTypeNotFoundError extends Error {
  constructor() {
    super("DEVICE_TYPE_NOT_FOUND");
    this.name = "DeviceTypeNotFoundError";
  }
}

export class DeviceTypeInUseError extends Error {
  constructor(readonly count: number) {
    super("DEVICE_TYPE_IN_USE");
    this.name = "DeviceTypeInUseError";
  }
}

export type DeviceType = typeof deviceTypes.$inferSelect;
export type DeviceTypeWithUsage = DeviceType & { usageCount: number };

/** Types with how many devices use each (GROUP BY in the database). */
export async function listDeviceTypes(
  db: Database,
): Promise<DeviceTypeWithUsage[]> {
  return db
    .select({
      id: deviceTypes.id,
      name: deviceTypes.name,
      icon: deviceTypes.icon,
      description: deviceTypes.description,
      createdAt: deviceTypes.createdAt,
      updatedAt: deviceTypes.updatedAt,
      usageCount: sql<number>`count(${devices.id})::int`,
    })
    .from(deviceTypes)
    .leftJoin(devices, eq(devices.deviceTypeId, deviceTypes.id))
    .groupBy(deviceTypes.id)
    .orderBy(asc(deviceTypes.name));
}

export async function createDeviceType(
  db: Database,
  input: DeviceTypeInput,
): Promise<DeviceType> {
  try {
    const [row] = await db.insert(deviceTypes).values(input).returning();
    return row!;
  } catch (error) {
    if (hasPgCode(error, "23505")) throw new DeviceTypeNameTakenError();
    throw error;
  }
}

export async function updateDeviceType(
  db: Database,
  id: string,
  input: DeviceTypeInput,
): Promise<DeviceType> {
  try {
    const [row] = await db
      .update(deviceTypes)
      .set(input)
      .where(eq(deviceTypes.id, id))
      .returning();
    if (!row) throw new DeviceTypeNotFoundError();
    return row;
  } catch (error) {
    if (hasPgCode(error, "23505")) throw new DeviceTypeNameTakenError();
    throw error;
  }
}

/** A type still used by devices cannot be deleted (PRD F5). */
export async function deleteDeviceType(
  db: Database,
  id: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: deviceTypes.id })
    .from(deviceTypes)
    .where(eq(deviceTypes.id, id));
  if (!existing) throw new DeviceTypeNotFoundError();

  const [usage] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(devices)
    .where(eq(devices.deviceTypeId, id));
  if (usage && usage.n > 0) throw new DeviceTypeInUseError(usage.n);

  try {
    await db.delete(deviceTypes).where(eq(deviceTypes.id, id));
  } catch (error) {
    // A device was created between the count and the delete (FK violation).
    if (hasPgCode(error, "23503")) throw new DeviceTypeInUseError(1);
    throw error;
  }
}
