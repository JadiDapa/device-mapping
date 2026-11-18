"use client";

import { useCallback } from "react";
import type { GeoJsonPolygon } from "@/db/schema";
import { ConnectionLines } from "./connection-lines";
import { DeviceMarker, type MarkerDevice } from "./device-marker";
import { useMapStore } from "./map-store";
import { FlyTo, PickPosition } from "./map-interactions";
import MapView from "./map-view";
import { SourceMarker, type MarkerSource } from "./source-marker";

export type ZoneMapDevice = MarkerDevice & { networkSourceId: string | null };

type Props = {
  boundary: GeoJsonPolygon | null;
  center: { lat: number; lng: number } | null;
  zoom: number | null;
  /** Already filtered (the same filter the sidebar uses). */
  devices: ZoneMapDevice[];
  sources: MarkerSource[];
  /** Position of the device being created, shown as a preview marker. */
  draft: { lat: number; lng: number; seq: number } | null;
  /** Position of the source being created, shown as a preview marker. */
  sourceDraft: { lat: number; lng: number } | null;
  canEdit: boolean;
  onSelect: (id: string) => void;
  onMoved: (id: string, lat: number, lng: number) => void;
  onSelectSource: (id: string) => void;
  onSourceMoved: (id: string, lat: number, lng: number) => void;
  /** Click position while in an "add" mode (device or source). */
  onPick: (pos: { lat: number; lng: number }) => void;
};

/**
 * The zone page map: boundary + numbered device markers + network sources +
 * optional connection lines + add-by-click picking. Leaflet-dependent, so
 * only import through ./index (dynamic, ssr: false).
 */
export default function ZoneMap({
  boundary,
  center,
  zoom,
  devices,
  sources,
  draft,
  sourceDraft,
  canEdit,
  onSelect,
  onMoved,
  onSelectSource,
  onSourceMoved,
  onPick,
}: Props) {
  const selectedId = useMapStore((s) => s.selectedId);
  const selectedSourceId = useMapStore((s) => s.selectedSourceId);
  const mode = useMapStore((s) => s.mode);
  const flyToken = useMapStore((s) => s.flyToken);
  const showLocation = useMapStore((s) => s.showLocation);
  const showTypeIcon = useMapStore((s) => s.showTypeIcon);
  const showConnections = useMapStore((s) => s.showConnections);

  const flyTarget =
    devices.find((d) => d.id === selectedId) ??
    sources.find((s) => s.id === selectedSourceId) ??
    null;
  const noopMoved = useCallback(() => {}, []);
  const noopSelect = useCallback(() => {}, []);

  return (
    <MapView
      boundary={boundary}
      center={center}
      zoom={zoom}
      className="absolute inset-0 rounded-none"
    >
      {showConnections && (
        <ConnectionLines devices={devices} sources={sources} />
      )}
      {sources.map((s) => (
        <SourceMarker
          key={s.id}
          source={s}
          selected={s.id === selectedSourceId}
          draggable={canEdit}
          onSelect={onSelectSource}
          onMoved={onSourceMoved}
        />
      ))}
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
      {sourceDraft && (
        <SourceMarker
          source={{ id: "draft", name: "…", ...sourceDraft }}
          selected
          draggable={false}
          onSelect={noopSelect}
          onMoved={noopMoved}
        />
      )}
      <PickPosition
        active={mode === "addDevice" || mode === "addSource"}
        onPick={onPick}
      />
      <FlyTo token={flyToken} target={flyTarget} />
    </MapView>
  );
}
