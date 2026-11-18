import { describe, expect, it } from "vitest";
import {
  csvCell,
  photoFileName,
  pointFolderName,
  slugify,
  toCsv,
} from "./camera-zip-names";

describe("camera zip naming", () => {
  it("slugifies names (accents, symbols, length, fallback)", () => {
    expect(slugify("Lobby Utara – sudut #1")).toBe("Lobby-Utara-sudut-1");
    expect(slugify("Gudang Béséar")).toBe("Gudang-Besear");
    expect(slugify("???")).toBe("titik");
    expect(slugify("a".repeat(80)).length).toBe(40);
  });

  it("pads the point number to at least 2 digits", () => {
    expect(pointFolderName(1, 9, "Lobby")).toBe("01_Lobby");
    expect(pointFolderName(7, 120, "Lobby")).toBe("007_Lobby");
  });

  it("builds a photo name with 5-decimal coordinates", () => {
    expect(
      photoFileName({
        folder: "01_Lobby-Utara",
        photoNo: 2,
        lat: -2.9961,
        lng: 104.8396,
        ext: "webp",
      }),
    ).toBe("01_Lobby-Utara_002_-2.99610_104.83960.webp");
  });

  it("escapes CSV cells and neutralises formulas", () => {
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell(-2.9961)).toBe("-2.9961");
    expect(csvCell(null)).toBe("");
  });

  it("writes a BOM and CRLF", () => {
    const csv = toCsv([
      ["a", "b"],
      [1, "x"],
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe("﻿a,b\r\n1,x\r\n");
  });
});
