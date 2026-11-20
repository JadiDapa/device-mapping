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

/**
 * Where the headless browser reaches this app. Locally/Docker that is the
 * loopback address; on Vercel a function cannot reach itself that way, so it
 * falls back to the deployment's own host (unless EXPORT_BASE_URL is set).
 */
export function exportBaseUrl(): string {
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const fallback =
    process.env.VERCEL && vercelHost
      ? `https://${vercelHost}`
      : `http://127.0.0.1:${process.env.PORT ?? 3000}`;
  return (getEnv().EXPORT_BASE_URL ?? fallback).replace(/\/+$/, "");
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
