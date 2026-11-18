"use client";

import { useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";

/** While `active`, the next map click reports its position (add-device mode). */
export function PickPosition({
  active,
  onPick,
}: {
  active: boolean;
  onPick: (pos: { lat: number; lng: number }) => void;
}) {
  const map = useMap();
  useMapEvents({
    click(e) {
      if (active) onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  useEffect(() => {
    const el = map.getContainer();
    el.classList.toggle("map-picking", active);
    return () => el.classList.remove("map-picking");
  }, [map, active]);
  return null;
}

/** Fly to `target` whenever `token` changes (and never on first render). */
export function FlyTo({
  token,
  target,
}: {
  token: number;
  target: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (token === 0 || !target) return;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 18), {
      duration: 0.6,
    });
    // Only a new token should move the map, not a changed target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, token]);
  return null;
}
