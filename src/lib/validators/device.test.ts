import { describe, expect, it } from "vitest";
import {
  deviceCreateSchema,
  deviceStatusSchema,
  deviceUpdateSchema,
  moveZoneSchema,
  reorderSchema,
} from "./device";
import { deviceTypeInputSchema } from "./device-type";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("deviceStatusSchema (partial validation)", () => {
  const base = {
    hasPower: false,
    hasFo: false,
    hasEthernet: false,
    partialNote: null,
  };

  it("accepts non-partial statuses without a checklist", () => {
    for (const status of ["not_installed", "installed_untested", "tested"]) {
      expect(deviceStatusSchema.safeParse({ ...base, status }).success).toBe(
        true,
      );
    }
  });

  it("rejects partial with no checkbox and no note", () => {
    const r = deviceStatusSchema.safeParse({ ...base, status: "partial" });
    expect(r.success).toBe(false);
  });

  it("rejects partial with a whitespace-only note", () => {
    expect(
      deviceStatusSchema.safeParse({
        ...base,
        status: "partial",
        partialNote: "   ",
      }).success,
    ).toBe(false);
  });

  it("accepts partial with one checkbox", () => {
    expect(
      deviceStatusSchema.safeParse({
        ...base,
        status: "partial",
        hasFo: true,
      }).success,
    ).toBe(true);
  });

  it("accepts partial with only a note", () => {
    expect(
      deviceStatusSchema.safeParse({
        ...base,
        status: "partial",
        partialNote: "Menunggu kabel",
      }).success,
    ).toBe(true);
  });

  it("keeps the checklist when the status is not partial", () => {
    const r = deviceStatusSchema.parse({
      ...base,
      status: "tested",
      hasPower: true,
    });
    expect(r.hasPower).toBe(true);
  });

  it("normalises empty notes to null", () => {
    const r = deviceStatusSchema.parse({
      ...base,
      status: "tested",
      partialNote: "",
      note: " ",
    });
    expect(r.partialNote).toBeNull();
    expect(r.note).toBeNull();
  });

  it("rejects an unknown status", () => {
    expect(
      deviceStatusSchema.safeParse({ ...base, status: "broken" }).success,
    ).toBe(false);
  });
});

describe("deviceCreateSchema", () => {
  const valid = {
    zoneId: uuid(1),
    deviceTypeId: uuid(2),
    lat: -2.9,
    lng: 104.1,
    status: "not_installed",
  };

  it("applies defaults", () => {
    const r = deviceCreateSchema.parse(valid);
    expect(r.isRouter).toBe(false);
    expect(r.locationDetail).toBeNull();
    expect(r.hasPower).toBe(false);
  });

  it("rejects out-of-range coordinates", () => {
    expect(deviceCreateSchema.safeParse({ ...valid, lat: 91 }).success).toBe(
      false,
    );
    expect(deviceCreateSchema.safeParse({ ...valid, lng: -181 }).success).toBe(
      false,
    );
  });

  it("applies the partial rule to the initial status", () => {
    expect(
      deviceCreateSchema.safeParse({ ...valid, status: "partial" }).success,
    ).toBe(false);
    expect(
      deviceCreateSchema.safeParse({
        ...valid,
        status: "partial",
        hasEthernet: true,
      }).success,
    ).toBe(true);
  });
});

describe("deviceUpdateSchema", () => {
  it("does not carry status fields", () => {
    const r = deviceUpdateSchema.parse({
      deviceTypeId: uuid(2),
      isRouter: true,
      locationDetail: " Lantai 1 ",
      notes: "",
      status: "tested",
    });
    expect(r.locationDetail).toBe("Lantai 1");
    expect(r.notes).toBeNull();
    expect("status" in r).toBe(false);
  });
});

describe("reorderSchema", () => {
  it("accepts unique uuids", () => {
    expect(
      reorderSchema.safeParse({ zoneId: uuid(1), ids: [uuid(2), uuid(3)] })
        .success,
    ).toBe(true);
  });

  it("rejects duplicates and non-uuids", () => {
    expect(
      reorderSchema.safeParse({ zoneId: uuid(1), ids: [uuid(2), uuid(2)] })
        .success,
    ).toBe(false);
    expect(
      reorderSchema.safeParse({ zoneId: uuid(1), ids: ["x"] }).success,
    ).toBe(false);
  });
});

describe("moveZoneSchema", () => {
  it("requires a uuid", () => {
    expect(moveZoneSchema.safeParse({ zoneId: uuid(1) }).success).toBe(true);
    expect(moveZoneSchema.safeParse({ zoneId: "nope" }).success).toBe(false);
  });
});

describe("deviceTypeInputSchema", () => {
  it("accepts preset icons only", () => {
    expect(
      deviceTypeInputSchema.safeParse({ name: "Gateway", icon: "radio" })
        .success,
    ).toBe(true);
    expect(
      deviceTypeInputSchema.safeParse({ name: "Gateway", icon: "rocket" })
        .success,
    ).toBe(false);
  });

  it("requires a trimmed name", () => {
    expect(
      deviceTypeInputSchema.safeParse({ name: "  ", icon: "radio" }).success,
    ).toBe(false);
  });
});
