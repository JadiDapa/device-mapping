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

/** `move`: touch screens only drag markers after entering this mode. */
export type MapMode =
  "idle" | "addDevice" | "addSource" | "addExtender" | "addCamera" | "move";

type MapState = {
  mode: MapMode;
  selectedId: string | null;
  /** A device and a source are never selected at the same time. */
  selectedSourceId: string | null;
  /** Camera capture point selection / the one being created. */
  selectedCameraId: string | null;
  cameraDraft: { lat: number; lng: number } | null;
  filters: DeviceFilters;
  /** Bumped to ask the map to fly to the selected device (sidebar click). */
  flyToken: number;
  // Persisted display toggles (PRD F4).
  showLocation: boolean;
  showTypeIcon: boolean;
  showConnections: boolean;
  showCameras: boolean;
  legendOpen: boolean;

  setMode: (mode: MapMode) => void;
  select: (id: string | null, opts?: { fly?: boolean }) => void;
  selectSource: (id: string | null, opts?: { fly?: boolean }) => void;
  selectCamera: (id: string | null) => void;
  setCameraDraft: (pos: { lat: number; lng: number } | null) => void;
  setFilters: (patch: Partial<DeviceFilters>) => void;
  resetFilters: () => void;
  setShowLocation: (v: boolean) => void;
  setShowTypeIcon: (v: boolean) => void;
  setShowConnections: (v: boolean) => void;
  setShowCameras: (v: boolean) => void;
  setLegendOpen: (v: boolean) => void;
  /** Per-zone UI state (mode, selection, filters) when entering a zone. */
  resetZoneState: () => void;
};

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      mode: "idle",
      selectedId: null,
      selectedSourceId: null,
      selectedCameraId: null,
      cameraDraft: null,
      filters: EMPTY_FILTERS,
      flyToken: 0,
      showLocation: false,
      showTypeIcon: false,
      showConnections: false,
      showCameras: true,
      legendOpen: true,

      setMode: (mode) => set({ mode }),
      select: (selectedId, opts) =>
        set((s) => ({
          selectedId,
          selectedSourceId: selectedId ? null : s.selectedSourceId,
          selectedCameraId: selectedId ? null : s.selectedCameraId,
          cameraDraft: selectedId ? null : s.cameraDraft,
          flyToken: opts?.fly ? s.flyToken + 1 : s.flyToken,
        })),
      selectSource: (selectedSourceId, opts) =>
        set((s) => ({
          selectedSourceId,
          selectedId: selectedSourceId ? null : s.selectedId,
          selectedCameraId: selectedSourceId ? null : s.selectedCameraId,
          cameraDraft: selectedSourceId ? null : s.cameraDraft,
          flyToken: opts?.fly ? s.flyToken + 1 : s.flyToken,
        })),
      selectCamera: (selectedCameraId) =>
        set((s) => ({
          selectedCameraId,
          selectedId: selectedCameraId ? null : s.selectedId,
          selectedSourceId: selectedCameraId ? null : s.selectedSourceId,
          cameraDraft: selectedCameraId ? null : s.cameraDraft,
        })),
      setCameraDraft: (cameraDraft) =>
        set((s) => ({
          cameraDraft,
          selectedCameraId: cameraDraft ? null : s.selectedCameraId,
        })),
      setFilters: (patch) =>
        set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () => set({ filters: EMPTY_FILTERS }),
      setShowLocation: (showLocation) => set({ showLocation }),
      setShowTypeIcon: (showTypeIcon) => set({ showTypeIcon }),
      setShowConnections: (showConnections) => set({ showConnections }),
      setShowCameras: (showCameras) => set({ showCameras }),
      setLegendOpen: (legendOpen) => set({ legendOpen }),
      resetZoneState: () =>
        set({
          mode: "idle",
          selectedId: null,
          selectedSourceId: null,
          selectedCameraId: null,
          cameraDraft: null,
          filters: EMPTY_FILTERS,
        }),
    }),
    {
      name: "device-mapper:map-view",
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        showLocation: s.showLocation,
        showTypeIcon: s.showTypeIcon,
        showConnections: s.showConnections,
        showCameras: s.showCameras,
        legendOpen: s.legendOpen,
      }),
      // Rehydrate after mount (see ZoneWorkspace) so SSR and the first client
      // render agree.
      skipHydration: true,
    },
  ),
);
