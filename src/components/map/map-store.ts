"use client";

import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { EMPTY_FILTERS, type DeviceFilters } from "@/lib/device-filter";

/** localStorage can throw (private mode, blocked, quota) — never let it. */
export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // ignore: the toggle simply won't be remembered
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

export type MapMode = "idle" | "addDevice";

type MapState = {
  mode: MapMode;
  selectedId: string | null;
  filters: DeviceFilters;
  /** Bumped to ask the map to fly to the selected device (sidebar click). */
  flyToken: number;
  // Persisted display toggles (PRD F4).
  showLocation: boolean;
  showTypeIcon: boolean;
  legendOpen: boolean;

  setMode: (mode: MapMode) => void;
  select: (id: string | null, opts?: { fly?: boolean }) => void;
  setFilters: (patch: Partial<DeviceFilters>) => void;
  resetFilters: () => void;
  setShowLocation: (v: boolean) => void;
  setShowTypeIcon: (v: boolean) => void;
  setLegendOpen: (v: boolean) => void;
  /** Per-zone UI state (mode, selection, filters) when entering a zone. */
  resetZoneState: () => void;
};

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      mode: "idle",
      selectedId: null,
      filters: EMPTY_FILTERS,
      flyToken: 0,
      showLocation: false,
      showTypeIcon: false,
      legendOpen: true,

      setMode: (mode) => set({ mode }),
      select: (selectedId, opts) =>
        set((s) => ({
          selectedId,
          flyToken: opts?.fly ? s.flyToken + 1 : s.flyToken,
        })),
      setFilters: (patch) =>
        set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () => set({ filters: EMPTY_FILTERS }),
      setShowLocation: (showLocation) => set({ showLocation }),
      setShowTypeIcon: (showTypeIcon) => set({ showTypeIcon }),
      setLegendOpen: (legendOpen) => set({ legendOpen }),
      resetZoneState: () =>
        set({ mode: "idle", selectedId: null, filters: EMPTY_FILTERS }),
    }),
    {
      name: "device-mapper:map-view",
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        showLocation: s.showLocation,
        showTypeIcon: s.showTypeIcon,
        legendOpen: s.legendOpen,
      }),
      // Rehydrate after mount (see ZoneWorkspace) so SSR and the first client
      // render agree.
      skipHydration: true,
    },
  ),
);
