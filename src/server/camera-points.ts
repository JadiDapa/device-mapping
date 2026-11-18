/**
 * Camera capture positions: map points with an ordered set of uploaded images
 * (to help 3D mapping). Plain functions taking a `Database`; authorization,
 * revalidation and file I/O live in the Server Actions / Route Handlers.
 *
 * Image `position` is 0..n-1 without gaps per point. Every write that can
 * change it runs in ONE transaction that first locks the point row
 * `FOR UPDATE`; `unique (camera_point_id, position)` is DEFERRABLE INITIALLY
 * DEFERRED so intermediate duplicates are fine until COMMIT.
 */
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { cameraPointImages, cameraPoints, zones } from "@/db/schema";
import {
  MAX_IMAGES_PER_POINT,
  type CameraPointCreateInput,
  type CameraPointUpdateInput,
} from "@/lib/validators/camera";
import { ZoneNotFoundError } from "./zones";

export class CameraPointNotFoundError extends Error {
  constructor() {
    super("CAMERA_POINT_NOT_FOUND");
    this.name = "CameraPointNotFoundError";
  }
}

export class CameraImageNotFoundError extends Error {
  constructor() {
    super("CAMERA_IMAGE_NOT_FOUND");
    this.name = "CameraImageNotFoundError";
  }
}

export class ImageLimitError extends Error {
  constructor() {
    super("IMAGE_LIMIT");
    this.name = "ImageLimitError";
  }
}

export class ImageReorderMismatchError extends Error {
  constructor() {
    super("IMAGE_REORDER_MISMATCH");
    this.name = "ImageReorderMismatchError";
  }
}

export type CameraPoint = typeof cameraPoints.$inferSelect;
export type CameraImage = typeof cameraPointImages.$inferSelect;
export type CameraPointWithImages = CameraPoint & { images: CameraImage[] };

export type NewCameraImage = {
  /** Pre-generated so the storage keys can contain it. */
  id: string;
  displayKey: string;
  thumbKey: string;
  width: number;
  height: number;
  sizeBytes: number;
  mime: string;
  caption?: string | null;
};

function imageKeys(images: CameraImage[]): string[] {
  return images.flatMap((i) => [i.displayKey, i.thumbKey]);
}

async function withImages(
  db: Database,
  points: CameraPoint[],
): Promise<CameraPointWithImages[]> {
  if (points.length === 0) return [];
  const images = await db
    .select()
    .from(cameraPointImages)
    .where(
      inArray(
        cameraPointImages.cameraPointId,
        points.map((p) => p.id),
      ),
    )
    .orderBy(asc(cameraPointImages.position));
  const byPoint = new Map<string, CameraImage[]>();
  for (const img of images) {
    const list = byPoint.get(img.cameraPointId) ?? [];
    list.push(img);
    byPoint.set(img.cameraPointId, list);
  }
  return points.map((p) => ({ ...p, images: byPoint.get(p.id) ?? [] }));
}

export async function listZoneCameraPoints(
  db: Database,
  zoneId: string,
): Promise<CameraPointWithImages[]> {
  const points = await db
    .select()
    .from(cameraPoints)
    .where(eq(cameraPoints.zoneId, zoneId))
    .orderBy(asc(cameraPoints.createdAt));
  return withImages(db, points);
}

export async function getCameraPoint(
  db: Database,
  pointId: string,
): Promise<CameraPoint | null> {
  const [row] = await db
    .select()
    .from(cameraPoints)
    .where(eq(cameraPoints.id, pointId));
  return row ?? null;
}

export async function createCameraPoint(
  db: Database,
  input: CameraPointCreateInput,
  userId: string,
): Promise<CameraPointWithImages> {
  const [zone] = await db
    .select({ id: zones.id })
    .from(zones)
    .where(eq(zones.id, input.zoneId));
  if (!zone) throw new ZoneNotFoundError();
  const [row] = await db
    .insert(cameraPoints)
    .values({ ...input, updatedBy: userId })
    .returning();
  return { ...row!, images: [] };
}

export async function updateCameraPoint(
  db: Database,
  pointId: string,
  input: CameraPointUpdateInput,
  userId: string,
): Promise<CameraPoint> {
  const [row] = await db
    .update(cameraPoints)
    .set({ ...input, updatedBy: userId, updatedAt: new Date() })
    .where(eq(cameraPoints.id, pointId))
    .returning();
  if (!row) throw new CameraPointNotFoundError();
  return row;
}

export async function moveCameraPointPosition(
  db: Database,
  pointId: string,
  pos: { lat: number; lng: number },
  userId: string,
): Promise<CameraPoint> {
  const [row] = await db
    .update(cameraPoints)
    .set({ ...pos, updatedBy: userId, updatedAt: new Date() })
    .where(eq(cameraPoints.id, pointId))
    .returning();
  if (!row) throw new CameraPointNotFoundError();
  return row;
}

/** Deletes the point (images cascade); returns file keys to remove from disk. */
export async function deleteCameraPoint(
  db: Database,
  pointId: string,
): Promise<{ point: CameraPoint; fileKeys: string[] }> {
  return db.transaction(async (tx) => {
    const images = await tx
      .select()
      .from(cameraPointImages)
      .where(eq(cameraPointImages.cameraPointId, pointId));
    const [point] = await tx
      .delete(cameraPoints)
      .where(eq(cameraPoints.id, pointId))
      .returning();
    if (!point) throw new CameraPointNotFoundError();
    return { point, fileKeys: imageKeys(images) };
  });
}

/** File keys of every image in a zone (collect BEFORE deleting the zone). */
export async function listZoneImageKeys(
  db: Database,
  zoneId: string,
): Promise<string[]> {
  const rows = await db
    .select({
      displayKey: cameraPointImages.displayKey,
      thumbKey: cameraPointImages.thumbKey,
    })
    .from(cameraPointImages)
    .innerJoin(
      cameraPoints,
      eq(cameraPoints.id, cameraPointImages.cameraPointId),
    )
    .where(eq(cameraPoints.zoneId, zoneId));
  return rows.flatMap((r) => [r.displayKey, r.thumbKey]);
}

export async function addCameraImage(
  db: Database,
  pointId: string,
  input: NewCameraImage,
  userId: string,
): Promise<CameraImage> {
  return db.transaction(async (tx) => {
    const [point] = await tx
      .select({ id: cameraPoints.id })
      .from(cameraPoints)
      .where(eq(cameraPoints.id, pointId))
      .for("update");
    if (!point) throw new CameraPointNotFoundError();
    const [counted] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(cameraPointImages)
      .where(eq(cameraPointImages.cameraPointId, pointId));
    const n = counted?.n ?? 0;
    if (n >= MAX_IMAGES_PER_POINT) throw new ImageLimitError();
    const [row] = await tx
      .insert(cameraPointImages)
      .values({
        ...input,
        caption: input.caption ?? null,
        cameraPointId: pointId,
        position: n,
        uploadedBy: userId,
      })
      .returning();
    return row!;
  });
}

export async function updateImageCaption(
  db: Database,
  imageId: string,
  caption: string | null,
): Promise<CameraImage> {
  const [row] = await db
    .update(cameraPointImages)
    .set({ caption })
    .where(eq(cameraPointImages.id, imageId))
    .returning();
  if (!row) throw new CameraImageNotFoundError();
  return row;
}

/** `ids` must be exactly the point's current image ids, in the new order. */
export async function reorderImages(
  db: Database,
  pointId: string,
  ids: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    const [point] = await tx
      .select({ id: cameraPoints.id })
      .from(cameraPoints)
      .where(eq(cameraPoints.id, pointId))
      .for("update");
    if (!point) throw new CameraPointNotFoundError();
    const current = await tx
      .select({ id: cameraPointImages.id })
      .from(cameraPointImages)
      .where(eq(cameraPointImages.cameraPointId, pointId));
    const have = new Set(current.map((r) => r.id));
    if (
      ids.length !== have.size ||
      new Set(ids).size !== ids.length ||
      !ids.every((x) => have.has(x))
    ) {
      throw new ImageReorderMismatchError();
    }
    for (const [position, imageId] of ids.entries()) {
      await tx
        .update(cameraPointImages)
        .set({ position })
        .where(eq(cameraPointImages.id, imageId));
    }
  });
}

/** Deletes one image and closes the gap; returns its file keys. */
export async function deleteCameraImage(
  db: Database,
  imageId: string,
): Promise<{ image: CameraImage; fileKeys: string[] }> {
  return db.transaction(async (tx) => {
    const [found] = await tx
      .select()
      .from(cameraPointImages)
      .where(eq(cameraPointImages.id, imageId));
    if (!found) throw new CameraImageNotFoundError();
    await tx
      .select({ id: cameraPoints.id })
      .from(cameraPoints)
      .where(eq(cameraPoints.id, found.cameraPointId))
      .for("update");
    await tx
      .delete(cameraPointImages)
      .where(eq(cameraPointImages.id, imageId));
    await tx
      .update(cameraPointImages)
      .set({ position: sql`${cameraPointImages.position} - 1` })
      .where(
        and(
          eq(cameraPointImages.cameraPointId, found.cameraPointId),
          gt(cameraPointImages.position, found.position),
        ),
      );
    return { image: found, fileKeys: imageKeys([found]) };
  });
}

export async function getCameraImage(
  db: Database,
  imageId: string,
): Promise<CameraImage | null> {
  const [row] = await db
    .select()
    .from(cameraPointImages)
    .where(eq(cameraPointImages.id, imageId));
  return row ?? null;
}
