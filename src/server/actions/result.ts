import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/authz";
import { fmt } from "@/lib/i18n/format";
import { id } from "@/lib/i18n/id";
import {
  DeviceTypeInUseError,
  DeviceTypeNameTakenError,
  DeviceTypeNotFoundError,
} from "@/server/device-types";
import { DeviceNotFoundError, ReorderMismatchError } from "@/server/devices";
import { NetworkSourceNotFoundError } from "@/server/network-sources";
import {
  ZoneConfirmMismatchError,
  ZoneNameTakenError,
  ZoneNotFoundError,
} from "@/server/zones";

/**
 * Server Actions always answer HTTP 200, so the PRD's "403 for a guest" is
 * carried in `status` on the result instead.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: 401 | 403 | 404 | 409 | 422 | 500;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

export function ok(): ActionResult<undefined>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

/** Run an action body and map known errors to an ActionResult. */
export async function runAction<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, status: 401, error: id.common.unauthorized };
    }
    if (error instanceof ForbiddenError) {
      return { ok: false, status: 403, error: id.common.forbidden };
    }
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const key = issue.path.join(".") || "_";
        (fieldErrors[key] ??= []).push(issue.message);
      }
      return {
        ok: false,
        status: 422,
        error: error.issues[0]?.message ?? id.common.genericError,
        fieldErrors,
      };
    }
    if (error instanceof ZoneNameTakenError) {
      return {
        ok: false,
        status: 409,
        error: id.zone.nameTaken,
        fieldErrors: { name: [id.zone.nameTaken] },
      };
    }
    if (error instanceof ZoneNotFoundError) {
      return { ok: false, status: 404, error: id.zone.notFound };
    }
    if (error instanceof ZoneConfirmMismatchError) {
      return {
        ok: false,
        status: 422,
        error: id.zone.deleteConfirmMismatch,
      };
    }
    if (error instanceof DeviceTypeNameTakenError) {
      return {
        ok: false,
        status: 409,
        error: id.deviceType.nameTaken,
        fieldErrors: { name: [id.deviceType.nameTaken] },
      };
    }
    if (error instanceof DeviceTypeNotFoundError) {
      return { ok: false, status: 404, error: id.deviceType.notFound };
    }
    if (error instanceof DeviceTypeInUseError) {
      return {
        ok: false,
        status: 409,
        error: fmt(id.deviceType.inUse, { n: error.count }),
      };
    }
    if (error instanceof NetworkSourceNotFoundError) {
      return { ok: false, status: 404, error: id.source.notFound };
    }
    if (error instanceof DeviceNotFoundError) {
      return { ok: false, status: 404, error: id.device.notFound };
    }
    if (error instanceof ReorderMismatchError) {
      return { ok: false, status: 409, error: id.device.reorderMismatch };
    }
    console.error(error);
    return { ok: false, status: 500, error: id.common.genericError };
  }
}
