"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import {
  passwordResetSchema,
  userCreateSchema,
  userRoleSchema,
} from "@/lib/validators/user";
import {
  createUser,
  resetUserPassword,
  setUserActive,
  setUserRole,
} from "@/server/users";
import { ok, runAction, type ActionResult } from "./result";

// Admin only; input re-validated with the same Zod schemas as the forms.

const uuid = z.string().uuid();

function revalidateUsers() {
  revalidatePath("/admin/users");
}

export async function createUserAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await requireAdmin();
    const parsed = userCreateSchema.parse(input);
    const row = await createUser(getDb(), parsed);
    revalidateUsers();
    return ok({ id: row.id });
  });
}

export async function setUserRoleAction(
  userId: string,
  role: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireAdmin();
    await setUserRole(
      getDb(),
      session.user.id,
      uuid.parse(userId),
      userRoleSchema.parse(role),
    );
    revalidateUsers();
    return ok();
  });
}

export async function resetUserPasswordAction(
  userId: string,
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const parsed = passwordResetSchema.parse(input);
    await resetUserPassword(getDb(), uuid.parse(userId), parsed.password);
    revalidateUsers();
    return ok();
  });
}

export async function setUserActiveAction(
  userId: string,
  active: boolean,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireAdmin();
    await setUserActive(
      getDb(),
      session.user.id,
      uuid.parse(userId),
      z.boolean().parse(active),
    );
    revalidateUsers();
    return ok();
  });
}
