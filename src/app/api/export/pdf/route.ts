import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { pdfFilename } from "@/lib/export-filename";
import { exportErrorResponse, fileResponse } from "@/server/export/http";
import { renderPdf } from "@/server/export/renderer";
import { pdfQuerySchema, reportPrintUrl } from "@/server/export/urls";
import { listZoneOptions, ZoneNotFoundError } from "@/server/zones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Chromium cold start + map render can exceed the default function timeout.
export const maxDuration = 60;

/** Multi-zone PDF recap (PRD F7). Any signed-in user, guests included. */
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const { zones: zoneIds } = pdfQuerySchema.parse({
      zones: request.nextUrl.searchParams.get("zones") ?? "",
    });
    const existing = new Set((await listZoneOptions(getDb())).map((z) => z.id));
    if (zoneIds.some((zoneId) => !existing.has(zoneId))) {
      throw new ZoneNotFoundError();
    }

    const pdf = await renderPdf(reportPrintUrl(zoneIds));
    return fileResponse(pdf, "application/pdf", pdfFilename());
  } catch (error) {
    return exportErrorResponse(error);
  }
}
