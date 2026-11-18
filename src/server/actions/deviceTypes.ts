"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { deviceTypeInputSchema } from "@/lib/validators/device-type";
import {
  createDeviceType,
  deleteDeviceType,
  updateDeviceType,
} from "@/server/device-types";
import { ok, runAction, type ActionResult } from "./result";

// Admin only; input re-validated with the same Zod schema as the form.

const uuid = z.string().uuid();

// Type name/icon appear on every zone page, so refresh the whole app layout.
function revalidateTypes() {
  revalidatePath("/admin/device-types");
  revalidatePath("/zones/[id]", "page");
}

export async function createDeviceTypeAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await requireAdmin();
    const parsed = deviceTypeInputSchema.parse(input);
    const row = await createDeviceType(getDb(), parsed);
    revalidateTypes();
    return ok({ id: row.id });
  });
}

export async function updateDeviceTypeAction(
  typeId: string,
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const parsed = deviceTypeInputSchema.parse(input);
    await updateDeviceType(getDb(), uuid.parse(typeId), parsed);
    revalidateTypes();
    return ok();
  });
}

export async function deleteDeviceTypeAction(
  typeId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteDeviceType(getDb(), uuid.parse(typeId));
    revalidateTypes();
    return ok();
  });
}
