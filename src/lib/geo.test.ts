import { describe, expect, it } from "vitest";
import { isPointInZone, polygonBounds, polygonCenter } from "./geo";

const box = {
  type: "Polygon" as const,
  coordinates: [
    [
      [104.0, -3.0],
      [104.2, -3.0],
      [104.2, -2.8],
      [104.0, -2.8],
      [104.0, -3.0],
    ],
  ],
};

describe("geo", () => {
  it("computes the centre of a polygon", () => {
    const c = polygonCenter(box);
    expect(c.lng).toBeCloseTo(104.1);
    expect(c.lat).toBeCloseTo(-2.9);
  });

  it("returns Leaflet bounds [[s,w],[n,e]]", () => {
    expect(polygonBounds(box)).toEqual([
      [-3.0, 104.0],
      [-2.8, 104.2],
    ]);
  });

  it("detects whether a point is inside the zone polygon", () => {
    expect(isPointInZone({ lat: -2.9, lng: 104.1 }, box)).toBe(true);
    expect(isPointInZone({ lat: -2.5, lng: 104.1 }, box)).toBe(false);
  });

  it("treats a zone without a boundary as always inside (no warning)", () => {
    expect(isPointInZone({ lat: 0, lng: 0 }, null)).toBe(true);
  });
});
