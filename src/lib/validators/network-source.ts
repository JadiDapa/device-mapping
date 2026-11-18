import { z } from "zod";
import { id } from "@/lib/i18n/id";

const lat = z.number(id.source.latInvalid).min(-90).max(90);
const lng = z.number(id.source.lngInvalid).min(-180).max(180);

/** Create / edit a network source (client form + server share this). */
export const networkSourceInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, id.source.nameRequired)
    .max(100, id.source.nameTooLong),
  kind: z
    .string()
    .trim()
    .min(1, id.source.kindRequired)
    .max(60, id.source.kindTooLong),
  description: z
    .string()
    .trim()
    .max(1000, id.source.descriptionTooLong)
    .nullish()
    .transform((v) => (v ? v : null)),
  /** A source may sit between zones, so the zone is optional. */
  zoneId: z
    .string()
    .uuid(id.validation.invalidId)
    .nullish()
    .transform((v) => v ?? null),
  lat,
  lng,
});

export const networkSourcePositionSchema = z.object({ lat, lng });

export type NetworkSourceInput = z.output<typeof networkSourceInputSchema>;
export type NetworkSourceValues = z.input<typeof networkSourceInputSchema>;
