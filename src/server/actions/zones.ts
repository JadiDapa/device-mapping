"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { zoneInputSchema } from "@/lib/validators/zone";
import { createZone, deleteZone, updateZone } from "@/server/zones";
import { ok, runAction, type ActionResult } from "./result";

// Every action: requireAdmin() first (guest => 403), then re-validate the
// input with the same Zod schema the client form used.

const uuid = z.string().uuid();

export async function createZoneAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const session = await requireAdmin();
    const parsed = zoneInputSchema.parse(input);
    const zone = await createZone(getDb(), parsed, session.user.id);
    revalidatePath("/");
    return ok({ id: zone.id });
  });
}

export async function updateZoneAction(
  zoneId: string,
  input: unknown,
): Promise<ActionResult<{ staleWrite: boolean }>> {
  return runAction(async () => {
    await requireAdmin();
    const parsed = zoneInputSchema.parse(input);
    const { staleWrite } = await updateZone(
      getDb(),
      uuid.parse(zoneId),
      parsed,
    );
    revalidatePath("/");
    revalidatePath(`/zones/${zoneId}`);
    return ok({ staleWrite });
  });
}

export async function deleteZoneAction(
  zoneId: string,
  confirmName: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteZone(getDb(), uuid.parse(zoneId), confirmName);
    revalidatePath("/");
    return ok();
  });
}
