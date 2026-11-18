import { describe, expect, it } from "vitest";
import { fitWithin } from "./image-resize";

describe("fitWithin", () => {
  it("scales the longest side down to the limit", () => {
    expect(fitWithin(5120, 2880, 2560)).toEqual({ width: 2560, height: 1440 });
    expect(fitWithin(2880, 5120, 2560)).toEqual({ width: 1440, height: 2560 });
  });

  it("never scales up", () => {
    expect(fitWithin(800, 600, 2560)).toEqual({ width: 800, height: 600 });
  });

  it("keeps at least 1px", () => {
    expect(fitWithin(10000, 1, 400)).toEqual({ width: 400, height: 1 });
  });
});
