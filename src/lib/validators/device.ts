import { z } from "zod";
import { id } from "@/lib/i18n/id";
import { DEVICE_STATUSES } from "@/lib/status";

const uuid = z.string().uuid(id.validation.invalidId);

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullish()
    .transform((v) => (v ? v : null));

const lat = z.number(id.device.latInvalid).min(-90).max(90);
const lng = z.number(id.device.lngInvalid).min(-180).max(180);

/**
 * Checklist + free note that describe a `partial` installation (PRD §4). The
 * values are stored for every status; they are only *required* to carry
 * information when the status is `partial`.
 */
const statusFields = {
  status: z.enum(DEVICE_STATUSES),
  hasPower: z.boolean().default(false),
  hasFo: z.boolean().default(false),
  hasEthernet: z.boolean().default(false),
  partialNote: optionalText(1000, id.statusChange.partialNoteTooLong),
};

type PartialCheck = {
  status: (typeof DEVICE_STATUSES)[number];
  hasPower: boolean;
  hasFo: boolean;
  hasEthernet: boolean;
  partialNote: string | null;
};

/** Partial needs at least one checked component or a non-empty note. */
export function partialIsValid(v: PartialCheck): boolean {
  if (v.status !== "partial") return true;
  return v.hasPower || v.hasFo || v.hasEthernet || !!v.partialNote;
}

const partialMessage = {
  message: id.statusChange.partialRequired,
  path: ["partialNote"],
};

/** Quick status change (segmented buttons + partial checklist). */
export const deviceStatusSchema = z
  .object({
    ...statusFields,
    /** Optional free-text note stored on the history row. */
    note: optionalText(1000, id.statusChange.noteTooLong),
    expectedUpdatedAt: z.string().optional(),
  })
  .refine(partialIsValid, partialMessage);

const detailFields = {
  deviceTypeId: uuid,
  isRouter: z.boolean().default(false),
  locationDetail: optionalText(200, id.device.locationDetailTooLong),
  notes: optionalText(2000, id.device.notesTooLong),
  /** Optional link to a network source ("" from a select means none). */
  networkSourceId: z
    .union([uuid, z.literal("")])
    .nullish()
    .transform((v) => (v ? v : null)),
  /** Optional Router+BLE this device connects to ("" = none). */
  parentDeviceId: z
    .union([uuid, z.literal("")])
    .nullish()
    .transform((v) => (v ? v : null)),
};

/** Edit of the non-status fields. Status goes through setDeviceStatus. */
export const deviceUpdateSchema = z.object({
  ...detailFields,
  expectedUpdatedAt: z.string().optional(),
});

/** Create: detail + position + initial status (history row `from = null`). */
export const deviceCreateSchema = z
  .object({
    zoneId: uuid,
    ...detailFields,
    lat,
    lng,
    ...statusFields,
  })
  .refine(partialIsValid, partialMessage);

export const movePositionSchema = z.object({ lat, lng });

export const moveZoneSchema = z.object({ zoneId: uuid });

/** Ordered ids of every device in the zone, new order top to bottom. */
export const reorderSchema = z
  .object({ zoneId: uuid, ids: z.array(uuid) })
  .refine((v) => new Set(v.ids).size === v.ids.length, {
    message: id.validation.reorderDuplicate,
    path: ["ids"],
  });

export type DeviceCreateInput = z.output<typeof deviceCreateSchema>;
export type DeviceUpdateInput = z.output<typeof deviceUpdateSchema>;
export type DeviceUpdateValues = z.input<typeof deviceUpdateSchema>;
export type DeviceStatusInput = z.output<typeof deviceStatusSchema>;
export type DeviceCreateValues = z.input<typeof deviceCreateSchema>;
