import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { id as t } from "@/lib/i18n/id";
import {
  ACCEPTED_IMAGE_TYPES,
  imageCaptionSchema,
  MAX_DISPLAY_BYTES,
  MAX_THUMB_BYTES,
} from "@/lib/validators/camera";
import {
  addCameraImage,
  getCameraPoint,
  CameraPointNotFoundError,
} from "@/server/camera-points";
import { sniffImage } from "@/server/image-sniff";
import { ok, runAction, type ActionResult } from "@/server/actions/result";
import { deleteFiles, makeKey, saveFile } from "@/server/storage";
import type { CameraImage } from "@/server/camera-points";

export const runtime = "nodejs";

/**
 * Upload ONE image (already compressed in the browser) to a camera point.
 * multipart: `display` (file, required), `thumb` (file, required), `caption`
 * (text, optional). A Route Handler rather than a Server Action so there is
 * no 1 MB body limit and the client can report upload progress. Admin only;
 * everything is re-validated here (size, real file type from magic bytes).
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const result: ActionResult<{ image: CameraImage }> = await runAction(
    async () => {
      const session = await requireAdmin();
      const { id } = await ctx.params;
      const pointId = z.string().uuid().parse(id);
      const point = await getCameraPoint(getDb(), pointId);
      if (!point) throw new CameraPointNotFoundError();

      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return { ok: false, status: 422, error: t.camera.invalidImage };
      }
      const display = form.get("display");
      const thumb = form.get("thumb");
      if (!(display instanceof File) || !(thumb instanceof File)) {
        return { ok: false, status: 422, error: t.camera.invalidImage };
      }
      if (display.size > MAX_DISPLAY_BYTES || thumb.size > MAX_THUMB_BYTES) {
        return { ok: false, status: 422, error: t.camera.tooLarge };
      }
      const displayBytes = new Uint8Array(await display.arrayBuffer());
      const thumbBytes = new Uint8Array(await thumb.arrayBuffer());
      const displayInfo = sniffImage(displayBytes);
      const thumbInfo = sniffImage(thumbBytes);
      if (!displayInfo || !thumbInfo) {
        return { ok: false, status: 422, error: t.camera.invalidImage };
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(displayInfo.mime)) {
        return { ok: false, status: 422, error: t.camera.unsupportedType };
      }
      const caption = imageCaptionSchema.parse({
        caption: form.get("caption")?.toString(),
      }).caption;

      const imageId = crypto.randomUUID();
      const displayKey = makeKey(pointId, imageId, "display", displayInfo.ext);
      const thumbKey = makeKey(pointId, imageId, "thumb", thumbInfo.ext);
      await saveFile(displayKey, displayBytes);
      await saveFile(thumbKey, thumbBytes);
      try {
        const image = await addCameraImage(
          getDb(),
          pointId,
          {
            id: imageId,
            displayKey,
            thumbKey,
            width: displayInfo.width,
            height: displayInfo.height,
            sizeBytes: displayBytes.byteLength,
            mime: displayInfo.mime,
            caption,
          },
          session.user.id,
        );
        revalidatePath(`/zones/${point.zoneId}`);
        return ok({ image });
      } catch (error) {
        // The row was not created: do not leave orphan files behind.
        await deleteFiles([displayKey, thumbKey]);
        throw error;
      }
    },
  );
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
