import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { APP_TIME_ZONE } from "./date";

/** `YYYY-MM-DD` of `date` in WIB (the date in export file names, PRD F7). */
export function wibDateStamp(date: Date = new Date()): string {
  return format(new TZDate(date, APP_TIME_ZONE), "yyyy-MM-dd");
}

/** Replace characters that are illegal in file names on common systems. */
export function sanitizeFilenamePart(name: string): string {
  const cleaned = name
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  return cleaned || "zona";
}

/** `<zona>_<YYYY-MM-DD>.png` */
export function pngFilename(zoneName: string, date: Date = new Date()): string {
  return `${sanitizeFilenamePart(zoneName)}_${wibDateStamp(date)}.png`;
}

/** `Rekap_Instalasi_<YYYY-MM-DD>.pdf` */
export function pdfFilename(date: Date = new Date()): string {
  return `Rekap_Instalasi_${wibDateStamp(date)}.pdf`;
}

/**
 * `Content-Disposition: attachment` with an ASCII fallback plus the RFC 5987
 * UTF-8 `filename*`, so zone names with non-ASCII characters survive.
 */
export function attachmentHeader(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/** Read the file name back out of a Content-Disposition header (client). */
export function parseAttachmentFilename(
  header: string | null | undefined,
): string | null {
  if (!header) return null;
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      // fall through to the plain filename
    }
  }
  const plain = /filename\s*=\s*"([^"]*)"/i.exec(header);
  return plain?.[1] ?? null;
}
