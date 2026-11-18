import bbox from "@turf/bbox";
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
