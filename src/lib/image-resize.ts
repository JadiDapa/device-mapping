/**
 * Browser-side image compression for camera-point uploads (no dependency:
 * createImageBitmap + canvas). Re-encoding through a canvas also drops all
 * EXIF metadata (including GPS); orientation is applied by the decoder.
 */
import { DISPLAY_MAX_PX, THUMB_MAX_PX } from "@/lib/validators/camera";

/** Scale (never up) so the longest side is at most `max`. */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function encode(
  bitmap: ImageBitmap,
  size: { width: number; height: number },
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("NO_CANVAS"));
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, quality),
    );
  return toBlob("image/webp").then(async (blob) => {
    // Some browsers cannot encode WebP and silently return PNG.
    if (blob && blob.type === "image/webp") return blob;
    const jpeg = await toBlob("image/jpeg");
    if (!jpeg) throw new Error("ENCODE_FAILED");
    return jpeg;
  });
}

export type CompressedImage = {
  display: Blob;
  thumb: Blob;
  width: number;
  height: number;
};

export async function compressImage(file: File): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const displaySize = fitWithin(bitmap.width, bitmap.height, DISPLAY_MAX_PX);
    const thumbSize = fitWithin(bitmap.width, bitmap.height, THUMB_MAX_PX);
    const display = await encode(bitmap, displaySize, 0.85);
    const thumb = await encode(bitmap, thumbSize, 0.8);
    return { display, thumb, ...displaySize };
  } finally {
    bitmap.close();
  }
}
