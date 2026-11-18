"use client";

import dynamic from "next/dynamic";
import { id } from "@/lib/i18n/id";

/** Leaflet is client-only: never render it on the server. */
function MapLoading() {
  return (
    <div className="bg-muted text-muted-foreground flex size-full min-h-64 items-center justify-center rounded-lg text-sm">
      {id.map.loading}
    </div>
  );
}

export const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: MapLoading,
});

/** Zone page map with device markers (also client-only). */
export const ZoneMap = dynamic(() => import("./zone-map"), {
  ssr: false,
  loading: MapLoading,
});

/** `/map`: every zone, device and source in one read-only map. */
export const AllZonesMap = dynamic(() => import("./all-zones-map"), {
  ssr: false,
  loading: MapLoading,
});

/** Static, export-only map (headless browser). */
export const PrintMap = dynamic(() => import("./print-map"), {
  ssr: false,
  loading: MapLoading,
});
