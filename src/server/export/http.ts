import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/authz";
import { attachmentHeader } from "@/lib/export-filename";
import { id } from "@/lib/i18n/id";
import { ZoneNotFoundError } from "@/server/zones";

/**
 * Route Handlers (unlike Server Actions) answer with real HTTP statuses, so
 * the PRD's 401/403 are literal here. Unknown errors become a generic 500.
 */
export function exportErrorResponse(error: unknown): Response {
  const json = (status: number, message: string) =>
    Response.json({ error: message }, { status });

  if (error instanceof UnauthorizedError) {
    return json(401, id.common.unauthorized);
  }
  if (error instanceof ForbiddenError) return json(403, id.common.forbidden);
  if (error instanceof ZodError) return json(422, id.export.invalidRequest);
  if (error instanceof ZoneNotFoundError) return json(404, id.zone.notFound);
  console.error(error);
  return json(500, id.export.failed);
}

/** A file download response (never cached: it reflects live data). */
export function fileResponse(
  body: Buffer,
  contentType: string,
  filename: string,
): Response {
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": attachmentHeader(filename),
      "Content-Length": String(body.length),
      "Cache-Control": "no-store",
    },
  });
}
