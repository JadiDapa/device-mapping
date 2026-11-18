"use client";

import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { MapContainer, TileLayer } from "react-leaflet";
import type { GeoJsonPolygon } from "@/db/schema";
import { publicEnv } from "@/lib/public-env";
import { cn } from "@/lib/utils";
import { DrawControl } from "./draw-control";
import { FitBounds } from "./fit-bounds";
import { ZoneBoundary } from "./zone-boundary";

const OVERZOOM = 3;

type Props = {
  /** Saved boundary: drawn read-only (or as the editor's seed) and fitted to. */
  boundary: GeoJsonPolygon | null;
  /** When set, shows the draw/edit controls and reports changes. */
  onBoundaryChange?: (polygon: GeoJsonPolygon | null) => void;
  /** Fallback view when there is no boundary. */
  center?: { lat: number; lng: number } | null;
  zoom?: number | null;
  className?: string;
  /** Extra layers (markers, interactions) rendered inside the map. */
  children?: React.ReactNode;
};

/**
 * Satellite map (tile URL + attribution from NEXT_PUBLIC_TILE_*; the
 * attribution control stays on, as required). Leaflet touches `window`, so
 * only import this through ./index (dynamic, ssr: false).
 */
export default function MapView({
  boundary,
  onBoundaryChange,
  center,
  zoom,
  className,
  children,
}: Props) {
  const view = center ?? publicEnv.defaultCenter;
  return (
    <MapContainer
      center={[view.lat, view.lng]}
      zoom={zoom ?? publicEnv.defaultZoom}
      // Allow zooming past the last native tile level (tiles are upscaled).
      maxZoom={publicEnv.tileMaxZoom + OVERZOOM}
      scrollWheelZoom
      className={cn("size-full min-h-64 rounded-lg", className)}
    >
      <TileLayer
        url={publicEnv.tileUrl}
        attribution={publicEnv.tileAttribution}
        maxNativeZoom={publicEnv.tileMaxZoom}
        maxZoom={publicEnv.tileMaxZoom + OVERZOOM}
      />
      <FitBounds boundary={boundary} />
      {onBoundaryChange ? (
        <DrawControl initial={boundary} onChange={onBoundaryChange} />
      ) : (
        boundary && <ZoneBoundary boundary={boundary} />
      )}
      {children}
    </MapContainer>
  );
}
