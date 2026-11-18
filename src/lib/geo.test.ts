import { describe, expect, it } from "vitest";
import { polygonBounds, polygonCenter } from "./geo";

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
});
