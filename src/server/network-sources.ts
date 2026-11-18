/**
 * Network source data layer (PRD F6). Plain functions taking a `Database`;
 * authorization and revalidation live in src/server/actions/sources.ts.
 * Deleting a source detaches its devices (FK `on delete set null`).
 */
import { asc, eq, or, isNull, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { devices, deviceTypes, networkSources, zones } from "@/db/schema";
import type { NetworkSourceInput } from "@/lib/validators/network-source";
import type { DeviceStatus } from "@/lib/status";
import { hasPgCode } from "./pg";
import { ZoneNotFoundError } from "./zones";

export class NetworkSourceNotFoundError extends Error {
  constructor() {
    super("NETWORK_SOURCE_NOT_FOUND");
    this.name = "NetworkSourceNotFoundError";
  }
}

export type NetworkSource = typeof networkSources.$inferSelect;
export type NetworkSourceRow = NetworkSource & {
  zoneName: string | null;
  deviceCount: number;
};
export type SourceDevice = {
  id: string;
  seq: number;
  zoneId: string;
  zoneName: string;
  typeName: string;
  status: DeviceStatus;
  locationDetail: string | null;
};

/** All sources with their zone name and connected-device count (GROUP BY). */
export async function listNetworkSources(
  db: Database,
): Promise<NetworkSourceRow[]> {
  const rows = await db
    .select({
      source: networkSources,
      zoneName: zones.name,
      deviceCount: sql<number>`count(${devices.id})::int`,
    })
    .from(networkSources)
    .leftJoin(zones, eq(zones.id, networkSources.zoneId))
    .leftJoin(devices, eq(devices.networkSourceId, networkSources.id))
    .groupBy(networkSources.id, zones.name)
    .orderBy(asc(networkSources.name));
  return rows.map((r) => ({
    ...r.source,
    zoneName: r.zoneName,
    deviceCount: r.deviceCount,
  }));
}

/**
 * Sources to show on one zone's map / pick in its device form: those that
 * belong to the zone, those not tied to any zone, and any source one of the
 * zone's devices is connected to (so its connection line can be drawn).
 */
export async function listSourcesForZone(
  db: Database,
  zoneId: string,
): Promise<NetworkSource[]> {
  const rows = await db
    .selectDistinct({ source: networkSources })
    .from(networkSources)
    .leftJoin(
      devices,
      sql`${devices.networkSourceId} = ${networkSources.id} and ${devices.zoneId} = ${zoneId}`,
    )
    .where(
      or(
        eq(networkSources.zoneId, zoneId),
        isNull(networkSources.zoneId),
        sql`${devices.id} is not null`,
      ),
    )
    .orderBy(asc(networkSources.name));
  return rows.map((r) => r.source);
}

/** Distinct `kind` values, for the autocomplete suggestion list. */
export async function listSourceKinds(db: Database): Promise<string[]> {
  const rows = await db
    .selectDistinct({ kind: networkSources.kind })
    .from(networkSources)
    .orderBy(asc(networkSources.kind));
  return rows.map((r) => r.kind);
}

export async function getNetworkSource(
  db: Database,
  id: string,
): Promise<NetworkSource | null> {
  const [row] = await db
    .select()
    .from(networkSources)
    .where(eq(networkSources.id, id));
  return row ?? null;
}

/** Devices connected to a source, ordered by zone then number. */
export async function listSourceDevices(
  db: Database,
  sourceId: string,
): Promise<SourceDevice[]> {
  return db
    .select({
      id: devices.id,
      seq: devices.seq,
      zoneId: devices.zoneId,
      zoneName: zones.name,
      typeName: deviceTypes.name,
      status: devices.status,
      locationDetail: devices.locationDetail,
    })
    .from(devices)
    .innerJoin(zones, eq(zones.id, devices.zoneId))
    .innerJoin(deviceTypes, eq(deviceTypes.id, devices.deviceTypeId))
    .where(eq(devices.networkSourceId, sourceId))
    .orderBy(asc(zones.name), asc(devices.seq));
}

export async function createNetworkSource(
  db: Database,
  input: NetworkSourceInput,
): Promise<NetworkSource> {
  try {
    const [row] = await db
      .insert(networkSources)
      .values({
        zoneId: input.zoneId,
        name: input.name,
        kind: input.kind,
        lat: input.lat,
        lng: input.lng,
        description: input.description,
      })
      .returning();
    return row!;
  } catch (error) {
    if (hasPgCode(error, "23503")) throw new ZoneNotFoundError();
    throw error;
  }
}

export async function updateNetworkSource(
  db: Database,
  id: string,
  input: NetworkSourceInput,
): Promise<NetworkSource> {
  try {
    const [row] = await db
      .update(networkSources)
      .set({
        zoneId: input.zoneId,
        name: input.name,
        kind: input.kind,
        lat: input.lat,
        lng: input.lng,
        description: input.description,
      })
      .where(eq(networkSources.id, id))
      .returning();
    if (!row) throw new NetworkSourceNotFoundError();
    return row;
  } catch (error) {
    if (hasPgCode(error, "23503")) throw new ZoneNotFoundError();
    throw error;
  }
}

export async function moveNetworkSourcePosition(
  db: Database,
  id: string,
  position: { lat: number; lng: number },
): Promise<NetworkSource> {
  const [row] = await db
    .update(networkSources)
    .set({ lat: position.lat, lng: position.lng })
    .where(eq(networkSources.id, id))
    .returning();
  if (!row) throw new NetworkSourceNotFoundError();
  return row;
}

export async function deleteNetworkSource(
  db: Database,
  id: string,
): Promise<NetworkSource> {
  const [row] = await db
    .delete(networkSources)
    .where(eq(networkSources.id, id))
    .returning();
  if (!row) throw new NetworkSourceNotFoundError();
  return row;
}
