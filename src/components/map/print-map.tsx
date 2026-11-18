"use client";

import { useCallback } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, Polygon, TileLayer } from "react-leaflet";
import type { GeoJsonPolygon } from "@/db/schema";
import { markMapReady } from "@/lib/map-ready";
import { publicEnv } from "@/lib/public-env";
import { DeviceMarker, type MarkerDevice } from "./device-marker";
import { SourceMarker, type MarkerSource } from "./source-marker";
import { BOUNDARY_CLASS } from "./zone-boundary";

type Props = {
  /** Unique per map on the page: the readiness handshake counts by key. */
  mapKey: string;
  boundary: GeoJsonPolygon | null;
  devices: MarkerDevice[];
  sources: MarkerSource[];
};

function toLatLngs(boundary: GeoJsonPolygon): [number, number][][] {
  return boundary.coordinates.map((ring) =>
    ring.map(([lng, lat]) => [lat, lng] as [number, number]),
  );
}

/**
 * Static map for the export pages: no controls or interaction, fitted to the
 * zone polygon (or its markers) at creation so tiles load for the final view
 * only. It reports ready (lib/map-ready) once the tile layer finished loading
 * with all markers already rendered. The tile attribution stays visible.
 * Leaflet-dependent: import via ./index.
 */
export default function PrintMap({
  mapKey,
  boundary,
  devices,
  sources,
}: Props) {
  const points: [number, number][] = boundary
    ? toLatLngs(boundary).flat()
    : [
        ...devices.map((d) => [d.lat, d.lng] as [number, number]),
        ...sources.map((s) => [s.lat, s.lng] as [number, number]),
      ];

  const noopSelect = useCallback(() => {}, []);
  const noopMoved = useCallback(() => {}, []);

  const view =
    points.length > 0
      ? {
          bounds: points,
          boundsOptions: { padding: [32, 32] as [number, number], maxZoom: 18 },
        }
      : {
          center: [
            publicEnv.defaultCenter.lat,
            publicEnv.defaultCenter.lng,
          ] as [number, number],
          zoom: publicEnv.defaultZoom,
        };

  return (
    <MapContainer
      {...view}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      // Tiles must be fully opaque when the screenshot is taken.
      fadeAnimation={false}
      zoomAnimation={false}
      zoomSnap={0.5}
      maxZoom={publicEnv.tileMaxZoom}
      className="size-full"
    >
      <TileLayer
        url={publicEnv.tileUrl}
        attribution={publicEnv.tileAttribution}
        maxZoom={publicEnv.tileMaxZoom}
        eventHandlers={{
          // Leaflet also fires `load` when some tiles errored, so an
          // unreachable tile never blocks the export forever.
          load: () =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => markMapReady(mapKey)),
            ),
        }}
      />
      {boundary && (
        <Polygon
          positions={toLatLngs(boundary)}
          className={BOUNDARY_CLASS}
          interactive={false}
        />
      )}
      {sources.map((s) => (
        <SourceMarker
          key={s.id}
          source={s}
          selected={false}
          draggable={false}
          onSelect={noopSelect}
          onMoved={noopMoved}
        />
      ))}
      {devices.map((d) => (
        <DeviceMarker
          key={d.id}
          device={d}
          selected={false}
          draggable={false}
          showLocation
          showTypeIcon={false}
          onSelect={noopSelect}
          onMoved={noopMoved}
        />
      ))}
    </MapContainer>
  );
}
