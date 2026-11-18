/**
 * Zone data layer (PRD F2/F3). Plain functions that take a `Database` so they
 * can be tested against the test database; authorization and cache
 * revalidation live in the Server Actions (src/server/actions/zones.ts).
 */
import { asc, eq, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { devices, zones } from "@/db/schema";
import { polygonCenter } from "@/lib/geo";
import type { DeviceStatus } from "@/lib/status";
import type { ZoneInput } from "@/lib/validators/zone";
import { hasPgCode } from "./pg";

export class ZoneNameTakenError extends Error {
  constructor() {
    super("ZONE_NAME_TAKEN");
    this.name = "ZoneNameTakenError";
  }
}

export class ZoneNotFoundError extends Error {
  constructor() {
    super("ZONE_NOT_FOUND");
    this.name = "ZoneNotFoundError";
  }
}

export class ZoneConfirmMismatchError extends Error {
  constructor() {
    super("ZONE_CONFIRM_MISMATCH");
    this.name = "ZoneConfirmMismatchError";
  }
}

export type Zone = typeof zones.$inferSelect;

export type ZoneSummary = {
  id: string;
  name: string;
  description: string | null;
  total: number;
  routers: number;
  counts: Record<DeviceStatus, number>;
};

function centerColumns(boundary: ZoneInput["boundary"]) {
  if (!boundary) return { centerLat: null, centerLng: null };
  const c = polygonCenter(boundary);
  return { centerLat: c.lat, centerLng: c.lng };
}

/**
 * Per-zone totals computed in the database (GROUP BY) — never stored.
 * Zones without devices come back with zeros (LEFT JOIN).
 */
export async function listZoneSummaries(
  db: Database,
  onlyZoneId?: string,
): Promise<ZoneSummary[]> {
  const rows = await db
    .select({
      id: zones.id,
      name: zones.name,
      description: zones.description,
      total: sql<number>`count(${devices.id})::int`,
      routers: sql<number>`count(${devices.id}) filter (where ${devices.isRouter})::int`,
      notInstalled: sql<number>`count(${devices.id}) filter (where ${devices.status} = 'not_installed')::int`,
      partial: sql<number>`count(${devices.id}) filter (where ${devices.status} = 'partial')::int`,
      installedUntested: sql<number>`count(${devices.id}) filter (where ${devices.status} = 'installed_untested')::int`,
      tested: sql<number>`count(${devices.id}) filter (where ${devices.status} = 'tested')::int`,
    })
    .from(zones)
    .leftJoin(devices, eq(devices.zoneId, zones.id))
    .where(onlyZoneId ? eq(zones.id, onlyZoneId) : undefined)
    .groupBy(zones.id)
    .orderBy(asc(zones.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    total: r.total,
    routers: r.routers,
    counts: {
      not_installed: r.notInstalled,
      partial: r.partial,
      installed_untested: r.installedUntested,
      tested: r.tested,
    },
  }));
}

/** Summary of one zone (same GROUP BY query as the dashboard). */
export async function getZoneSummary(
  db: Database,
  zoneId: string,
): Promise<ZoneSummary | null> {
  return (await listZoneSummaries(db, zoneId))[0] ?? null;
}

export async function getZone(db: Database, id: string): Promise<Zone | null> {
  const [row] = await db.select().from(zones).where(eq(zones.id, id));
  return row ?? null;
}

export async function createZone(
  db: Database,
  input: ZoneInput,
  userId: string,
): Promise<Zone> {
  try {
    const [row] = await db
      .insert(zones)
      .values({
        name: input.name,
        description: input.description,
        boundary: input.boundary,
        ...centerColumns(input.boundary),
        createdBy: userId,
      })
      .returning();
    return row!;
  } catch (error) {
    if (hasPgCode(error, "23505")) throw new ZoneNameTakenError();
    throw error;
  }
}

/**
 * Last-write-wins (PRD §10): the write always goes through, but
 * `staleWrite` tells the caller the row had changed since the form loaded
 * (`expectedUpdatedAt`) so the UI can warn.
 */
export async function updateZone(
  db: Database,
  id: string,
  input: ZoneInput,
): Promise<{ zone: Zone; staleWrite: boolean }> {
  const existing = await getZone(db, id);
  if (!existing) throw new ZoneNotFoundError();

  const staleWrite =
    input.expectedUpdatedAt !== undefined &&
    new Date(input.expectedUpdatedAt).getTime() !==
      existing.updatedAt.getTime();

  try {
    const [row] = await db
      .update(zones)
      .set({
        name: input.name,
        description: input.description,
        boundary: input.boundary,
        ...centerColumns(input.boundary),
      })
      .where(eq(zones.id, id))
      .returning();
    if (!row) throw new ZoneNotFoundError();
    return { zone: row, staleWrite };
  } catch (error) {
    if (hasPgCode(error, "23505")) throw new ZoneNameTakenError();
    throw error;
  }
}

/** Deletes the zone and (cascade) all its devices; requires the exact name. */
export async function deleteZone(
  db: Database,
  id: string,
  confirmName: string,
): Promise<void> {
  const existing = await getZone(db, id);
  if (!existing) throw new ZoneNotFoundError();
  if (existing.name !== confirmName) throw new ZoneConfirmMismatchError();
  await db.delete(zones).where(eq(zones.id, id));
}
