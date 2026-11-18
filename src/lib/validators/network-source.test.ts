import { describe, expect, it } from "vitest";
import {
  networkSourceInputSchema,
  networkSourcePositionSchema,
} from "./network-source";

const zoneId = "00000000-0000-4000-8000-000000000001";
const base = { name: "Shelter", kind: "Shelter", lat: -3, lng: 104.8 };

describe("networkSourceInputSchema", () => {
  it("accepts a minimal source and normalises optional fields to null", () => {
    const r = networkSourceInputSchema.parse(base);
    expect(r).toMatchObject({ zoneId: null, description: null });
  });

  it("trims name and kind", () => {
    const r = networkSourceInputSchema.parse({
      ...base,
      name: "  Panel A ",
      kind: " Panel ",
    });
    expect(r.name).toBe("Panel A");
    expect(r.kind).toBe("Panel");
  });

  it("requires name and kind", () => {
    expect(
      networkSourceInputSchema.safeParse({ ...base, name: "  " }).success,
    ).toBe(false);
    expect(
      networkSourceInputSchema.safeParse({ ...base, kind: "" }).success,
    ).toBe(false);
  });

  it("limits name and kind length", () => {
    expect(
      networkSourceInputSchema.safeParse({ ...base, name: "x".repeat(101) })
        .success,
    ).toBe(false);
    expect(
      networkSourceInputSchema.safeParse({ ...base, kind: "x".repeat(61) })
        .success,
    ).toBe(false);
  });

  it("validates coordinates", () => {
    expect(
      networkSourceInputSchema.safeParse({ ...base, lat: 91 }).success,
    ).toBe(false);
    expect(
      networkSourceInputSchema.safeParse({ ...base, lng: -181 }).success,
    ).toBe(false);
  });

  it("accepts a zone uuid and rejects a malformed one", () => {
    expect(networkSourceInputSchema.parse({ ...base, zoneId }).zoneId).toBe(
      zoneId,
    );
    expect(
      networkSourceInputSchema.safeParse({ ...base, zoneId: "nope" }).success,
    ).toBe(false);
  });
});

describe("networkSourcePositionSchema", () => {
  it("accepts lat/lng only", () => {
    expect(
      networkSourcePositionSchema.safeParse({ lat: 1, lng: 2 }).success,
    ).toBe(true);
    expect(
      networkSourcePositionSchema.safeParse({ lat: 100, lng: 2 }).success,
    ).toBe(false);
  });
});
