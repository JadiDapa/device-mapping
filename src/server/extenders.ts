/**
 * Extender data layer. Plain functions taking a `Database` (authorization and
 * revalidation live in src/server/actions/extenders.ts). An extender links two
 * devices of its own zone; it has no seq and no status.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db";
import { devices, extenders, zones } from "@/db/schema";
import type {
  ExtenderCreateInput,
  ExtenderUpdateInput,
} from "@/lib/validators/extender";
import { InvalidParentError } from "./devices";
import { ZoneNotFoundError } from "./zones";

export class ExtenderNotFoundError extends Error {
  constructor() {
    super("EXTENDER_NOT_FOUND");
    this.name = "ExtenderNotFoundError";
  }
}

export type Extender = typeof extenders.$inferSelect;

/** Both ends (when set) must be devices of the extender's zone. */
async function assertEnds(
  db: Database,
  zoneId: string,
  ends: (string | null)[],
): Promise<void> {
  const ids = [...new Set(ends.filter((x): x is string => !!x))];
  if (ids.length === 0) return;
  const rows = await db
    .select({ id: devices.id })
    .from(devices)
    .where(and(inArray(devices.id, ids), eq(devices.zoneId, zoneId)));
  if (rows.length !== ids.length) throw new InvalidParentError();
}

export async function listZoneExtenders(
  db: Database,
  zoneId: string,
): Promise<Extender[]> {
  return db
    .select()
    .from(extenders)
    .where(eq(extenders.zoneId, zoneId))
    .orderBy(asc(extenders.createdAt));
}

export async function listAllExtenders(db: Database): Promise<Extender[]> {
  return db.select().from(extenders).orderBy(asc(extenders.createdAt));
}

export async function getExtender(
  db: Database,
  extenderId: string,
): Promise<Extender | null> {
  const [row] = await db
    .select()
    .from(extenders)
    .where(eq(extenders.id, extenderId));
  return row ?? null;
}

export async function createExtender(
  db: Database,
  input: ExtenderCreateInput,
  userId: string,
): Promise<Extender> {
  const [zone] = await db
    .select({ id: zones.id })
    .from(zones)
    .where(eq(zones.id, input.zoneId));
  if (!zone) throw new ZoneNotFoundError();
  await assertEnds(db, input.zoneId, [input.fromDeviceId, input.toDeviceId]);
  const [row] = await db
    .insert(extenders)
    .values({ ...input, updatedBy: userId })
    .returning();
  return row!;
}

export async function updateExtender(
  db: Database,
  extenderId: string,
  input: ExtenderUpdateInput,
  userId: string,
): Promise<Extender> {
  const existing = await getExtender(db, extenderId);
  if (!existing) throw new ExtenderNotFoundError();
  await assertEnds(db, existing.zoneId, [input.fromDeviceId, input.toDeviceId]);
  const [row] = await db
    .update(extenders)
    .set({ ...input, updatedBy: userId, updatedAt: new Date() })
    .where(eq(extenders.id, extenderId))
    .returning();
  return row!;
}

export async function moveExtenderPosition(
  db: Database,
  extenderId: string,
  pos: { lat: number; lng: number },
  userId: string,
): Promise<Extender> {
  const [row] = await db
    .update(extenders)
    .set({ ...pos, updatedBy: userId, updatedAt: new Date() })
    .where(eq(extenders.id, extenderId))
    .returning();
  if (!row) throw new ExtenderNotFoundError();
  return row;
}

export async function deleteExtender(
  db: Database,
  extenderId: string,
): Promise<Extender> {
  const [row] = await db
    .delete(extenders)
    .where(eq(extenders.id, extenderId))
    .returning();
  if (!row) throw new ExtenderNotFoundError();
  return row;
}
