"use client";

import { memo, useMemo } from "react";
import L from "leaflet";
import { Marker } from "react-leaflet";
import type { DeviceStatus } from "@/lib/status";
import { statusLabel } from "@/lib/status";
import { id as t } from "@/lib/i18n/id";
import { fmt } from "@/lib/i18n/format";
import { buildMarkerHtml } from "./marker-html";

export type MarkerDevice = {
  id: string;
  seq: number;
  status: DeviceStatus;
  isRouter: boolean;
  lat: number;
  lng: number;
  locationDetail: string | null;
  typeIcon: string;
};

type Props = {
  device: MarkerDevice;
  selected: boolean;
  draggable: boolean;
  showLocation: boolean;
  showTypeIcon: boolean;
  onSelect: (id: string) => void;
  onMoved: (id: string, lat: number, lng: number) => void;
};

function DeviceMarkerImpl({
  device: d,
  selected,
  draggable,
  showLocation,
  showTypeIcon,
  onSelect,
  onMoved,
}: Props) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "device-marker-icon",
        html: buildMarkerHtml({
          seq: d.seq,
          status: d.status,
          isRouter: d.isRouter,
          typeIcon: d.typeIcon,
          locationDetail: d.locationDetail,
          selected,
          showLocation,
          showTypeIcon,
        }),
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    [
      d.seq,
      d.status,
      d.isRouter,
      d.typeIcon,
      d.locationDetail,
      selected,
      showLocation,
      showTypeIcon,
    ],
  );

  const handlers = useMemo(
    () => ({
      click: () => onSelect(d.id),
      dragend: (e: L.LeafletEvent) => {
        const { lat, lng } = (e.target as L.Marker).getLatLng();
        onMoved(d.id, lat, lng);
      },
    }),
    [d.id, onSelect, onMoved],
  );

  return (
    <Marker
      position={[d.lat, d.lng]}
      icon={icon}
      draggable={draggable}
      eventHandlers={handlers}
      title={fmt(t.device.markerTitle, {
        seq: d.seq,
        status: statusLabel[d.status],
      })}
      zIndexOffset={selected ? 1000 : 0}
    />
  );
}

/**
 * Memoised on the fields that change the rendered marker, so a server
 * refresh that returns identical rows (new object identities) re-renders
 * none of the ~500 markers a large zone can have.
 */
export const DeviceMarker = memo(DeviceMarkerImpl, (a, b) => {
  const x = a.device;
  const y = b.device;
  return (
    x.id === y.id &&
    x.seq === y.seq &&
    x.status === y.status &&
    x.isRouter === y.isRouter &&
    x.lat === y.lat &&
    x.lng === y.lng &&
    x.locationDetail === y.locationDetail &&
    x.typeIcon === y.typeIcon &&
    a.selected === b.selected &&
    a.draggable === b.draggable &&
    a.showLocation === b.showLocation &&
    a.showTypeIcon === b.showTypeIcon &&
    a.onSelect === b.onSelect &&
    a.onMoved === b.onMoved
  );
});
