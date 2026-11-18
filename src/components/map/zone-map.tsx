"use client";

import { useCallback } from "react";
import type { GeoJsonPolygon } from "@/db/schema";
import { DeviceMarker, type MarkerDevice } from "./device-marker";
import { useMapStore } from "./map-store";
import { FlyTo, PickPosition } from "./map-interactions";
import MapView from "./map-view";

type Props = {
  boundary: GeoJsonPolygon | null;
  center: { lat: number; lng: number } | null;
  zoom: number | null;
  /** Already filtered (the same filter the sidebar uses). */
  devices: MarkerDevice[];
  /** Position of the device being created, shown as a preview marker. */
  draft: { lat: number; lng: number; seq: number } | null;
  canEdit: boolean;
  onSelect: (id: string) => void;
  onMoved: (id: string, lat: number, lng: number) => void;
  onPick: (pos: { lat: number; lng: number }) => void;
};

/**
 * The zone page map: boundary + numbered device markers + add-device picking.
 * Leaflet-dependent, so only import through ./index (dynamic, ssr: false).
 */
export default function ZoneMap({
  boundary,
  center,
  zoom,
  devices,
  draft,
  canEdit,
  onSelect,
  onMoved,
  onPick,
}: Props) {
  const selectedId = useMapStore((s) => s.selectedId);
  const mode = useMapStore((s) => s.mode);
  const flyToken = useMapStore((s) => s.flyToken);
  const showLocation = useMapStore((s) => s.showLocation);
  const showTypeIcon = useMapStore((s) => s.showTypeIcon);

  const flyTarget = devices.find((d) => d.id === selectedId) ?? null;
  const noopMoved = useCallback(() => {}, []);
  const noopSelect = useCallback(() => {}, []);

  return (
    <MapView
      boundary={boundary}
      center={center}
      zoom={zoom}
      className="absolute inset-0 rounded-none"
    >
      {devices.map((d) => (
        <DeviceMarker
          key={d.id}
          device={d}
          selected={d.id === selectedId}
          draggable={canEdit}
          showLocation={showLocation}
          showTypeIcon={showTypeIcon}
          onSelect={onSelect}
          onMoved={onMoved}
        />
      ))}
      {draft && (
        <DeviceMarker
          device={{
            id: "draft",
            seq: draft.seq,
            status: "not_installed",
            isRouter: false,
            lat: draft.lat,
            lng: draft.lng,
            locationDetail: null,
            typeIcon: "radio",
          }}
          selected
          draggable={false}
          showLocation={false}
          showTypeIcon={false}
          onSelect={noopSelect}
          onMoved={noopMoved}
        />
      )}
      <PickPosition active={mode === "addDevice"} onPick={onPick} />
      <FlyTo token={flyToken} target={flyTarget} />
    </MapView>
  );
}
