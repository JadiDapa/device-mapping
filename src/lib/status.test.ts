import { describe, expect, it } from "vitest";
import {
  DEVICE_STATUSES,
  PARTIAL_COMPONENTS,
  statusColor,
  statusLabel,
} from "./status";

describe("lib/status", () => {
  it("lists the four installation stages in order", () => {
    expect(DEVICE_STATUSES).toEqual([
      "not_installed",
      "partial",
      "installed_untested",
      "tested",
    ]);
  });

  it("maps every status to its CSS token", () => {
    expect(statusColor).toEqual({
      not_installed: "var(--status-not-installed)",
      partial: "var(--status-partial)",
      installed_untested: "var(--status-installed-untested)",
      tested: "var(--status-tested)",
    });
  });

  it("gives every status a token colour and a non-empty label", () => {
    for (const status of DEVICE_STATUSES) {
      expect(statusColor[status]).toMatch(/^var\(--status-[a-z-]+\)$/);
      expect(statusLabel[status].length).toBeGreaterThan(0);
    }
  });

  it("uses the Indonesian labels from PRD §4", () => {
    expect(statusLabel).toEqual({
      not_installed: "Belum terinstall",
      partial: "Terinstall sebagian",
      installed_untested: "Terinstall, belum diuji",
      tested: "Sudah diuji",
    });
  });

  it("has distinct colours so statuses are never ambiguous", () => {
    const colours = new Set(Object.values(statusColor));
    expect(colours.size).toBe(DEVICE_STATUSES.length);
  });

  it("lists the partial-install checklist components", () => {
    expect(PARTIAL_COMPONENTS).toEqual(["power", "fo", "ethernet"]);
  });
});
