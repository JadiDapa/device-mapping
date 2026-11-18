"use client";

import { memo } from "react";
import { Polyline } from "react-leaflet";
import type { MarkerSource } from "./source-marker";

type Linked = {
  id: string;
  lat: number;
  lng: number;
  networkSourceId: string | null;
  parentDeviceId?: string | null;
};

/**
 * Dashed lines for the chain network source -> router(+BLE) -> device (PRD
 * F4/F6): a router draws to its source, any other device to its router. Takes
 * the already filtered device list, so lines follow the sidebar filter like
 * markers do (a line needs both ends visible).
 * Not interactive, so clicks fall through to the map / markers.
 */
function ConnectionLinesImpl({
  devices,
  sources,
}: {
  devices: Linked[];
  sources: MarkerSource[];
}) {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const deviceById = new Map(devices.map((d) => [d.id, d]));
  return (
    <>
      {devices.map((d) => {
        const parent = d.parentDeviceId
          ? deviceById.get(d.parentDeviceId)
          : undefined;
        const s = d.networkSourceId ? byId.get(d.networkSourceId) : undefined;
        const target = parent ?? s;
        if (!target) return null;
        return (
          <Polyline
            key={d.id}
            positions={[
              [d.lat, d.lng],
              [target.lat, target.lng],
            ]}
            interactive={false}
            className="connection-line"
          />
        );
      })}
    </>
  );
}

export const ConnectionLines = memo(ConnectionLinesImpl);
