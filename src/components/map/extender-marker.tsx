"use client";

import { memo, useMemo } from "react";
import L from "leaflet";
import { Marker, Polyline } from "react-leaflet";
import { fmt } from "@/lib/i18n/format";
import { id as t } from "@/lib/i18n/id";
import { buildExtenderMarkerHtml } from "./marker-html";

export type MarkerExtender = {
  id: string;
  lat: number;
  lng: number;
  /** "5→6", derived from the linked devices' current seq. */
  label: string;
  fromDeviceId: string | null;
  toDeviceId: string | null;
};

type Props = {
  extender: MarkerExtender;
  selected: boolean;
  draggable: boolean;
  onSelect: (id: string) => void;
  onMoved: (id: string, lat: number, lng: number) => void;
};

function ExtenderMarkerImpl({
  extender: x,
  selected,
  draggable,
  onSelect,
  onMoved,
}: Props) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "device-marker-icon",
        html: buildExtenderMarkerHtml({ label: x.label, selected }),
        // Same pin geometry as DeviceMarker (tip ~44px below the box top).
        iconSize: [36, 44],
        iconAnchor: [18, 44],
      }),
    [x.label, selected],
  );
  const handlers = useMemo(
    () => ({
      click: () => onSelect(x.id),
      dragend: (e: L.LeafletEvent) => {
        const { lat, lng } = (e.target as L.Marker).getLatLng();
        onMoved(x.id, lat, lng);
      },
    }),
    [x.id, onSelect, onMoved],
  );
  return (
    <Marker
      position={[x.lat, x.lng]}
      icon={icon}
      draggable={draggable}
      eventHandlers={handlers}
      title={fmt(t.extender.markerTitle, { label: x.label })}
      zIndexOffset={selected ? 1000 : 100}
    />
  );
}

export const ExtenderMarker = memo(ExtenderMarkerImpl, (a, b) => {
  const x = a.extender;
  const y = b.extender;
  return (
    x.id === y.id &&
    x.lat === y.lat &&
    x.lng === y.lng &&
    x.label === y.label &&
    a.selected === b.selected &&
    a.draggable === b.draggable &&
    a.onSelect === b.onSelect &&
    a.onMoved === b.onMoved
  );
});

type Point = { id: string; lat: number; lng: number };

/**
 * Dashed lines from -> extender -> to (a line needs both of its ends on the
 * map). Shares the `connection-line` style with the device chain lines.
 */
export function ExtenderLines({
  extenders,
  devices,
}: {
  extenders: MarkerExtender[];
  devices: Point[];
}) {
  const byId = new Map(devices.map((d) => [d.id, d]));
  return (
    <>
      {extenders.flatMap((x) =>
        [x.fromDeviceId, x.toDeviceId].flatMap((deviceId, i) => {
          const d = deviceId ? byId.get(deviceId) : undefined;
          if (!d) return [];
          return [
            <Polyline
              key={`${x.id}:${i}`}
              positions={[
                [d.lat, d.lng],
                [x.lat, x.lng],
              ]}
              interactive={false}
              className="connection-line"
            />,
          ];
        }),
      )}
    </>
  );
}
