// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The module guards on `window`, so give it a stand-in.
const fakeWindow: { __MAP_READY__?: boolean } = {};

describe("map readiness handshake", () => {
  beforeEach(() => {
    vi.stubGlobal("window", fakeWindow);
    fakeWindow.__MAP_READY__ = undefined;
  });
  afterEach(async () => {
    const m = await import("./map-ready");
    m.resetMapReady();
    vi.unstubAllGlobals();
  });

  it("is ready only after the expected number of maps reported", async () => {
    const m = await import("./map-ready");
    m.resetMapReady();
    m.expectMaps(2);
    m.markMapReady("a");
    expect(fakeWindow.__MAP_READY__).toBe(false);
    m.markMapReady("b");
    expect(fakeWindow.__MAP_READY__).toBe(true);
  });

  it("does not become ready before the page declared its map count", async () => {
    const m = await import("./map-ready");
    m.resetMapReady();
    m.markMapReady("a");
    expect(fakeWindow.__MAP_READY__).toBe(false);
    m.expectMaps(1);
    expect(fakeWindow.__MAP_READY__).toBe(true);
  });

  it("a page without maps is ready immediately", async () => {
    const m = await import("./map-ready");
    m.resetMapReady();
    m.expectMaps(0);
    expect(fakeWindow.__MAP_READY__).toBe(true);
  });

  it("counts a map once even if it reports twice", async () => {
    const m = await import("./map-ready");
    m.resetMapReady();
    m.expectMaps(2);
    m.markMapReady("a");
    m.markMapReady("a");
    expect(fakeWindow.__MAP_READY__).toBe(false);
  });
});
