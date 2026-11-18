import { describe, expect, it } from "vitest";
import { partialDetail } from "./partial-detail";

const base = {
  status: "partial" as const,
  hasPower: false,
  hasFo: false,
  hasEthernet: false,
  partialNote: null,
};

describe("partialDetail", () => {
  it("lists the installed components in a stable order", () => {
    expect(partialDetail({ ...base, hasEthernet: true, hasPower: true })).toBe(
      "Power, Ethernet",
    );
  });

  it("appends the note, or shows only the note", () => {
    expect(partialDetail({ ...base, hasFo: true, partialNote: "kabel" })).toBe(
      "FO — kabel",
    );
    expect(partialDetail({ ...base, partialNote: " menunggu " })).toBe(
      "menunggu",
    );
  });

  it("is null for other statuses even when a checklist is stored", () => {
    expect(
      partialDetail({ ...base, status: "tested", hasPower: true }),
    ).toBeNull();
  });

  it("is null for an empty partial", () => {
    expect(partialDetail(base)).toBeNull();
  });
});
