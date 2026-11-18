import { describe, expect, it } from "vitest";
import { sniffImage } from "./image-sniff";

const bytes = (...n: number[]) => Uint8Array.from(n);

describe("sniffImage", () => {
  it("reads a PNG header", () => {
    const png = bytes(
      ...[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13],
      ...[0x49, 0x48, 0x44, 0x52, 0, 0, 1, 0, 0, 0, 0, 200],
    );
    expect(sniffImage(png)).toEqual({
      mime: "image/png",
      ext: "png",
      width: 256,
      height: 200,
    });
  });

  it("reads a JPEG SOF0 (skipping an APP0 segment)", () => {
    const jpeg = bytes(
      ...[0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8],
      ...[0x01, 0x90, 0x02, 0x58, 3, 0, 0],
    );
    expect(sniffImage(jpeg)).toMatchObject({
      mime: "image/jpeg",
      width: 600,
      height: 400,
    });
  });

  it("reads a WebP VP8X header", () => {
    const b = new Uint8Array(30);
    b.set([0x52, 0x49, 0x46, 0x46], 0);
    b.set([0x57, 0x45, 0x42, 0x50], 8);
    b.set([0x56, 0x50, 0x38, 0x58], 12);
    b.set([0x1f, 0x03, 0x00], 24); // width-1 = 799
    b.set([0x57, 0x02, 0x00], 27); // height-1 = 599
    expect(sniffImage(b)).toEqual({
      mime: "image/webp",
      ext: "webp",
      width: 800,
      height: 600,
    });
  });

  it("rejects anything else", () => {
    expect(sniffImage(new TextEncoder().encode("<svg></svg>"))).toBeNull();
    expect(sniffImage(new Uint8Array(0))).toBeNull();
  });
});
