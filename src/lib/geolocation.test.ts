import { afterEach, describe, expect, it, vi } from "vitest";
import { id } from "@/lib/i18n/id";
import {
  GeoError,
  geoErrorMessage,
  geoKindFromCode,
  locate,
} from "./geolocation";

afterEach(() => vi.unstubAllGlobals());

function stub(opts: { secure?: boolean; geolocation?: unknown }) {
  vi.stubGlobal("window", { isSecureContext: opts.secure ?? true });
  vi.stubGlobal(
    "navigator",
    opts.geolocation ? { geolocation: opts.geolocation } : {},
  );
}

describe("lib/geolocation", () => {
  it("maps W3C error codes to kinds and Indonesian messages", () => {
    expect(geoKindFromCode(1)).toBe("denied");
    expect(geoKindFromCode(2)).toBe("unavailable");
    expect(geoKindFromCode(3)).toBe("timeout");
    expect(geoErrorMessage(new GeoError("denied"))).toBe(id.geo.denied);
    expect(geoErrorMessage(new Error("x"))).toBe(id.geo.unavailable);
  });

  it("resolves with the browser position", async () => {
    stub({
      geolocation: {
        getCurrentPosition: (ok: (p: unknown) => void) =>
          ok({ coords: { latitude: -2.99, longitude: 104.78, accuracy: 12 } }),
      },
    });
    await expect(locate()).resolves.toEqual({
      lat: -2.99,
      lng: 104.78,
      accuracy: 12,
    });
  });

  it("rejects with a typed error for each failure", async () => {
    stub({
      geolocation: {
        getCurrentPosition: (_: unknown, fail: (e: unknown) => void) =>
          fail({ code: 1 }),
      },
    });
    await expect(locate()).rejects.toMatchObject({ kind: "denied" });

    stub({ secure: false, geolocation: { getCurrentPosition: vi.fn() } });
    await expect(locate()).rejects.toMatchObject({ kind: "insecure" });

    stub({});
    await expect(locate()).rejects.toMatchObject({ kind: "unsupported" });
  });
});
