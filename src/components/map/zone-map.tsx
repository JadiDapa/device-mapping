"use client";

import { useCallback } from "react";
import { useIsDesktop } from "@/lib/use-media-query";
import type { GeoJsonPolygon } from "@/db/schema";
import type { ConnectionType } from "@/lib/connection";
import { CameraMarker } from "./camera-marker";
import type { CameraPointView } from "@/components/camera/types";
import { ConnectionLines } from "./connection-lines";
import { DeviceMarker, type MarkerDevice } from "./device-marker";
import {
  ExtenderLines,
  ExtenderMarker,
  type MarkerExtender,
} from "./extender-marker";
import { useMapStore } from "./map-store";
import { FlyTo, PickPosition } from "./map-interactions";
import MapView from "./map-view";
import { MyLocation } from "./my-location";
import { SourceMarker, type MarkerSource } from "./source-marker";

export type ZoneMapDevice = MarkerDevice & {
  networkSourceId: string | null;
  parentDeviceId: string | null;
  connectionType: ConnectionType;
};

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
  extenders: MarkerExtender[];
  selectedExtenderId: string | null;
  /** Position of the extender being created, shown as a preview marker. */
  extenderDraft: { lat: number; lng: number } | null;
  onSelectExtender: (id: string) => void;
  onExtenderMoved: (id: string, lat: number, lng: number) => void;
  cameraPoints: CameraPointView[];
  selectedCameraId: string | null;
  /** Position of the camera point being created, shown as a preview marker. */
  cameraDraft: { lat: number; lng: number } | null;
  onSelectCamera: (id: string) => void;
  onCameraMoved: (id: string, lat: number, lng: number) => void;
  onOpenGallery: (pointId: string, index: number) => void;
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
  extenders,
  selectedExtenderId,
  extenderDraft,
  onSelectExtender,
  onExtenderMoved,
  cameraPoints,
  selectedCameraId,
  cameraDraft,
  onSelectCamera,
  onCameraMoved,
  onOpenGallery,
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
  const showCameras = useMapStore((s) => s.showCameras);
  // Desktop drags directly; on touch screens markers only move in "move" mode
  // so scrolling or tapping never shifts a point by accident (PRD F4).
  const isDesktop = useIsDesktop();
  const canDrag = canEdit && (isDesktop || mode === "move");

  const flyTarget =
    devices.find((d) => d.id === selectedId) ??
    sources.find((s) => s.id === selectedSourceId) ??
    extenders.find((x) => x.id === selectedExtenderId) ??
    cameraPoints.find((c) => c.id === selectedCameraId) ??
    null;
  const noopMoved = useCallback(() => {}, []);
  const noopSelect = useCallback(() => {}, []);
  const noopGallery = useCallback(() => {}, []);

  return (
    <MapView
      boundary={boundary}
      center={center}
      zoom={zoom}
      className="absolute inset-0 rounded-none"
    >
      {showConnections && (
        <>
          <ConnectionLines devices={devices} sources={sources} />
          <ExtenderLines extenders={extenders} devices={devices} />
        </>
      )}
      {extenders.map((x) => (
        <ExtenderMarker
          key={x.id}
          extender={x}
          selected={x.id === selectedExtenderId}
          draggable={canDrag}
          onSelect={onSelectExtender}
          onMoved={onExtenderMoved}
        />
      ))}
      {extenderDraft && (
        <ExtenderMarker
          extender={{
            id: "draft",
            ...extenderDraft,
            label: "?→?",
            fromDeviceId: null,
            toDeviceId: null,
          }}
          selected
          draggable={false}
          onSelect={noopSelect}
          onMoved={noopMoved}
        />
      )}
      {showCameras &&
        cameraPoints.map((c) => (
          <CameraMarker
            key={c.id}
            point={c}
            selected={c.id === selectedCameraId}
            draggable={canDrag}
            onSelect={onSelectCamera}
            onMoved={onCameraMoved}
            onOpenGallery={onOpenGallery}
          />
        ))}
      {cameraDraft && (
        <CameraMarker
          point={{
            id: "draft",
            zoneId: "",
            name: "…",
            notes: null,
            images: [],
            ...cameraDraft,
          }}
          selected
          draggable={false}
          popup={false}
          onSelect={noopSelect}
          onMoved={noopMoved}
          onOpenGallery={noopGallery}
        />
      )}
      {sources.map((s) => (
        <SourceMarker
          key={s.id}
          source={s}
          selected={s.id === selectedSourceId}
          draggable={canDrag}
          onSelect={onSelectSource}
          onMoved={onSourceMoved}
        />
      ))}
      {devices.map((d) => (
        <DeviceMarker
          key={d.id}
          device={d}
          selected={d.id === selectedId}
          draggable={canDrag}
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
        active={
          mode === "addDevice" ||
          mode === "addSource" ||
          mode === "addExtender" ||
          mode === "addCamera"
        }
        onPick={onPick}
      />
      <FlyTo token={flyToken} target={flyTarget} />
      <MyLocation />
    </MapView>
  );
}
