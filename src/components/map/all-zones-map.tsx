"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { useRouter } from "next/navigation";
import { Polygon, Tooltip, useMap } from "react-leaflet";
import type { GeoJsonPolygon } from "@/db/schema";
import type { ConnectionType } from "@/lib/connection";
import { id } from "@/lib/i18n/id";
import { ConnectionLines } from "./connection-lines";
import { DeviceMarker, type MarkerDevice } from "./device-marker";
import { ExtenderLines, ExtenderMarker } from "./extender-marker";
import { extenderLabel } from "@/lib/validators/extender";
import { Legend } from "./legend";
import { useMapStore } from "./map-store";
import MapView from "./map-view";
import { MyLocation } from "./my-location";
import { SourceMarker, type MarkerSource } from "./source-marker";
import { ZoneExplorerPanel } from "./zone-explorer-panel";
import type { ZoneSummary } from "@/server/zones";
import { BOUNDARY_CLASS } from "./zone-boundary";

type MapZone = { id: string; name: string; boundary: GeoJsonPolygon | null };
type MapDevice = MarkerDevice & {
  zoneId: string;
  networkSourceId: string | null;
  parentDeviceId: string | null;
  connectionType: ConnectionType;
};

type Props = {
  zones: MapZone[];
  devices: MapDevice[];
  sources: MarkerSource[];
  /** Set on the root page: enables zone-explorer mode (panel + fly-to). */
  summaries?: ZoneSummary[];
  isAdmin?: boolean;
  extenders?: {
    id: string;
    zoneId: string;
    lat: number;
    lng: number;
    fromDeviceId: string | null;
    toDeviceId: string | null;
  }[];
};

type FlyRequest = { bounds: L.LatLngBounds; n: number } | null;

/** Animated fly-to, leaving room for the explorer panel. */
function Fly({ request, panel }: { request: FlyRequest; panel: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!request) return;
    const wide = window.innerWidth >= 768;
    map.flyToBounds(request.bounds, {
      paddingTopLeft: panel && wide ? [424, 16] : [16, 16],
      paddingBottomRight: [
        16,
        panel && !wide ? Math.round(window.innerHeight * 0.45) + 8 : 16,
      ],
      maxZoom: map.getMaxZoom(),
      duration: 1.2,
    });
    // Only re-run for a new request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, map]);
  return null;
}

function toLatLngs(boundary: GeoJsonPolygon): [number, number][][] {
  return boundary.coordinates.map((ring) =>
    ring.map(([lng, lat]) => [lat, lng] as [number, number]),
  );
}

/** Every polygon vertex (or, with none, every device and source). */
function allPoints(
  zones: MapZone[],
  devices: MapDevice[],
  sources: MarkerSource[],
): [number, number][] {
  const fromZones = zones.flatMap((z) =>
    z.boundary ? toLatLngs(z.boundary).flat() : [],
  );
  if (fromZones.length > 0) return fromZones;
  return [
    ...devices.map((d) => [d.lat, d.lng] as [number, number]),
    ...sources.map((s) => [s.lat, s.lng] as [number, number]),
  ];
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
export default function AllZonesMap({
  zones,
  devices,
  sources,
  summaries,
  isAdmin = false,
  extenders = [],
}: Props) {
  const router = useRouter();
  const showConnections = useMapStore((s) => s.showConnections);
  const setShowConnections = useMapStore((s) => s.setShowConnections);
  const explorer = summaries !== undefined;
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [focusedDeviceId, setFocusedDeviceId] = useState<string | null>(null);
  const [flyRequest, setFlyRequest] = useState<FlyRequest>(null);
  const flyCount = useRef(0);

  const fly = useCallback((points: [number, number][]) => {
    if (points.length === 0) return;
    flyCount.current += 1;
    setFlyRequest({ bounds: L.latLngBounds(points), n: flyCount.current });
  }, []);

  const zonePoints = useCallback(
    (zoneId: string): [number, number][] => {
      const z = zones.find((x) => x.id === zoneId);
      if (z?.boundary) return toLatLngs(z.boundary).flat();
      return devices
        .filter((d) => d.zoneId === zoneId)
        .map((d) => [d.lat, d.lng] as [number, number]);
    },
    [zones, devices],
  );

  const selectZone = useCallback(
    (zoneId: string) => {
      setSelectedZoneId(zoneId);
      setFocusedDeviceId(null);
      fly(zonePoints(zoneId));
    },
    [fly, zonePoints],
  );
  const backToAll = useCallback(() => {
    setSelectedZoneId(null);
    setFocusedDeviceId(null);
    fly(allPoints(zones, devices, sources));
  }, [fly, zones, devices, sources]);
  const focusDevice = useCallback(
    (deviceId: string) => {
      const d = devices.find((x) => x.id === deviceId);
      if (!d) return;
      setFocusedDeviceId(deviceId);
      fly([[d.lat, d.lng]]);
    },
    [devices, fly],
  );

  const visibleDevices = useMemo(
    () =>
      explorer ? devices.filter((d) => d.zoneId === selectedZoneId) : devices,
    [explorer, devices, selectedZoneId],
  );
  const visibleExtenders = useMemo(() => {
    const seqById = new Map(devices.map((d) => [d.id, d.seq]));
    return extenders
      .filter((x) => (explorer ? x.zoneId === selectedZoneId : true))
      .map((x) => ({
        ...x,
        label: extenderLabel(
          x.fromDeviceId ? seqById.get(x.fromDeviceId) : null,
          x.toDeviceId ? seqById.get(x.toDeviceId) : null,
        ),
      }));
  }, [extenders, devices, explorer, selectedZoneId]);
  const noopExtender = useCallback(() => {}, []);
  const selectedZoneHasBoundary =
    zones.find((z) => z.id === selectedZoneId)?.boundary != null;

  useEffect(() => {
    void useMapStore.persist.rehydrate();
  }, []);

  const deviceZone = useMemo(
    () => new Map(devices.map((d) => [d.id, d.zoneId])),
    [devices],
  );
  const fitPoints = useMemo(
    () => allPoints(zones, devices, sources),
    [zones, devices, sources],
  );

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
        <MyLocation />
        <Fly request={flyRequest} panel={explorer} />
        {zones.map(
          (z) =>
            z.boundary && (
              <Polygon
                key={z.id}
                positions={toLatLngs(z.boundary)}
                className={`${BOUNDARY_CLASS} zone-boundary--link`}
                eventHandlers={{
                  click: () =>
                    explorer ? selectZone(z.id) : router.push(`/zones/${z.id}`),
                }}
              >
                {explorer ? (
                  z.id !== selectedZoneId && (
                    <Tooltip permanent direction="center">
                      {z.name}
                    </Tooltip>
                  )
                ) : (
                  <Tooltip sticky>
                    {id.allMap.openZone}: {z.name}
                  </Tooltip>
                )}
              </Polygon>
            ),
        )}
        {showConnections && (
          <>
            <ConnectionLines devices={visibleDevices} sources={sources} />
            <ExtenderLines
              extenders={visibleExtenders}
              devices={visibleDevices}
            />
          </>
        )}
        {visibleExtenders.map((x) => (
          <ExtenderMarker
            key={x.id}
            extender={x}
            selected={false}
            draggable={false}
            onSelect={noopExtender}
            onMoved={noopExtender}
          />
        ))}
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
        {visibleDevices.map((d) => (
          <DeviceMarker
            key={d.id}
            device={d}
            selected={d.id === focusedDeviceId}
            draggable={false}
            showLocation={false}
            showTypeIcon={false}
            onSelect={onSelectDevice}
            onMoved={noopMoved}
          />
        ))}
      </MapView>
      <div className="pointer-events-none absolute inset-0 z-[1000]">
        <div
          className={
            explorer
              ? "absolute top-3 right-3"
              : "absolute top-3 right-3 left-14"
          }
        >
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
        <div
          className={
            explorer
              ? "absolute right-3 bottom-7 hidden md:block"
              : "absolute bottom-7 left-3"
          }
        >
          <Legend />
        </div>
        {explorer && summaries && (
          <ZoneExplorerPanel
            zones={summaries}
            selectedId={selectedZoneId}
            devices={visibleDevices}
            isAdmin={isAdmin}
            hasBoundary={selectedZoneHasBoundary}
            onSelectZone={selectZone}
            onBack={backToAll}
            onFocusDevice={focusDevice}
          />
        )}
      </div>
    </div>
  );
}
