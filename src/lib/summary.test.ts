import { describe, expect, it } from "vitest";
import { sumSummaries, testedPercent } from "./summary";

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

describe("sumSummaries", () => {
  it("is all zeros for no zones", () => {
    expect(sumSummaries([])).toEqual({
      total: 0,
      routers: 0,
      counts: {
        not_installed: 0,
        partial: 0,
        installed_untested: 0,
        tested: 0,
      },
    });
  });

  it("adds totals, routers and every status across zones", () => {
    const a = {
      total: 5,
      routers: 1,
      counts: {
        not_installed: 2,
        partial: 1,
        installed_untested: 1,
        tested: 1,
      },
    };
    const b = {
      total: 3,
      routers: 2,
      counts: {
        not_installed: 0,
        partial: 0,
        installed_untested: 1,
        tested: 2,
      },
    };
    const r = sumSummaries([a, b]);
    expect(r.total).toBe(8);
    expect(r.routers).toBe(3);
    expect(r.counts).toEqual({
      not_installed: 2,
      partial: 1,
      installed_untested: 2,
      tested: 3,
    });
  });
});
