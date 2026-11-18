/**
 * ZIP of every camera photo of one zone (F9), streamed so a large zone never
 * sits in memory all at once (one photo at a time). Naming convention and
 * manifest: src/lib/camera-zip-names.ts.
 */
import type { Database } from "@/db";
import {
  MANIFEST_HEADER,
  MANIFEST_NAME,
  photoFileName,
  pointFolderName,
  slugify,
  toCsv,
} from "@/lib/camera-zip-names";
import { listZoneCameraPoints } from "./camera-points";
import { readFileBytes } from "./storage";
import { ZoneNotFoundError, getZone } from "./zones";
import { ZipBuilder } from "./zip";

export class NoPhotosError extends Error {
  constructor() {
    super("NO_PHOTOS");
    this.name = "NoPhotosError";
  }
}

type PlannedPhoto = {
  path: string;
  key: string;
  row: (string | number | null)[];
};

export async function openCameraZip(
  db: Database,
  zoneId: string,
): Promise<{ zoneName: string; stream: ReadableStream<Uint8Array> }> {
  const zone = await getZone(db, zoneId);
  if (!zone) throw new ZoneNotFoundError();
  const points = await listZoneCameraPoints(db, zoneId);
  const root = slugify(zone.name, 60, "zona");

  const plan: PlannedPhoto[] = [];
  points.forEach((point, i) => {
    const pointNo = i + 1;
    const folder = pointFolderName(pointNo, points.length, point.name);
    for (const image of point.images) {
      const photoNo = image.position + 1;
      const ext = image.displayKey.split(".").pop() ?? "bin";
      const file = photoFileName({
        folder,
        photoNo,
        lat: point.lat,
        lng: point.lng,
        ext,
      });
      plan.push({
        path: `${root}/${folder}/${file}`,
        key: image.displayKey,
        row: [
          `${folder}/${file}`,
          pointNo,
          point.name,
          point.lat,
          point.lng,
          photoNo,
          image.caption,
          image.width,
          image.height,
          image.sizeBytes,
        ],
      });
    }
  });
  if (plan.length === 0) throw new NoPhotosError();

  async function* chunks(): AsyncGenerator<Uint8Array> {
    const zip = new ZipBuilder();
    const rows: PlannedPhoto["row"][] = [];
    for (const item of plan) {
      const bytes = await readFileBytes(item.key);
      if (!bytes) {
        // The row exists but the file is gone: skip it, keep the rest.
        console.error("[camera-zip] missing file", item.key);
        continue;
      }
      rows.push(item.row);
      yield zip.add(item.path, bytes);
    }
    const csv = toCsv([[...MANIFEST_HEADER], ...rows]);
    yield zip.add(`${root}/${MANIFEST_NAME}`, Buffer.from(csv, "utf8"));
    yield zip.finish();
  }

  const it = chunks();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await it.next();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      await it.return(undefined);
    },
  });
  return { zoneName: zone.name, stream };
}
