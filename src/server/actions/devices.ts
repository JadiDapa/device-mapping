"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import {
  deviceCreateSchema,
  deviceStatusSchema,
  deviceUpdateSchema,
  movePositionSchema,
  moveZoneSchema,
  reorderSchema,
} from "@/lib/validators/device";
import {
  createDevice,
  deleteDevice,
  getDevice,
  listDeviceHistory,
  moveDevicePosition,
  moveDeviceToZone,
  reorderDevices,
  setDeviceStatus,
  updateDevice,
  DeviceNotFoundError,
  type Device,
  type DeviceHistoryEntry,
} from "@/server/devices";
import { ok, runAction, type ActionResult } from "./result";

// Every mutation: requireAdmin() first (guest => 403), then re-validate with
// the same Zod schema the client form used. Reads of history only need a
// signed-in user.

const uuid = z.string().uuid();

/** Dashboard counts and the zone page both depend on device data. */
function revalidateZone(...zoneIds: string[]) {
  revalidatePath("/");
  for (const zoneId of new Set(zoneIds)) revalidatePath(`/zones/${zoneId}`);
}

export async function createDeviceAction(
  input: unknown,
): Promise<ActionResult<{ device: Device }>> {
  return runAction(async () => {
    const session = await requireAdmin();
    const parsed = deviceCreateSchema.parse(input);
    const device = await createDevice(getDb(), parsed, session.user.id);
    revalidateZone(device.zoneId);
    return ok({ device });
  });
}

export async function updateDeviceAction(
  deviceId: string,
  input: unknown,
): Promise<ActionResult<{ device: Device; staleWrite: boolean }>> {
  return runAction(async () => {
    const session = await requireAdmin();
    const parsed = deviceUpdateSchema.parse(input);
    const result = await updateDevice(
      getDb(),
      uuid.parse(deviceId),
      parsed,
      session.user.id,
    );
    revalidateZone(result.device.zoneId);
    return ok(result);
  });
}

export async function moveDevicePositionAction(
  deviceId: string,
  input: unknown,
): Promise<ActionResult<{ device: Device }>> {
  return runAction(async () => {
    const session = await requireAdmin();
    const parsed = movePositionSchema.parse(input);
    const device = await moveDevicePosition(
      getDb(),
      uuid.parse(deviceId),
      parsed,
      session.user.id,
    );
    revalidateZone(device.zoneId);
    return ok({ device });
  });
}

export async function setDeviceStatusAction(
  deviceId: string,
  input: unknown,
): Promise<ActionResult<{ device: Device; staleWrite: boolean }>> {
  return runAction(async () => {
    const session = await requireAdmin();
    const parsed = deviceStatusSchema.parse(input);
    const { device, staleWrite } = await setDeviceStatus(
      getDb(),
      uuid.parse(deviceId),
      parsed,
      session.user.id,
    );
    revalidateZone(device.zoneId);
    return ok({ device, staleWrite });
  });
}

export async function deleteDeviceAction(
  deviceId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const parsedId = uuid.parse(deviceId);
    const existing = await getDevice(getDb(), parsedId);
    if (!existing) throw new DeviceNotFoundError();
    await deleteDevice(getDb(), parsedId);
    revalidateZone(existing.zoneId);
    return ok();
  });
}

export async function reorderDevicesAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const { zoneId, ids } = reorderSchema.parse(input);
    await reorderDevices(getDb(), zoneId, ids);
    revalidateZone(zoneId);
    return ok();
  });
}

export async function moveDeviceZoneAction(
  deviceId: string,
  input: unknown,
): Promise<ActionResult<{ device: Device }>> {
  return runAction(async () => {
    const session = await requireAdmin();
    const { zoneId } = moveZoneSchema.parse(input);
    const parsedId = uuid.parse(deviceId);
    const before = await getDevice(getDb(), parsedId);
    if (!before) throw new DeviceNotFoundError();
    const device = await moveDeviceToZone(
      getDb(),
      parsedId,
      zoneId,
      session.user.id,
    );
    revalidateZone(before.zoneId, device.zoneId);
    return ok({ device });
  });
}

export async function getDeviceHistoryAction(
  deviceId: string,
): Promise<ActionResult<{ history: DeviceHistoryEntry[] }>> {
  return runAction(async () => {
    await requireUser();
    const history = await listDeviceHistory(getDb(), uuid.parse(deviceId));
    return ok({ history });
  });
}
