import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { pngFilename } from "@/lib/export-filename";
import { exportErrorResponse, fileResponse } from "@/server/export/http";
import { renderPng } from "@/server/export/renderer";
import { pngQuerySchema, zonePrintUrl } from "@/server/export/urls";
import { getZone, ZoneNotFoundError } from "@/server/zones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Chromium cold start + map render can exceed the default function timeout.
export const maxDuration = 60;

/** PNG of one zone's map (PRD F7). Any signed-in user, guests included. */
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const { zone: zoneId } = pngQuerySchema.parse({
      zone: request.nextUrl.searchParams.get("zone"),
    });
    const zone = await getZone(getDb(), zoneId);
    if (!zone) throw new ZoneNotFoundError();

    const png = await renderPng(zonePrintUrl(zoneId));
    return fileResponse(png, "image/png", pngFilename(zone.name));
  } catch (error) {
    return exportErrorResponse(error);
  }
}
