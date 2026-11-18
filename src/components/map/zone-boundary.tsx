"use client";

import { Polygon } from "react-leaflet";
import type { GeoJsonPolygon } from "@/db/schema";

/**
 * Class applied to every zone-boundary path. The stroke/fill come from CSS
 * variables in globals.css (`.zone-boundary`), not from this component.
 */
export const BOUNDARY_CLASS = "zone-boundary";

/** Read-only zone polygon (GeoJSON is [lng, lat]; Leaflet wants [lat, lng]). */
export function ZoneBoundary({ boundary }: { boundary: GeoJsonPolygon }) {
  const positions = boundary.coordinates.map((ring) =>
    ring.map(([lng, lat]) => [lat, lng] as [number, number]),
  );
  return (
    <Polygon
      positions={positions}
      pathOptions={{ className: BOUNDARY_CLASS }}
    />
  );
}
