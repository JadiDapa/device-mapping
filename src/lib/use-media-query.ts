"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query. The server snapshot is `false`, so SSR and
 * the first client render agree; the real value is applied right after mount.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind `md` and up: pointer-friendly desktop layout. */
export const useIsDesktop = () => useMediaQuery("(min-width: 768px)");
