"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { LocateFixedIcon, LoaderCircleIcon } from "lucide-react";
import { Circle, CircleMarker, useMap } from "react-leaflet";
import { toast } from "sonner";
import { geoErrorMessage, locate, type GeoPosition } from "@/lib/geolocation";
import { fmt } from "@/lib/i18n/format";
import { id } from "@/lib/i18n/id";

/**
 * "Posisi saya" (PRD F4): a button under the zoom control that asks the
 * browser for the current position, flies there and shows a dot with the
 * accuracy circle. Rendered into the map container so it stacks with the
 * other Leaflet controls; clicks never reach the map (no accidental pick).
 */
export function MyLocation() {
  const map = useMap();
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<GeoPosition | null>(null);
  const stopClicks = useRef<(el: HTMLElement | null) => void>((el) => {
    if (el) {
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    }
  });

  async function onClick() {
    setBusy(true);
    try {
      const p = await locate();
      setPos(p);
      map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 18), { duration: 0.6 });
      toast.success(fmt(id.geo.accuracy, { m: Math.round(p.accuracy) }));
    } catch (error) {
      toast.error(geoErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {createPortal(
        <div
          ref={stopClicks.current}
          className="absolute top-[5.5rem] left-[10px] z-[1000]"
        >
          <button
            type="button"
            onClick={onClick}
            disabled={busy}
            aria-label={id.geo.myLocation}
            title={id.geo.myLocation}
            className="bg-card text-card-foreground hover:bg-accent focus-visible:ring-ring/50 flex size-11 items-center justify-center rounded-md border shadow-md outline-none focus-visible:ring-[3px] disabled:opacity-60 md:size-9"
          >
            {busy ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <LocateFixedIcon className="size-4" />
            )}
          </button>
        </div>,
        map.getContainer(),
      )}
      {pos && (
        <>
          <Circle
            center={[pos.lat, pos.lng]}
            radius={pos.accuracy}
            interactive={false}
            className="my-location-accuracy"
          />
          <CircleMarker
            center={[pos.lat, pos.lng]}
            radius={7}
            interactive={false}
            className="my-location-dot"
          />
        </>
      )}
    </>
  );
}
