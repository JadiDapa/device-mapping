"use client";

import { useEffect } from "react";
import { expectMaps } from "@/lib/map-ready";

/**
 * Declares how many maps the print page contains so the renderer's
 * `window.__MAP_READY__` flag flips only after all of them are ready. Renders
 * nothing. (State is per full page load, so it is deliberately not reset here:
 * a map may report ready before this effect runs.)
 */
export function MapReadyGate({ maps }: { maps: number }) {
  useEffect(() => {
    expectMaps(maps);
  }, [maps]);
  return null;
}
