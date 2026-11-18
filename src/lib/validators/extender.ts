import { z } from "zod";
import { id } from "@/lib/i18n/id";

const uuid = z.string().uuid(id.validation.invalidId);
const optionalUuid = z
  .union([uuid, z.literal("")])
  .nullish()
  .transform((v) => (v ? v : null));
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullish()
    .transform((v) => (v ? v : null));

const lat = z.number(id.device.latInvalid).min(-90).max(90);
const lng = z.number(id.device.lngInvalid).min(-180).max(180);

const detailFields = {
  fromDeviceId: optionalUuid,
  toDeviceId: optionalUuid,
  locationDetail: optionalText(200, id.device.locationDetailTooLong),
  notes: optionalText(2000, id.device.notesTooLong),
};

const differentEnds = {
  message: id.extender.sameEnds,
  path: ["toDeviceId"],
};
const endsDiffer = (v: {
  fromDeviceId: string | null;
  toDeviceId: string | null;
}) => !v.fromDeviceId || v.fromDeviceId !== v.toDeviceId;

export const extenderCreateSchema = z
  .object({ zoneId: uuid, ...detailFields, lat, lng })
  .refine(endsDiffer, differentEnds);

export const extenderUpdateSchema = z
  .object(detailFields)
  .refine(endsDiffer, differentEnds);

export const extenderMoveSchema = z.object({ lat, lng });

export type ExtenderCreateInput = z.output<typeof extenderCreateSchema>;
export type ExtenderCreateValues = z.input<typeof extenderCreateSchema>;
export type ExtenderUpdateInput = z.output<typeof extenderUpdateSchema>;
export type ExtenderUpdateValues = z.input<typeof extenderUpdateSchema>;

/** "5→6"; a missing/deleted end shows "?". */
export function extenderLabel(
  fromSeq: number | null | undefined,
  toSeq: number | null | undefined,
): string {
  return `${fromSeq ?? "?"}→${toSeq ?? "?"}`;
}
