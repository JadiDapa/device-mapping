import type { NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { attachmentHeader, zipFilename } from "@/lib/export-filename";
import { id } from "@/lib/i18n/id";
import { NoPhotosError, openCameraZip } from "@/server/camera-zip";
import { exportErrorResponse } from "@/server/export/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({ zone: z.string().uuid() });

/** ZIP of all camera photos of one zone (F9). Admin only. */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { zone: zoneId } = querySchema.parse({
      zone: request.nextUrl.searchParams.get("zone"),
    });
    const { zoneName, stream } = await openCameraZip(getDb(), zoneId);
    return new Response(stream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": attachmentHeader(zipFilename(zoneName)),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof NoPhotosError) {
      return Response.json({ error: id.camera.zipEmpty }, { status: 404 });
    }
    return exportErrorResponse(error);
  }
}
