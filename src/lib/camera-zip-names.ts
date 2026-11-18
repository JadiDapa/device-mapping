/**
 * Naming convention and manifest of the camera photos ZIP (F9), pure so it is
 * easy to test. Layout inside the ZIP:
 *
 *   <zona>/manifest.csv
 *   <zona>/<NN>_<titik>/<NN>_<titik>_<III>_<lat>_<lng>.<ext>
 *
 * NN = point number (order of creation, zero-padded, at least 2 digits),
 * III = photo number within the point (its current order, 3 digits),
 * lat/lng = the point's position, 5 decimals (about 1 m).
 */

/** ASCII-only slug: accents dropped, anything else becomes a single "-". */
export function slugify(text: string, max = 40, fallback = "titik"): string {
  const slug = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
  return slug || fallback;
}

export const pad = (n: number, width: number) => String(n).padStart(width, "0");

export const formatCoord = (n: number) => n.toFixed(5);

/** `01_Lobby-Utara` (point numbers are 1-based). */
export function pointFolderName(
  pointNo: number,
  pointCount: number,
  name: string,
): string {
  const width = Math.max(2, String(pointCount).length);
  return `${pad(pointNo, width)}_${slugify(name)}`;
}

/** `01_Lobby-Utara_001_-2.99610_104.83960.webp` */
export function photoFileName(input: {
  folder: string;
  photoNo: number;
  lat: number;
  lng: number;
  ext: string;
}): string {
  return (
    `${input.folder}_${pad(input.photoNo, 3)}_` +
    `${formatCoord(input.lat)}_${formatCoord(input.lng)}.${input.ext}`
  );
}

export const MANIFEST_NAME = "manifest.csv";

export const MANIFEST_HEADER = [
  "file",
  "point_no",
  "point_name",
  "lat",
  "lng",
  "photo_no",
  "caption",
  "width",
  "height",
  "size_bytes",
] as const;

/**
 * One CSV cell. Text starting with = + - @ (or a control character) is
 * prefixed with an apostrophe so a spreadsheet never runs it as a formula;
 * numbers are written as they are.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV with a UTF-8 BOM and CRLF, which Excel opens correctly. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return `﻿${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
