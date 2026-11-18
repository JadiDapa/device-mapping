import { describe, expect, it } from "vitest";
import {
  cameraPointCreateSchema,
  imageCaptionSchema,
  imageReorderSchema,
} from "./camera";

const zoneId = "11111111-1111-4111-8111-111111111111";

describe("camera validators", () => {
  it("requires a name and trims it", () => {
    expect(
      cameraPointCreateSchema.safeParse({ zoneId, name: "  ", lat: 1, lng: 2 })
        .success,
    ).toBe(false);
    const ok = cameraPointCreateSchema.parse({
      zoneId,
      name: "  Lobby ",
      notes: "",
      lat: 1,
      lng: 2,
    });
    expect(ok.name).toBe("Lobby");
    expect(ok.notes).toBeNull();
  });

  it("rejects out-of-range coordinates", () => {
    expect(
      cameraPointCreateSchema.safeParse({ zoneId, name: "a", lat: 91, lng: 0 })
        .success,
    ).toBe(false);
  });

  it("limits caption length", () => {
    expect(
      imageCaptionSchema.safeParse({ caption: "x".repeat(301) }).success,
    ).toBe(false);
    expect(imageCaptionSchema.parse({ caption: "" }).caption).toBeNull();
  });

  it("rejects duplicate ids in a reorder", () => {
    expect(imageReorderSchema.safeParse([zoneId, zoneId]).success).toBe(false);
    expect(imageReorderSchema.safeParse([zoneId]).success).toBe(true);
  });
});
