import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "./public-env";

describe("parsePublicEnv", () => {
  it("falls back to Esri World Imagery and the default view when unset", () => {
    const env = parsePublicEnv({});
    expect(env.tileUrl).toContain("World_Imagery/MapServer/tile/{z}/{y}/{x}");
    expect(env.tileAttribution).toContain("Esri");
    expect(env.tileMaxZoom).toBe(19);
    expect(env.defaultZoom).toBe(16);
    expect(Number.isFinite(env.defaultCenter.lat)).toBe(true);
    expect(Number.isFinite(env.defaultCenter.lng)).toBe(true);
  });

  it("reads overrides from the given values", () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_TILE_URL: "https://tiles.example.com/{z}/{x}/{y}.png",
      NEXT_PUBLIC_TILE_ATTRIBUTION: "Example",
      NEXT_PUBLIC_TILE_MAX_ZOOM: "21",
      NEXT_PUBLIC_DEFAULT_CENTER_LAT: "-2.99",
      NEXT_PUBLIC_DEFAULT_CENTER_LNG: "104.77",
      NEXT_PUBLIC_DEFAULT_ZOOM: "14",
    });
    expect(env.tileUrl).toBe("https://tiles.example.com/{z}/{x}/{y}.png");
    expect(env.tileAttribution).toBe("Example");
    expect(env.tileMaxZoom).toBe(21);
    expect(env.defaultCenter).toEqual({ lat: -2.99, lng: 104.77 });
    expect(env.defaultZoom).toBe(14);
  });

  it("treats empty strings as unset", () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_TILE_URL: "",
      NEXT_PUBLIC_DEFAULT_CENTER_LAT: "",
    });
    expect(env.tileUrl).toContain("arcgisonline.com");
    expect(Number.isFinite(env.defaultCenter.lat)).toBe(true);
  });

  it("rejects out-of-range coordinates", () => {
    expect(() =>
      parsePublicEnv({ NEXT_PUBLIC_DEFAULT_CENTER_LAT: "123" }),
    ).toThrow();
    expect(() =>
      parsePublicEnv({ NEXT_PUBLIC_DEFAULT_CENTER_LNG: "-181" }),
    ).toThrow();
  });

  it("rejects a tile URL without {z}/{x}/{y} placeholders", () => {
    expect(() =>
      parsePublicEnv({ NEXT_PUBLIC_TILE_URL: "https://example.com/tile.png" }),
    ).toThrow();
  });
});
