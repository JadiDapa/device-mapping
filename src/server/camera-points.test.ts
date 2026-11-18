import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/db";
import { cameraPointImages, user, zones } from "@/db/schema";
import { MAX_IMAGES_PER_POINT } from "@/lib/validators/camera";
import {
  addCameraImage,
  CameraPointNotFoundError,
  createCameraPoint,
  deleteCameraImage,
  deleteCameraPoint,
  ImageLimitError,
  ImageReorderMismatchError,
  listZoneCameraPoints,
  listZoneImageKeys,
  reorderImages,
  updateImageCaption,
} from "./camera-points";

describe("camera points data layer", () => {
  let t: TestDb;
  let userId: string;
  let zoneId: string;

  beforeAll(async () => {
    t = await createTestDb();
    const [u] = await t.db
      .insert(user)
      .values({ name: "Budi", email: "budi@example.com", role: "admin" })
      .returning();
    userId = u!.id;
  });

  beforeEach(async () => {
    await t.db.delete(zones);
    const [z] = await t.db.insert(zones).values({ name: "A" }).returning();
    zoneId = z!.id;
  });

  afterAll(async () => {
    await t.close();
  });

  const newPoint = () =>
    createCameraPoint(
      t.db,
      { zoneId, name: "Lobby", notes: null, lat: -2.9, lng: 104.7 },
      userId,
    );

  let counter = 0;
  async function addImage(pointId: string) {
    counter += 1;
    const imageId = crypto.randomUUID();
    return addCameraImage(
      t.db,
      pointId,
      {
        id: imageId,
        displayKey: `camera/${pointId}/${imageId}-display.webp`,
        thumbKey: `camera/${pointId}/${imageId}-thumb.webp`,
        width: 100 + counter,
        height: 80,
        sizeBytes: 1000,
        mime: "image/webp",
      },
      userId,
    );
  }

  async function positions(pointId: string) {
    const rows = await t.db
      .select()
      .from(cameraPointImages)
      .where(eq(cameraPointImages.cameraPointId, pointId))
      .orderBy(asc(cameraPointImages.position));
    return rows.map((r) => ({ id: r.id, position: r.position }));
  }

  it("appends images at the end with positions 0..n-1", async () => {
    const p = await newPoint();
    const a = await addImage(p.id);
    const b = await addImage(p.id);
    const c = await addImage(p.id);
    expect([a.position, b.position, c.position]).toEqual([0, 1, 2]);
    const [listed] = await listZoneCameraPoints(t.db, zoneId);
    expect(listed!.images.map((i) => i.id)).toEqual([a.id, b.id, c.id]);
  });

  it("enforces the per-point image limit", async () => {
    const p = await newPoint();
    for (let i = 0; i < MAX_IMAGES_PER_POINT; i++) await addImage(p.id);
    await expect(addImage(p.id)).rejects.toBeInstanceOf(ImageLimitError);
  });

  it("reorders without gaps and rejects a mismatched id list", async () => {
    const p = await newPoint();
    const a = await addImage(p.id);
    const b = await addImage(p.id);
    const c = await addImage(p.id);
    await reorderImages(t.db, p.id, [c.id, a.id, b.id]);
    expect(await positions(p.id)).toEqual([
      { id: c.id, position: 0 },
      { id: a.id, position: 1 },
      { id: b.id, position: 2 },
    ]);
    await expect(
      reorderImages(t.db, p.id, [a.id, b.id]),
    ).rejects.toBeInstanceOf(ImageReorderMismatchError);
  });

  it("closes the gap when an image is deleted", async () => {
    const p = await newPoint();
    const a = await addImage(p.id);
    const b = await addImage(p.id);
    const c = await addImage(p.id);
    const { fileKeys } = await deleteCameraImage(t.db, b.id);
    expect(fileKeys).toEqual([b.displayKey, b.thumbKey]);
    expect(await positions(p.id)).toEqual([
      { id: a.id, position: 0 },
      { id: c.id, position: 1 },
    ]);
  });

  it("updates a caption", async () => {
    const p = await newPoint();
    const a = await addImage(p.id);
    const row = await updateImageCaption(t.db, a.id, "Sudut barat");
    expect(row.caption).toBe("Sudut barat");
  });

  it("deleting a point cascades images and returns their file keys", async () => {
    const p = await newPoint();
    const a = await addImage(p.id);
    const b = await addImage(p.id);
    expect(await listZoneImageKeys(t.db, zoneId)).toHaveLength(4);
    const { fileKeys } = await deleteCameraPoint(t.db, p.id);
    expect(fileKeys.sort()).toEqual(
      [a.displayKey, a.thumbKey, b.displayKey, b.thumbKey].sort(),
    );
    expect(await positions(p.id)).toEqual([]);
    await expect(deleteCameraPoint(t.db, p.id)).rejects.toBeInstanceOf(
      CameraPointNotFoundError,
    );
  });
});
