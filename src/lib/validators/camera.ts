import { z } from "zod";
import { id } from "@/lib/i18n/id";

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

/** Limits shared by the browser compressor and the upload route. */
export const MAX_IMAGES_PER_POINT = 50;
export const DISPLAY_MAX_PX = 2560;
export const THUMB_MAX_PX = 400;
export const MAX_DISPLAY_BYTES = 5 * 1024 * 1024;
export const MAX_THUMB_BYTES = 512 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const detailFields = {
  name: z
    .string()
    .trim()
    .min(1, id.camera.nameRequired)
    .max(100, id.camera.nameTooLong),
  notes: optionalText(2000, id.device.notesTooLong),
};

export const cameraPointCreateSchema = z.object({
  zoneId: uuid,
  ...detailFields,
  lat,
  lng,
});

export const cameraPointUpdateSchema = z.object(detailFields);

export const cameraPointMoveSchema = z.object({ lat, lng });

export const imageCaptionSchema = z.object({
  caption: optionalText(300, id.camera.captionTooLong),
});

/** Full ordered list of the point's image ids (no duplicates). */
export const imageReorderSchema = z
  .array(uuid)
  .max(MAX_IMAGES_PER_POINT)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: id.validation.reorderDuplicate,
  });

export type CameraPointCreateInput = z.output<typeof cameraPointCreateSchema>;
export type CameraPointCreateValues = z.input<typeof cameraPointCreateSchema>;
export type CameraPointUpdateInput = z.output<typeof cameraPointUpdateSchema>;
export type CameraPointUpdateValues = z.input<typeof cameraPointUpdateSchema>;
