import { describe, expect, it } from "vitest";
import { buildExtenderMarkerHtml } from "@/components/map/marker-html";
import {
  extenderCreateSchema,
  extenderLabel,
  extenderUpdateSchema,
} from "./extender";

const uuidA = "11111111-1111-4111-8111-111111111111";
const uuidB = "22222222-2222-4222-8222-222222222222";

describe("extenderLabel", () => {
  it("joins the two seq numbers with an arrow", () => {
    expect(extenderLabel(5, 6)).toBe("5→6");
  });
  it("shows ? for a missing end", () => {
    expect(extenderLabel(5, null)).toBe("5→?");
    expect(extenderLabel(undefined, 6)).toBe("?→6");
  });
});

describe("extender schemas", () => {
  const base = { zoneId: uuidA, lat: -6.2, lng: 106.8 };
  it("accepts different ends and empty ends", () => {
    expect(
      extenderCreateSchema.safeParse({
        ...base,
        fromDeviceId: uuidA,
        toDeviceId: uuidB,
      }).success,
    ).toBe(true);
    expect(
      extenderCreateSchema.safeParse({
        ...base,
        fromDeviceId: "",
        toDeviceId: "",
      }).success,
    ).toBe(true);
  });
  it("rejects the same device on both ends", () => {
    expect(
      extenderCreateSchema.safeParse({
        ...base,
        fromDeviceId: uuidA,
        toDeviceId: uuidA,
      }).success,
    ).toBe(false);
    expect(
      extenderUpdateSchema.safeParse({
        fromDeviceId: uuidB,
        toDeviceId: uuidB,
      }).success,
    ).toBe(false);
  });
});

describe("buildExtenderMarkerHtml", () => {
  it("renders the label and shrinks long ones", () => {
    const short = buildExtenderMarkerHtml({ label: "5→6", selected: false });
    expect(short).toContain("<span>5</span>");
    expect(short).toContain("<span>6</span>");
    expect(short).not.toContain("→</span>");
    expect(short).toContain("device-marker__badge--extender");
    expect(short).toContain('data-len="s"');
    expect(
      buildExtenderMarkerHtml({ label: "12→13", selected: true }),
    ).toContain("device-marker--selected");
    expect(
      buildExtenderMarkerHtml({ label: "123→124", selected: false }),
    ).toContain('data-len="l"');
  });
});
