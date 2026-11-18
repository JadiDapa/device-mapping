import { describe, expect, it } from "vitest";
import { statusColor } from "@/lib/status";
import {
  buildCameraMarkerHtml,
  buildMarkerHtml,
  buildSourceMarkerHtml,
  type MarkerHtmlInput,
} from "./marker-html";

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

describe("buildSourceMarkerHtml", () => {
  it("always shows the (escaped) name and uses the source shape", () => {
    const html = buildSourceMarkerHtml({
      name: "<Shelter> & Co",
      selected: false,
    });
    expect(html).toContain("source-marker__box");
    expect(html).toContain("&lt;Shelter&gt; &amp; Co");
    expect(html).not.toContain("<Shelter>");
    expect(html).not.toContain("device-marker");
    expect(html).toContain("<svg");
  });

  it("marks the selected source", () => {
    expect(buildSourceMarkerHtml({ name: "S", selected: true })).toContain(
      "source-marker--selected",
    );
    expect(buildSourceMarkerHtml({ name: "S", selected: false })).not.toContain(
      "source-marker--selected",
    );
  });

  it("builds a camera marker with an escaped name and the photo count", () => {
    const html = buildCameraMarkerHtml({
      name: "<Lobby>",
      count: 3,
      selected: true,
    });
    expect(html).toContain("device-marker--camera");
    expect(html).toContain("device-marker--selected");
    expect(html).toContain('data-count="3"');
    expect(html).toContain("&lt;Lobby&gt;");
    expect(html).toContain("<svg");
  });
});
