"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import {
  extenderCreateSchema,
  extenderMoveSchema,
  extenderUpdateSchema,
} from "@/lib/validators/extender";
import {
  createExtender,
  deleteExtender,
  moveExtenderPosition,
  updateExtender,
  type Extender,
} from "@/server/extenders";
import { ok, runAction, type ActionResult } from "./result";

// Every mutation: requireAdmin() first (guest => 403), then re-validate with
// the same Zod schema the client form used.

const uuid = z.string().uuid();

function revalidateZone(zoneId: string) {
  revalidatePath("/");
  revalidatePath(`/zones/${zoneId}`);
}

export async function createExtenderAction(
  input: unknown,
): Promise<ActionResult<{ extender: Extender }>> {
  return runAction(async () => {
    const session = await requireAdmin();
    const parsed = extenderCreateSchema.parse(input);
    const extender = await createExtender(getDb(), parsed, session.user.id);
    revalidateZone(extender.zoneId);
    return ok({ extender });
  });
}

export async function updateExtenderAction(
  extenderId: string,
  input: unknown,
): Promise<ActionResult<{ extender: Extender }>> {
  return runAction(async () => {
    const session = await requireAdmin();
    const parsed = extenderUpdateSchema.parse(input);
    const extender = await updateExtender(
      getDb(),
      uuid.parse(extenderId),
      parsed,
      session.user.id,
    );
    revalidateZone(extender.zoneId);
    return ok({ extender });
  });
}

export async function moveExtenderPositionAction(
  extenderId: string,
  input: unknown,
): Promise<ActionResult<{ extender: Extender }>> {
  return runAction(async () => {
    const session = await requireAdmin();
    const parsed = extenderMoveSchema.parse(input);
    const extender = await moveExtenderPosition(
      getDb(),
      uuid.parse(extenderId),
      parsed,
      session.user.id,
    );
    revalidateZone(extender.zoneId);
    return ok({ extender });
  });
}

export async function deleteExtenderAction(
  extenderId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const extender = await deleteExtender(getDb(), uuid.parse(extenderId));
    revalidateZone(extender.zoneId);
    return ok();
  });
}
