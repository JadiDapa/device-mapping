import { describe, expect, it } from "vitest";
import { geoJsonPolygonSchema, zoneInputSchema } from "./zone";

const triangle = {
  type: "Polygon" as const,
  coordinates: [
    [
      [104.0, -2.0],
      [104.1, -2.0],
      [104.1, -2.1],
      [104.0, -2.0],
    ],
  ],
};

describe("zoneInputSchema", () => {
  it("trims the name and turns an empty description into null", () => {
    const r = zoneInputSchema.parse({
      name: "  Pusri 2B ",
      description: "  ",
      boundary: null,
    });
    expect(r.name).toBe("Pusri 2B");
    expect(r.description).toBeNull();
  });

  it("rejects an empty name", () => {
    expect(
      zoneInputSchema.safeParse({ name: "  ", boundary: null }).success,
    ).toBe(false);
  });

  it("accepts a null boundary (zone drawn later)", () => {
    expect(
      zoneInputSchema.safeParse({ name: "A", boundary: null }).success,
    ).toBe(true);
  });
});

describe("geoJsonPolygonSchema", () => {
  it("accepts a closed ring", () => {
    expect(geoJsonPolygonSchema.safeParse(triangle).success).toBe(true);
  });

  it("rejects an unclosed ring", () => {
    const open = {
      type: "Polygon",
      coordinates: [
        [
          [104.0, -2.0],
          [104.1, -2.0],
          [104.1, -2.1],
          [104.2, -2.2],
        ],
      ],
    };
    expect(geoJsonPolygonSchema.safeParse(open).success).toBe(false);
  });

  it("rejects fewer than 4 positions", () => {
    const bad = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    };
    expect(geoJsonPolygonSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects out-of-range coordinates", () => {
    const bad = {
      type: "Polygon",
      coordinates: [
        [
          [200, 0],
          [1, 1],
          [2, 2],
          [200, 0],
        ],
      ],
    };
    expect(geoJsonPolygonSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects non-Polygon geometry", () => {
    expect(
      geoJsonPolygonSchema.safeParse({ type: "Point", coordinates: [0, 0] })
        .success,
    ).toBe(false);
  });
});
