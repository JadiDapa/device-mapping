"use client";

import { useCallback, useEffect, useMemo } from "react";
import L from "leaflet";
import { useRouter } from "next/navigation";
import { Polygon, Tooltip, useMap } from "react-leaflet";
import type { GeoJsonPolygon } from "@/db/schema";
import { id } from "@/lib/i18n/id";
import { ConnectionLines } from "./connection-lines";
import { DeviceMarker, type MarkerDevice } from "./device-marker";
import { Legend } from "./legend";
import { useMapStore } from "./map-store";
import MapView from "./map-view";
import { SourceMarker, type MarkerSource } from "./source-marker";
import { BOUNDARY_CLASS } from "./zone-boundary";

type MapZone = { id: string; name: string; boundary: GeoJsonPolygon | null };
type MapDevice = MarkerDevice & {
  zoneId: string;
  networkSourceId: string | null;
};

type Props = {
  zones: MapZone[];
  devices: MapDevice[];
  sources: MarkerSource[];
};

function toLatLngs(boundary: GeoJsonPolygon): [number, number][][] {
  return boundary.coordinates.map((ring) =>
    ring.map(([lng, lat]) => [lat, lng] as [number, number]),
  );
}

/** Fit once to every polygon (or, with none, to every marker). */
function FitAll({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 18 });
    // Fit on arrival only; later data refreshes must not move the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

/**
 * `/map`: every zone polygon, device and network source in one read-only map.
 * Clicking a polygon opens the zone; a device opens its zone with the device
 * selected; a source opens its page. Leaflet-dependent: import via ./index.
 */
export default function AllZonesMap({ zones, devices, sources }: Props) {
  const router = useRouter();
  const showConnections = useMapStore((s) => s.showConnections);
  const setShowConnections = useMapStore((s) => s.setShowConnections);

  useEffect(() => {
    void useMapStore.persist.rehydrate();
  }, []);

  const deviceZone = useMemo(
    () => new Map(devices.map((d) => [d.id, d.zoneId])),
    [devices],
  );
  const fitPoints = useMemo(() => {
    const fromZones = zones.flatMap((z) =>
      z.boundary ? toLatLngs(z.boundary).flat() : [],
    );
    if (fromZones.length > 0) return fromZones;
    return [
      ...devices.map((d) => [d.lat, d.lng] as [number, number]),
      ...sources.map((s) => [s.lat, s.lng] as [number, number]),
    ];
  }, [zones, devices, sources]);

  const onSelectDevice = useCallback(
    (deviceId: string) => {
      const zoneId = deviceZone.get(deviceId);
      if (zoneId) router.push(`/zones/${zoneId}?device=${deviceId}`);
    },
    [deviceZone, router],
  );
  const onSelectSource = useCallback(
    (sourceId: string) => router.push(`/network-sources/${sourceId}`),
    [router],
  );
  const noopMoved = useCallback(() => {}, []);

  return (
    <div className="relative size-full">
      <MapView boundary={null} className="absolute inset-0 rounded-none">
        <FitAll points={fitPoints} />
        {zones.map(
          (z) =>
            z.boundary && (
              <Polygon
                key={z.id}
                positions={toLatLngs(z.boundary)}
                className={`${BOUNDARY_CLASS} zone-boundary--link`}
                eventHandlers={{ click: () => router.push(`/zones/${z.id}`) }}
              >
                <Tooltip sticky>
                  {id.allMap.openZone}: {z.name}
                </Tooltip>
              </Polygon>
            ),
        )}
        {showConnections && (
          <ConnectionLines devices={devices} sources={sources} />
        )}
        {sources.map((s) => (
          <SourceMarker
            key={s.id}
            source={s}
            selected={false}
            draggable={false}
            onSelect={onSelectSource}
            onMoved={noopMoved}
          />
        ))}
        {devices.map((d) => (
          <DeviceMarker
            key={d.id}
            device={d}
            selected={false}
            draggable={false}
            showLocation={false}
            showTypeIcon={false}
            onSelect={onSelectDevice}
            onMoved={noopMoved}
          />
        ))}
      </MapView>
      <div className="pointer-events-none absolute inset-0 z-[1000]">
        <div className="absolute top-3 right-3 left-14">
          <button
            type="button"
            aria-pressed={showConnections}
            onClick={() => setShowConnections(!showConnections)}
            className={
              "bg-card/95 text-card-foreground pointer-events-auto min-h-9 rounded-md border px-3 text-xs shadow-md " +
              (showConnections ? "border-foreground font-semibold" : "")
            }
          >
            {id.toggles.showConnections}
          </button>
        </div>
        <div className="absolute bottom-7 left-3">
          <Legend />
        </div>
      </div>
    </div>
  );
}
