import { z } from "zod";
import { id } from "@/lib/i18n/id";

/** Form fields shown in the zone form (client + server share this). */
export const zoneFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, id.zone.nameRequired)
    .max(100, id.zone.nameTooLong),
  description: z
    .string()
    .trim()
    .max(1000, id.zone.descriptionTooLong)
    .optional()
    .transform((v) => (v ? v : null)),
});

const position = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

/** GeoJSON Polygon: closed rings with at least 4 positions each. */
export const geoJsonPolygonSchema = z
  .object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(position).min(4)).min(1),
  })
  .refine(
    ({ coordinates }) =>
      coordinates.every((ring) => {
        const first = ring[0]!;
        const last = ring[ring.length - 1]!;
        return first[0] === last[0] && first[1] === last[1];
      }),
    { message: id.zone.boundaryInvalid },
  );

export const zoneInputSchema = zoneFormSchema.extend({
  boundary: geoJsonPolygonSchema.nullable(),
  /** ISO timestamp of the zone's updated_at when the form was loaded. */
  expectedUpdatedAt: z.string().optional(),
});

export type ZoneFormValues = z.input<typeof zoneFormSchema>;
export type ZoneInput = z.output<typeof zoneInputSchema>;
