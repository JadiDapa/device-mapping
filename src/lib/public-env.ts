import { z } from "zod";

/**
 * Public (browser-visible) configuration for the map.
 *
 * Next.js only inlines NEXT_PUBLIC_* when they are accessed as literal
 * `process.env.NEXT_PUBLIC_X` expressions, so `publicEnv` below reads each
 * one explicitly instead of passing `process.env` wholesale.
 */
const DEFAULT_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const DEFAULT_TILE_ATTRIBUTION =
  "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
// Pusri industrial area, Palembang. Override via NEXT_PUBLIC_DEFAULT_CENTER_*.
const DEFAULT_CENTER_LAT = -2.9961;
const DEFAULT_CENTER_LNG = 104.8396;

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess(emptyToUndefined, z.coerce.number().pipe(schema).optional());

const publicEnvSchema = z.object({
  NEXT_PUBLIC_TILE_URL: z
    .preprocess(
      emptyToUndefined,
      z
        .string()
        .refine(
          (v) => ["{z}", "{x}", "{y}"].every((p) => v.includes(p)),
          "NEXT_PUBLIC_TILE_URL must contain {z}, {x} and {y}",
        )
        .optional(),
    )
    .transform((v) => v ?? DEFAULT_TILE_URL),
  NEXT_PUBLIC_TILE_ATTRIBUTION: z
    .preprocess(emptyToUndefined, z.string().optional())
    .transform((v) => v ?? DEFAULT_TILE_ATTRIBUTION),
  NEXT_PUBLIC_TILE_MAX_ZOOM: optionalNumber(
    z.number().int().min(1).max(30),
  ).transform((v) => v ?? 19),
  NEXT_PUBLIC_DEFAULT_CENTER_LAT: optionalNumber(
    z.number().min(-90).max(90),
  ).transform((v) => v ?? DEFAULT_CENTER_LAT),
  NEXT_PUBLIC_DEFAULT_CENTER_LNG: optionalNumber(
    z.number().min(-180).max(180),
  ).transform((v) => v ?? DEFAULT_CENTER_LNG),
  NEXT_PUBLIC_DEFAULT_ZOOM: optionalNumber(
    z.number().int().min(1).max(30),
  ).transform((v) => v ?? 16),
});

export type PublicEnv = {
  tileUrl: string;
  tileAttribution: string;
  tileMaxZoom: number;
  defaultCenter: { lat: number; lng: number };
  defaultZoom: number;
};

export function parsePublicEnv(
  source: Record<string, string | undefined>,
): PublicEnv {
  const parsed = publicEnvSchema.parse(source);
  return {
    tileUrl: parsed.NEXT_PUBLIC_TILE_URL,
    tileAttribution: parsed.NEXT_PUBLIC_TILE_ATTRIBUTION,
    tileMaxZoom: parsed.NEXT_PUBLIC_TILE_MAX_ZOOM,
    defaultCenter: {
      lat: parsed.NEXT_PUBLIC_DEFAULT_CENTER_LAT,
      lng: parsed.NEXT_PUBLIC_DEFAULT_CENTER_LNG,
    },
    defaultZoom: parsed.NEXT_PUBLIC_DEFAULT_ZOOM,
  };
}

export const publicEnv: PublicEnv = parsePublicEnv({
  NEXT_PUBLIC_TILE_URL: process.env.NEXT_PUBLIC_TILE_URL,
  NEXT_PUBLIC_TILE_ATTRIBUTION: process.env.NEXT_PUBLIC_TILE_ATTRIBUTION,
  NEXT_PUBLIC_TILE_MAX_ZOOM: process.env.NEXT_PUBLIC_TILE_MAX_ZOOM,
  NEXT_PUBLIC_DEFAULT_CENTER_LAT: process.env.NEXT_PUBLIC_DEFAULT_CENTER_LAT,
  NEXT_PUBLIC_DEFAULT_CENTER_LNG: process.env.NEXT_PUBLIC_DEFAULT_CENTER_LNG,
  NEXT_PUBLIC_DEFAULT_ZOOM: process.env.NEXT_PUBLIC_DEFAULT_ZOOM,
});
