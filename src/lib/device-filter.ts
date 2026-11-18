import type { DeviceStatus } from "./status";

export type DeviceFilters = {
  statuses: DeviceStatus[];
  typeIds: string[];
  routerOnly: boolean;
  query: string;
};

export const EMPTY_FILTERS: DeviceFilters = {
  statuses: [],
  typeIds: [],
  routerOnly: false,
  query: "",
};

type Filterable = {
  status: DeviceStatus;
  deviceTypeId: string;
  isRouter: boolean;
  locationDetail: string | null;
  notes: string | null;
};

export function hasActiveFilter(f: DeviceFilters): boolean {
  return (
    f.statuses.length > 0 ||
    f.typeIds.length > 0 ||
    f.routerOnly ||
    f.query.trim() !== ""
  );
}

/**
 * Shared by the sidebar list and the map markers (PRD F4: filters also hide
 * markers). Filters combine with AND; empty multi-selects mean "any".
 */
export function filterDevices<T extends Filterable>(
  devices: T[],
  f: DeviceFilters,
): T[] {
  const q = f.query.trim().toLowerCase();
  return devices.filter((d) => {
    if (f.statuses.length && !f.statuses.includes(d.status)) return false;
    if (f.typeIds.length && !f.typeIds.includes(d.deviceTypeId)) return false;
    if (f.routerOnly && !d.isRouter) return false;
    if (q) {
      const hay = `${d.locationDetail ?? ""}\n${d.notes ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
