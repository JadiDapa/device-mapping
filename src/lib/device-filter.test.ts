import { describe, expect, it } from "vitest";
import {
  filterDevices,
  hasActiveFilter,
  type DeviceFilters,
} from "./device-filter";
import type { DeviceStatus } from "./status";

const none: DeviceFilters = {
  statuses: [],
  typeIds: [],
  routerOnly: false,
  query: "",
};

function d(
  seq: number,
  over: Partial<{
    status: DeviceStatus;
    deviceTypeId: string;
    isRouter: boolean;
    locationDetail: string | null;
    notes: string | null;
  }> = {},
) {
  return {
    id: `d${seq}`,
    seq,
    status: "not_installed" as DeviceStatus,
    deviceTypeId: "t1",
    isRouter: false,
    locationDetail: null,
    notes: null,
    ...over,
  };
}

describe("filterDevices", () => {
  const list = [
    d(1, { status: "tested", isRouter: true, locationDetail: "Lantai 1" }),
    d(2, { status: "partial", deviceTypeId: "t2", notes: "Kabel FO putus" }),
    d(3, { status: "tested", deviceTypeId: "t2", locationDetail: "Tangga" }),
  ];

  it("returns everything with no filters", () => {
    expect(filterDevices(list, none)).toHaveLength(3);
    expect(hasActiveFilter(none)).toBe(false);
  });

  it("filters by multiple statuses", () => {
    const r = filterDevices(list, { ...none, statuses: ["partial", "tested"] });
    expect(r.map((x) => x.seq)).toEqual([1, 2, 3]);
    expect(
      filterDevices(list, { ...none, statuses: ["partial"] }).map((x) => x.seq),
    ).toEqual([2]);
  });

  it("filters by multiple types", () => {
    expect(
      filterDevices(list, { ...none, typeIds: ["t2"] }).map((x) => x.seq),
    ).toEqual([2, 3]);
  });

  it("router only", () => {
    expect(
      filterDevices(list, { ...none, routerOnly: true }).map((x) => x.seq),
    ).toEqual([1]);
  });

  it("searches location and notes case-insensitively", () => {
    expect(
      filterDevices(list, { ...none, query: "lantai" }).map((x) => x.seq),
    ).toEqual([1]);
    expect(
      filterDevices(list, { ...none, query: " FO " }).map((x) => x.seq),
    ).toEqual([2]);
  });

  it("combines filters with AND", () => {
    expect(
      filterDevices(list, { ...none, statuses: ["tested"], typeIds: ["t2"] }),
    ).toHaveLength(1);
    expect(hasActiveFilter({ ...none, query: "x" })).toBe(true);
  });
});
