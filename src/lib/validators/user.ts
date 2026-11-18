import { z } from "zod";
import { USER_ROLES } from "@/db/auth-schema";
import { id } from "@/lib/i18n/id";

const password = z
  .string()
  .min(8, id.users.passwordMinLength)
  .max(128, id.users.passwordMaxLength);

export const userRoleSchema = z.enum(USER_ROLES, {
  error: id.users.roleInvalid,
});

export const userCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, id.users.nameRequired)
    .max(100, id.users.nameTooLong),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, id.users.emailRequired)
    .pipe(z.email(id.users.emailInvalid)),
  password,
  role: userRoleSchema,
});

export const passwordResetSchema = z.object({ password });

export type UserCreateValues = z.input<typeof userCreateSchema>;
export type UserCreateInput = z.output<typeof userCreateSchema>;
