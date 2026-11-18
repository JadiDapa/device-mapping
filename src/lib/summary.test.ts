import { describe, expect, it } from "vitest";
import { testedPercent } from "./summary";

const counts = (tested: number) => ({
  not_installed: 0,
  partial: 0,
  installed_untested: 0,
  tested,
});

describe("testedPercent", () => {
  it("is 0 for an empty zone", () => {
    expect(testedPercent(counts(0), 0)).toBe(0);
  });

  it("rounds to a whole percent", () => {
    expect(testedPercent(counts(1), 3)).toBe(33);
    expect(testedPercent(counts(2), 3)).toBe(67);
  });

  it("is 100 when everything is tested", () => {
    expect(testedPercent(counts(6), 6)).toBe(100);
  });
});
