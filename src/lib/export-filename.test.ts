import { describe, expect, it } from "vitest";
import {
  attachmentHeader,
  parseAttachmentFilename,
  pdfFilename,
  pngFilename,
  sanitizeFilenamePart,
  wibDateStamp,
} from "./export-filename";

describe("wibDateStamp", () => {
  it("uses the WIB calendar day, not UTC", () => {
    // 18:30 UTC on 5 Mar is already 6 Mar in WIB (UTC+7).
    expect(wibDateStamp(new Date("2026-03-05T18:30:00Z"))).toBe("2026-03-06");
    expect(wibDateStamp(new Date("2026-03-05T16:30:00Z"))).toBe("2026-03-05");
  });
});

describe("export file names", () => {
  const date = new Date("2026-11-18T03:00:00Z");

  it("follows <zona>_<YYYY-MM-DD>.png and Rekap_Instalasi_<date>.pdf", () => {
    expect(pngFilename("Pusri 2B", date)).toBe("Pusri 2B_2026-11-18.png");
    expect(pdfFilename(date)).toBe("Rekap_Instalasi_2026-11-18.pdf");
  });

  it("sanitises illegal characters and never returns an empty name", () => {
    expect(sanitizeFilenamePart('A/B:C*"D"?')).toBe("A-B-C--D--");
    expect(sanitizeFilenamePart("  ..hidden  ")).toBe("hidden");
    expect(sanitizeFilenamePart("   ")).toBe("zona");
  });
});

describe("attachment header", () => {
  it("round-trips ASCII and non-ASCII names", () => {
    for (const name of ["Pusri 2B_2026-11-18.png", "Zona Ünïcode ★_2026.png"]) {
      expect(parseAttachmentFilename(attachmentHeader(name))).toBe(name);
    }
  });

  it("keeps an ASCII fallback and an encoded filename*", () => {
    const h = attachmentHeader("Zona ★.png");
    expect(h).toContain('filename="Zona _.png"');
    expect(h).toContain("filename*=UTF-8''Zona%20%E2%98%85.png");
  });

  it("returns null when there is no file name", () => {
    expect(parseAttachmentFilename(null)).toBeNull();
    expect(parseAttachmentFilename("inline")).toBeNull();
  });
});
