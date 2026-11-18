/**
 * Device data layer (PRD F4, §6). Plain functions taking a `Database` so they
 * run against the test database; authorization and cache revalidation live
 * in the Server Actions (src/server/actions/devices.ts).
 *
 * Numbering invariant: within a zone `seq` is 1..n without gaps. Every write
 * that can change it (create, delete, reorder, move zone) runs in ONE
 * transaction that first locks the zone row(s) `FOR UPDATE`, so concurrent
 * writers serialise. The `unique (zone_id, seq)` constraint is DEFERRABLE
 * INITIALLY DEFERRED, so intermediate duplicates inside a transaction are
 * fine; it is checked at COMMIT.
 */
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/db";
import {
  deviceStatusHistory,
  devices,
  deviceTypes,
  user,
  zones,
  type StatusSnapshot,
} from "@/db/schema";
import type {
  DeviceCreateInput,
  DeviceStatusInput,
  DeviceUpdateInput,
} from "@/lib/validators/device";
import { DeviceTypeNotFoundError } from "./device-types";
import { NetworkSourceNotFoundError } from "./network-sources";
import { hasPgCode, pgConstraint } from "./pg";
import { ZoneNotFoundError } from "./zones";

export class DeviceNotFoundError extends Error {
  constructor() {
    super("DEVICE_NOT_FOUND");
    this.name = "DeviceNotFoundError";
  }
}

export class ReorderMismatchError extends Error {
  constructor() {
    super("REORDER_MISMATCH");
    this.name = "ReorderMismatchError";
  }
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type Device = typeof devices.$inferSelect;
export type ZoneDevice = Device & { typeName: string; typeIcon: string };
export type DeviceHistoryEntry = {
  id: string;
  fromStatus: Device["status"] | null;
  toStatus: Device["status"];
  snapshot: StatusSnapshot;
  note: string | null;
  changedAt: Date;
  changedByName: string | null;
};

/** Lock zone rows in a stable (id) order so two movers can't deadlock. */
async function lockZones(tx: Tx, zoneIds: string[]): Promise<void> {
  const unique = [...new Set(zoneIds)];
  const rows = await tx
    .select({ id: zones.id })
    .from(zones)
    .where(inArray(zones.id, unique))
    .orderBy(asc(zones.id))
    .for("update");
  if (rows.length !== unique.length) throw new ZoneNotFoundError();
}

/** `max(seq) + 1` for the zone (call only while holding its lock). */
async function nextSeq(tx: Tx, zoneId: string): Promise<number> {
  const [row] = await tx
    .select({ next: sql<number>`coalesce(max(${devices.seq}), 0)::int + 1` })
    .from(devices)
    .where(eq(devices.zoneId, zoneId));
  return row?.next ?? 1;
}

/** Rewrite seq to 1..n following the current order (closes any gap). */
async function renumberZone(tx: Tx, zoneId: string): Promise<void> {
  await tx.execute(sql`
    UPDATE devices d
    SET seq = r.rn
    FROM (
      SELECT id, row_number() OVER (ORDER BY seq) AS rn
      FROM devices
      WHERE zone_id = ${zoneId}
    ) r
    WHERE d.id = r.id AND d.seq <> r.rn
  `);
}

/** FK violation (23503) -> the specific "not found" error. */
function mapFkError(error: unknown): never {
  if (hasPgCode(error, "23503")) {
    if (pgConstraint(error)?.includes("network_source")) {
      throw new NetworkSourceNotFoundError();
    }
    throw new DeviceTypeNotFoundError();
  }
  throw error;
}

function snapshotOf(d: {
  hasPower: boolean;
  hasFo: boolean;
  hasEthernet: boolean;
  partialNote: string | null;
}): StatusSnapshot {
  return {
    has_power: d.hasPower,
    has_fo: d.hasFo,
    has_ethernet: d.hasEthernet,
    partial_note: d.partialNote,
  };
}

function isStale(expected: string | undefined, actual: Date): boolean {
  return (
    expected !== undefined && new Date(expected).getTime() !== actual.getTime()
  );
}

export async function getDevice(
  db: Database,
  id: string,
): Promise<Device | null> {
  const [row] = await db.select().from(devices).where(eq(devices.id, id));
  return row ?? null;
}

export async function listZoneDevices(
  db: Database,
  zoneId: string,
): Promise<ZoneDevice[]> {
  const rows = await db
    .select({
      device: devices,
      typeName: deviceTypes.name,
      typeIcon: deviceTypes.icon,
    })
    .from(devices)
    .innerJoin(deviceTypes, eq(deviceTypes.id, devices.deviceTypeId))
    .where(eq(devices.zoneId, zoneId))
    .orderBy(asc(devices.seq));
  return rows.map((r) => ({
    ...r.device,
    typeName: r.typeName,
    typeIcon: r.typeIcon,
  }));
}

/** Newest first. */
export async function listDeviceHistory(
  db: Database,
  deviceId: string,
): Promise<DeviceHistoryEntry[]> {
  return db
    .select({
      id: deviceStatusHistory.id,
      fromStatus: deviceStatusHistory.fromStatus,
      toStatus: deviceStatusHistory.toStatus,
      snapshot: deviceStatusHistory.snapshot,
      note: deviceStatusHistory.note,
      changedAt: deviceStatusHistory.changedAt,
      changedByName: user.name,
    })
    .from(deviceStatusHistory)
    .leftJoin(user, eq(user.id, deviceStatusHistory.changedBy))
    .where(eq(deviceStatusHistory.deviceId, deviceId))
    .orderBy(
      desc(deviceStatusHistory.changedAt),
      desc(deviceStatusHistory.createdAt),
    );
}

/**
 * New device at `max(seq) + 1` plus its first history row (`from = null`),
 * atomically. The zone lock serialises concurrent creates.
 */
export async function createDevice(
  db: Database,
  input: DeviceCreateInput,
  userId: string,
): Promise<Device> {
  try {
    return await db.transaction(async (tx) => {
      await lockZones(tx, [input.zoneId]);
      const [row] = await tx
        .insert(devices)
        .values({
          zoneId: input.zoneId,
          seq: await nextSeq(tx, input.zoneId),
          deviceTypeId: input.deviceTypeId,
          isRouter: input.isRouter,
          lat: input.lat,
          lng: input.lng,
          locationDetail: input.locationDetail,
          notes: input.notes,
          networkSourceId: input.networkSourceId,
          status: input.status,
          hasPower: input.hasPower,
          hasFo: input.hasFo,
          hasEthernet: input.hasEthernet,
          partialNote: input.partialNote,
          updatedBy: userId,
        })
        .returning();

      await tx.insert(deviceStatusHistory).values({
        deviceId: row!.id,
        fromStatus: null,
        toStatus: row!.status,
        snapshot: snapshotOf(row!),
        note: null,
        changedBy: userId,
      });
      return row!;
    });
  } catch (error) {
    return mapFkError(error);
  }
}

/** Edit the non-status fields. Last write wins; `staleWrite` flags a conflict. */
export async function updateDevice(
  db: Database,
  id: string,
  input: DeviceUpdateInput,
  userId: string,
): Promise<{ device: Device; staleWrite: boolean }> {
  const existing = await getDevice(db, id);
  if (!existing) throw new DeviceNotFoundError();
  try {
    const [row] = await db
      .update(devices)
      .set({
        deviceTypeId: input.deviceTypeId,
        isRouter: input.isRouter,
        locationDetail: input.locationDetail,
        notes: input.notes,
        networkSourceId: input.networkSourceId,
        updatedBy: userId,
      })
      .where(eq(devices.id, id))
      .returning();
    if (!row) throw new DeviceNotFoundError();
    return {
      device: row,
      staleWrite: isStale(input.expectedUpdatedAt, existing.updatedAt),
    };
  } catch (error) {
    if (error instanceof DeviceNotFoundError) throw error;
    return mapFkError(error);
  }
}

export async function moveDevicePosition(
  db: Database,
  id: string,
  position: { lat: number; lng: number },
  userId: string,
): Promise<Device> {
  const [row] = await db
    .update(devices)
    .set({ lat: position.lat, lng: position.lng, updatedBy: userId })
    .where(eq(devices.id, id))
    .returning();
  if (!row) throw new DeviceNotFoundError();
  return row;
}

/**
 * Change status / partial checklist. Writes one history row whenever the
 * status or the checklist actually changes; an identical submit is a no-op.
 * The checklist is stored for every status (PRD §4), not cleared.
 */
export async function setDeviceStatus(
  db: Database,
  id: string,
  input: DeviceStatusInput,
  userId: string,
): Promise<{ device: Device; changed: boolean; staleWrite: boolean }> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(devices)
      .where(eq(devices.id, id))
      .for("update");
    if (!existing) throw new DeviceNotFoundError();

    const staleWrite = isStale(input.expectedUpdatedAt, existing.updatedAt);
    const unchanged =
      existing.status === input.status &&
      existing.hasPower === input.hasPower &&
      existing.hasFo === input.hasFo &&
      existing.hasEthernet === input.hasEthernet &&
      existing.partialNote === input.partialNote;
    if (unchanged) return { device: existing, changed: false, staleWrite };

    const [row] = await tx
      .update(devices)
      .set({
        status: input.status,
        hasPower: input.hasPower,
        hasFo: input.hasFo,
        hasEthernet: input.hasEthernet,
        partialNote: input.partialNote,
        updatedBy: userId,
      })
      .where(eq(devices.id, id))
      .returning();

    await tx.insert(deviceStatusHistory).values({
      deviceId: id,
      fromStatus: existing.status,
      toStatus: input.status,
      snapshot: snapshotOf(row!),
      note: input.note,
      changedBy: userId,
    });
    return { device: row!, changed: true, staleWrite };
  });
}

/** Delete a device and close the gap in its zone, in one transaction. */
export async function deleteDevice(db: Database, id: string): Promise<void> {
  const existing = await getDevice(db, id);
  if (!existing) throw new DeviceNotFoundError();
  await db.transaction(async (tx) => {
    await lockZones(tx, [existing.zoneId]);
    const deleted = await tx
      .delete(devices)
      .where(eq(devices.id, id))
      .returning({ id: devices.id });
    if (deleted.length === 0) throw new DeviceNotFoundError();
    await renumberZone(tx, existing.zoneId);
  });
}

/**
 * Apply a new order: `ids` must be exactly the zone's devices (no more, no
 * fewer); seq is rewritten to 1..n in that order.
 */
export async function reorderDevices(
  db: Database,
  zoneId: string,
  ids: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await lockZones(tx, [zoneId]);
    const current = await tx
      .select({ id: devices.id })
      .from(devices)
      .where(eq(devices.zoneId, zoneId));

    const wanted = new Set(ids);
    if (
      wanted.size !== ids.length ||
      current.length !== ids.length ||
      current.some((d) => !wanted.has(d.id))
    ) {
      throw new ReorderMismatchError();
    }
    if (ids.length === 0) return;

    const values = sql.join(
      ids.map((deviceId, i) => sql`(${deviceId}::uuid, ${i + 1}::int)`),
      sql`, `,
    );
    await tx.execute(sql`
      UPDATE devices d
      SET seq = v.seq
      FROM (VALUES ${values}) AS v(id, seq)
      WHERE d.id = v.id
    `);
  });
}

/**
 * Move to another zone: last position there, source zone closed up (PRD §6).
 * Both zones are locked in id order.
 */
export async function moveDeviceToZone(
  db: Database,
  id: string,
  targetZoneId: string,
  userId: string,
): Promise<Device> {
  const existing = await getDevice(db, id);
  if (!existing) throw new DeviceNotFoundError();
  if (existing.zoneId === targetZoneId) return existing;

  return db.transaction(async (tx) => {
    await lockZones(tx, [existing.zoneId, targetZoneId]);

    // Re-read under the lock: the device may have moved meanwhile.
    const [current] = await tx.select().from(devices).where(eq(devices.id, id));
    if (!current) throw new DeviceNotFoundError();
    if (current.zoneId === targetZoneId) return current;

    const [row] = await tx
      .update(devices)
      .set({
        zoneId: targetZoneId,
        seq: await nextSeq(tx, targetZoneId),
        updatedBy: userId,
      })
      .where(eq(devices.id, id))
      .returning();

    await renumberZone(tx, current.zoneId);
    return row!;
  });
}
