import bbox from "@turf/bbox";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import center from "@turf/center";
import type { GeoJsonPolygon } from "@/db/schema";

/** Centre of a polygon (lat/lng), via Turf. */
export function polygonCenter(polygon: GeoJsonPolygon): {
  lat: number;
  lng: number;
} {
  const feature = center({
    type: "Feature",
    properties: {},
    geometry: polygon,
  });
  const [lng, lat] = feature.geometry.coordinates as [number, number];
  return { lat, lng };
}

/**
 * Whether a point lies inside the zone polygon. A zone without a boundary
 * has nothing to be outside of, so it never triggers the out-of-zone warning.
 */
export function isPointInZone(
  point: { lat: number; lng: number },
  boundary: GeoJsonPolygon | null,
): boolean {
  if (!boundary) return true;
  return booleanPointInPolygon([point.lng, point.lat], boundary);
}

/** Leaflet-style bounds `[[south, west], [north, east]]`. */
export function polygonBounds(
  polygon: GeoJsonPolygon,
): [[number, number], [number, number]] {
  const [west, south, east, north] = bbox(polygon);
  return [
    [south, west],
    [north, east],
  ];
}
