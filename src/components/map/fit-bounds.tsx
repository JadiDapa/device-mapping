"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { GeoJsonPolygon } from "@/db/schema";
import { polygonBounds } from "@/lib/geo";

/**
 * Fits the map to the saved boundary once (AC F3: auto fitBounds). Without a
 * boundary the MapContainer's default centre/zoom (from env) stay in effect.
 */
export function FitBounds({ boundary }: { boundary: GeoJsonPolygon | null }) {
  const map = useMap();
  useEffect(() => {
    if (!boundary) return;
    map.fitBounds(polygonBounds(boundary), { padding: [24, 24] });
    // Only the saved boundary matters; live edits must not move the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}
