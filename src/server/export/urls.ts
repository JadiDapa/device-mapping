import { z } from "zod";
import { getEnv } from "@/lib/env";
import { id } from "@/lib/i18n/id";
import { signExportToken } from "./token";

const uuid = z.string().uuid(id.validation.invalidId);

export const pngQuerySchema = z.object({ zone: uuid });

/** `?zones=a,b,c` -> unique, non-empty list of zone ids. */
export const pdfQuerySchema = z.object({
  zones: z
    .string()
    .transform((v) => [...new Set(v.split(",").filter(Boolean))])
    .pipe(z.array(uuid).min(1).max(100)),
});

/** Where the headless browser reaches this app (never the public URL). */
export function exportBaseUrl(): string {
  return (
    getEnv().EXPORT_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`
  ).replace(/\/+$/, "");
}

function token(zones: string[]): string {
  return signExportToken({ zones, secret: getEnv().BETTER_AUTH_SECRET });
}

export function zonePrintUrl(zoneId: string): string {
  return `${exportBaseUrl()}/print/zones/${zoneId}?token=${token([zoneId])}`;
}

export function reportPrintUrl(zoneIds: string[]): string {
  const zones = encodeURIComponent(zoneIds.join(","));
  return `${exportBaseUrl()}/print/report?zones=${zones}&token=${token(zoneIds)}`;
}
