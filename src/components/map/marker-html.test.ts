import { describe, expect, it } from "vitest";
import { statusColor } from "@/lib/status";
import { buildMarkerHtml, type MarkerHtmlInput } from "./marker-html";

const base: MarkerHtmlInput = {
  seq: 7,
  status: "partial",
  isRouter: false,
  typeIcon: "radio",
  locationDetail: null,
  selected: false,
  showLocation: false,
  showTypeIcon: false,
};

describe("buildMarkerHtml", () => {
  it("renders the number and the status colour from lib/status", () => {
    const html = buildMarkerHtml(base);
    expect(html).toContain(">7<");
    expect(html).toContain('data-status="partial"');
    expect(html).toContain(statusColor.partial);
  });

  it("adds a router badge only for routers", () => {
    expect(buildMarkerHtml(base)).not.toContain("device-marker__badge--router");
    const html = buildMarkerHtml({ ...base, isRouter: true });
    expect(html).toContain("device-marker__badge--router");
    expect(html).toContain("<svg");
  });

  it("shows the type icon and location label only when toggled on", () => {
    const withLoc = { ...base, locationDetail: "Lantai 1" };
    expect(buildMarkerHtml(withLoc)).not.toContain("Lantai 1");
    expect(buildMarkerHtml(withLoc)).not.toContain(
      "device-marker__badge--type",
    );

    const on = buildMarkerHtml({
      ...withLoc,
      showLocation: true,
      showTypeIcon: true,
    });
    expect(on).toContain("Lantai 1");
    expect(on).toContain("device-marker__badge--type");
  });

  it("omits the label when there is no location detail", () => {
    expect(buildMarkerHtml({ ...base, showLocation: true })).not.toContain(
      "device-marker__label",
    );
  });

  it("escapes user text so it cannot inject markup", () => {
    const html = buildMarkerHtml({
      ...base,
      showLocation: true,
      locationDetail: '<img src=x onerror="alert(1)">',
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("marks the selected marker", () => {
    expect(buildMarkerHtml({ ...base, selected: true })).toContain(
      "device-marker--selected",
    );
    expect(buildMarkerHtml(base)).not.toContain("device-marker--selected");
  });
});
