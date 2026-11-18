"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
// Geoman patches L.Map at import time, so it must be evaluated BEFORE the
// MapContainer is created (this module is imported statically by map-view).
import "@geoman-io/leaflet-geoman-free";
import { useMap } from "react-leaflet";
import { PencilIcon, PenLineIcon, Trash2Icon } from "lucide-react";
import type { GeoJsonPolygon } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { id } from "@/lib/i18n/id";
import { BOUNDARY_CLASS } from "./zone-boundary";

function toPolygon(layer: L.Polygon): GeoJsonPolygon | null {
  const geometry = layer.toGeoJSON().geometry;
  if (geometry.type !== "Polygon") return null;
  return { type: "Polygon", coordinates: geometry.coordinates };
}

type Mode = "idle" | "draw" | "edit";

/**
 * Draw / edit / remove a single zone-boundary polygon with Geoman, using our
 * own (Indonesian) buttons instead of Geoman's English toolbar.
 *
 * Uncontrolled: `initial` seeds the layer once; every change is reported via
 * `onChange` (null when the polygon is removed). Self-intersection is blocked
 * by Geoman (`allowSelfIntersection: false`).
 */
export function DrawControl({
  initial,
  onChange,
}: {
  initial: GeoJsonPolygon | null;
  onChange: (polygon: GeoJsonPolygon | null) => void;
}) {
  const map = useMap();
  const layerRef = useRef<L.Polygon | null>(null);
  const onChangeRef = useRef(onChange);
  const [hasPolygon, setHasPolygon] = useState(initial !== null);
  const [mode, setMode] = useState<Mode>("idle");

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    map.pm.setGlobalOptions({
      allowSelfIntersection: false,
      pathOptions: { className: BOUNDARY_CLASS },
    });

    const attach = (layer: L.Polygon) => {
      layerRef.current = layer;
      layer.on("pm:edit", () => onChangeRef.current(toPolygon(layer)));
    };

    if (initial) {
      const latlngs = L.GeoJSON.coordsToLatLngs(initial.coordinates, 1);
      const layer = L.polygon(latlngs as L.LatLngExpression[][], {
        className: BOUNDARY_CLASS,
      }).addTo(map);
      attach(layer);
    }

    const onCreate = (e: { layer: L.Layer }) => {
      layerRef.current?.remove();
      const layer = e.layer as L.Polygon;
      attach(layer);
      setHasPolygon(true);
      onChangeRef.current(toPolygon(layer));
    };
    const onDrawEnd = () => setMode((m) => (m === "draw" ? "idle" : m));

    map.on("pm:create", onCreate);
    map.on("pm:drawend", onDrawEnd);
    return () => {
      map.off("pm:create", onCreate);
      map.off("pm:drawend", onDrawEnd);
      map.pm.disableDraw();
      layerRef.current?.pm.disable();
      layerRef.current?.remove();
      layerRef.current = null;
    };
    // `initial` only seeds the layer; later changes are ignored on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  function toggleDraw() {
    if (mode === "draw") {
      map.pm.disableDraw();
      setMode("idle");
      return;
    }
    layerRef.current?.pm.disable();
    map.pm.enableDraw("Polygon", { allowSelfIntersection: false });
    setMode("draw");
  }

  function toggleEdit() {
    const layer = layerRef.current;
    if (!layer) return;
    if (mode === "edit") {
      layer.pm.disable();
      setMode("idle");
      return;
    }
    map.pm.disableDraw();
    layer.pm.enable({ allowSelfIntersection: false });
    setMode("edit");
  }

  function remove() {
    map.pm.disableDraw();
    layerRef.current?.pm.disable();
    layerRef.current?.remove();
    layerRef.current = null;
    setHasPolygon(false);
    setMode("idle");
    onChangeRef.current(null);
  }

  return (
    <div className="absolute top-3 left-3 z-[1000] flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant={mode === "draw" ? "default" : "secondary"}
        aria-pressed={mode === "draw"}
        onClick={toggleDraw}
      >
        <PenLineIcon />
        {id.zone.drawBoundary}
      </Button>
      {hasPolygon && (
        <>
          <Button
            type="button"
            size="sm"
            variant={mode === "edit" ? "default" : "secondary"}
            aria-pressed={mode === "edit"}
            onClick={toggleEdit}
          >
            <PencilIcon />
            {id.zone.editBoundary}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={remove}>
            <Trash2Icon />
            {id.zone.removeBoundary}
          </Button>
        </>
      )}
    </div>
  );
}
