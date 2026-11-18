"use client";

import { memo } from "react";
import { Polyline } from "react-leaflet";
import type { MarkerSource } from "./source-marker";

type Linked = {
  id: string;
  lat: number;
  lng: number;
  networkSourceId: string | null;
};

/**
 * Dashed lines device -> its network source (PRD F4/F6). Takes the already
 * filtered device list, so lines follow the sidebar filter like markers do.
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
  return (
    <>
      {devices.map((d) => {
        const s = d.networkSourceId ? byId.get(d.networkSourceId) : undefined;
        if (!s) return null;
        return (
          <Polyline
            key={d.id}
            positions={[
              [d.lat, d.lng],
              [s.lat, s.lng],
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
