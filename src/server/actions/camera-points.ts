"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/auth";
import {
  cameraPointCreateSchema,
  cameraPointMoveSchema,
  cameraPointUpdateSchema,
  imageCaptionSchema,
  imageReorderSchema,
} from "@/lib/validators/camera";
import {
  createCameraPoint,
  deleteCameraImage,
  deleteCameraPoint,
  moveCameraPointPosition,
  reorderImages,
  updateCameraPoint,
  updateImageCaption,
  type CameraImage,
  type CameraPoint,
  type CameraPointWithImages,
} from "@/server/camera-points";
import { deleteFiles } from "@/server/storage";
import { ok, runAction, type ActionResult } from "./result";

// Every mutation: requireAdmin() first (guest => 403), then re-validate with
// the same Zod schema the client form used. Image UPLOAD is a Route Handler
// (src/app/api/camera-points/[id]/images/route.ts); everything else is here.

const uuid = z.string().uuid();

function revalidateZone(zoneId?: string) {
  revalidatePath("/");
  if (zoneId) revalidatePath(`/zones/${zoneId}`);
  else revalidatePath("/zones/[id]", "page");
}

export async function createCameraPointAction(
  input: unknown,
): Promise<ActionResult<{ point: CameraPointWithImages }>> {
  return runAction(async () => {
    const session = await requireAdmin();
    const parsed = cameraPointCreateSchema.parse(input);
    const point = await createCameraPoint(getDb(), parsed, session.user.id);
    revalidateZone(point.zoneId);
    return ok({ point });
  });
}

export async function updateCameraPointAction(
  pointId: string,
  input: unknown,
): Promise<ActionResult<{ point: CameraPoint }>> {
  return runAction(async () => {
    const session = await requireAdmin();
    const parsed = cameraPointUpdateSchema.parse(input);
    const point = await updateCameraPoint(
      getDb(),
      uuid.parse(pointId),
      parsed,
      session.user.id,
    );
    revalidateZone(point.zoneId);
    return ok({ point });
  });
}

export async function moveCameraPointPositionAction(
  pointId: string,
  input: unknown,
): Promise<ActionResult<{ point: CameraPoint }>> {
  return runAction(async () => {
    const session = await requireAdmin();
    const parsed = cameraPointMoveSchema.parse(input);
    const point = await moveCameraPointPosition(
      getDb(),
      uuid.parse(pointId),
      parsed,
      session.user.id,
    );
    revalidateZone(point.zoneId);
    return ok({ point });
  });
}

export async function deleteCameraPointAction(
  pointId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const { point, fileKeys } = await deleteCameraPoint(
      getDb(),
      uuid.parse(pointId),
    );
    await deleteFiles(fileKeys);
    revalidateZone(point.zoneId);
    return ok();
  });
}

export async function updateImageCaptionAction(
  imageId: string,
  input: unknown,
): Promise<ActionResult<{ image: CameraImage }>> {
  return runAction(async () => {
    await requireAdmin();
    const parsed = imageCaptionSchema.parse(input);
    const image = await updateImageCaption(
      getDb(),
      uuid.parse(imageId),
      parsed.caption,
    );
    revalidateZone();
    return ok({ image });
  });
}

export async function reorderImagesAction(
  pointId: string,
  orderedImageIds: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await reorderImages(
      getDb(),
      uuid.parse(pointId),
      imageReorderSchema.parse(orderedImageIds),
    );
    revalidateZone();
    return ok();
  });
}

export async function deleteCameraImageAction(
  imageId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const { fileKeys } = await deleteCameraImage(
      getDb(),
      uuid.parse(imageId),
    );
    await deleteFiles(fileKeys);
    revalidateZone();
    return ok();
  });
}
