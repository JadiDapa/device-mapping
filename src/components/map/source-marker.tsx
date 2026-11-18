"use client";

import { memo, useMemo } from "react";
import L from "leaflet";
import { Marker } from "react-leaflet";
import { fmt } from "@/lib/i18n/format";
import { id as t } from "@/lib/i18n/id";
import { buildSourceMarkerHtml } from "./marker-html";

export type MarkerSource = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

type Props = {
  source: MarkerSource;
  selected: boolean;
  draggable: boolean;
  onSelect: (id: string) => void;
  onMoved: (id: string, lat: number, lng: number) => void;
};

function SourceMarkerImpl({
  source: s,
  selected,
  draggable,
  onSelect,
  onMoved,
}: Props) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "source-marker-icon",
        html: buildSourceMarkerHtml({ name: s.name, selected }),
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    [s.name, selected],
  );
  const handlers = useMemo(
    () => ({
      click: () => onSelect(s.id),
      dragend: (e: L.LeafletEvent) => {
        const { lat, lng } = (e.target as L.Marker).getLatLng();
        onMoved(s.id, lat, lng);
      },
    }),
    [s.id, onSelect, onMoved],
  );
  return (
    <Marker
      position={[s.lat, s.lng]}
      icon={icon}
      draggable={draggable}
      eventHandlers={handlers}
      title={fmt(t.source.markerTitle, { name: s.name })}
      zIndexOffset={selected ? 900 : 500}
    />
  );
}

/** Memoised like DeviceMarker: re-renders only when what it draws changes. */
export const SourceMarker = memo(SourceMarkerImpl, (a, b) => {
  return (
    a.source.id === b.source.id &&
    a.source.name === b.source.name &&
    a.source.lat === b.source.lat &&
    a.source.lng === b.source.lng &&
    a.selected === b.selected &&
    a.draggable === b.draggable &&
    a.onSelect === b.onSelect &&
    a.onMoved === b.onMoved
  );
});
