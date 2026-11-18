"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useMapStore } from "@/components/map/map-store";
import { id as t } from "@/lib/i18n/id";
import { moveCameraPointPositionAction } from "@/server/actions/camera-points";
import type { CameraPointView } from "./types";

/**
 * Client state of a zone's camera points: the list (seeded from the server,
 * re-seeded whenever the server sends a fresh list), the gallery being
 * viewed, and the mutations that need optimistic handling. Selection and the
 * "new point" draft live in the map store (shared with devices / sources).
 */
export function useCameraPoints({
  initial,
  warnIfOutside,
}: {
  initial: CameraPointView[];
  warnIfOutside: (pos: { lat: number; lng: number }) => void;
}) {
  const [points, setPoints] = useState(initial);
  const [gallery, setGallery] = useState<{
    pointId: string;
    index: number;
  } | null>(null);
  const selectedCameraId = useMapStore((s) => s.selectedCameraId);
  const selectCamera = useMapStore((s) => s.selectCamera);

  useEffect(() => setPoints(initial), [initial]);

  const selected = points.find((p) => p.id === selectedCameraId) ?? null;

  const patchPoint = useCallback(
    (pointId: string, patch: Partial<CameraPointView>) =>
      setPoints((list) =>
        list.map((p) => (p.id === pointId ? { ...p, ...patch } : p)),
      ),
    [],
  );

  const addPoint = useCallback(
    (point: CameraPointView) => setPoints((list) => [...list, point]),
    [],
  );

  const removePoint = useCallback(
    (pointId: string) => {
      setPoints((list) => list.filter((p) => p.id !== pointId));
      setGallery((g) => (g?.pointId === pointId ? null : g));
      if (useMapStore.getState().selectedCameraId === pointId) {
        selectCamera(null);
      }
    },
    [selectCamera],
  );

  const onMoved = useCallback(
    async (pointId: string, lat: number, lng: number) => {
      warnIfOutside({ lat, lng });
      let previous: { lat: number; lng: number } | undefined;
      setPoints((list) =>
        list.map((p) => {
          if (p.id !== pointId) return p;
          previous = { lat: p.lat, lng: p.lng };
          return { ...p, lat, lng };
        }),
      );
      const res = await moveCameraPointPositionAction(pointId, { lat, lng });
      if (!res.ok) {
        toast.error(res.error);
        if (previous) patchPoint(pointId, previous);
      } else {
        toast.success(t.camera.moved);
      }
    },
    [patchPoint, warnIfOutside],
  );

  const openGallery = useCallback(
    (pointId: string, index: number) => setGallery({ pointId, index }),
    [],
  );
  const closeGallery = useCallback(() => setGallery(null), []);

  return {
    points,
    selected,
    gallery,
    patchPoint,
    addPoint,
    removePoint,
    onMoved,
    openGallery,
    closeGallery,
  };
}
