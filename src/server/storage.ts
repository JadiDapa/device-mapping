/**
 * File storage for uploaded images, addressed by an opaque `key` like
 * `camera/<pointId>/<imageId>-display.webp`.
 *
 * Two backends behind one API:
 *  - Neon Object Storage (S3-compatible) when AWS_ENDPOINT_URL_S3 is set —
 *    bucket STORAGE_BUCKET, credentials from the standard AWS_* env vars.
 *  - Local disk under UPLOADS_DIR otherwise (dev/tests). Passing an explicit
 *    `base` directory always selects local disk.
 *
 * Keys are validated against a strict pattern on both backends; on disk the
 * resolved path must also stay inside the base directory, so a hostile key
 * can never escape it.
 */
import { createReadStream } from "node:fs";
import {
  mkdir,
  readFile,
  rename,
  rm,
  rmdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getEnv } from "@/lib/env";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const KEY_RE = new RegExp(
  `^camera/${UUID}/${UUID}-(display|thumb)\\.(webp|jpg|png)$`,
);

const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  png: "image/png",
};

export function isValidKey(key: string): boolean {
  return KEY_RE.test(key);
}

export function makeKey(
  pointId: string,
  imageId: string,
  kind: "display" | "thumb",
  ext: "webp" | "jpg" | "png",
): string {
  return `camera/${pointId}/${imageId}-${kind}.${ext}`;
}

export function contentTypeForKey(key: string): string {
  return (
    CONTENT_TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream"
  );
}

declare global {
  var __appS3: S3Client | undefined;
}

/** Bucket name when the S3 backend is active (and no local `base` forced). */
function s3Bucket(base?: string): string | null {
  if (base) return null;
  const env = getEnv();
  return env.AWS_ENDPOINT_URL_S3 ? env.STORAGE_BUCKET : null;
}

function s3(): S3Client {
  // Endpoint, region and credentials come from the AWS_* env vars.
  // Neon requires path-style addressing.
  globalThis.__appS3 ??= new S3Client({ forcePathStyle: true });
  return globalThis.__appS3;
}

function baseDir(override?: string): string {
  return path.resolve(override ?? getEnv().UPLOADS_DIR);
}

/** Absolute path for a key, or null when the key is unsafe. */
export function resolveKey(key: string, base?: string): string | null {
  if (!isValidKey(key)) return null;
  const root = baseDir(base);
  const full = path.resolve(root, key);
  return full.startsWith(root + path.sep) ? full : null;
}

export async function saveFile(
  key: string,
  bytes: Uint8Array,
  base?: string,
): Promise<void> {
  const bucket = s3Bucket(base);
  if (bucket) {
    if (!isValidKey(key)) throw new Error("INVALID_STORAGE_KEY");
    await s3().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: contentTypeForKey(key),
        CacheControl: "private, max-age=31536000, immutable",
      }),
    );
    return;
  }
  const full = resolveKey(key, base);
  if (!full) throw new Error("INVALID_STORAGE_KEY");
  await mkdir(path.dirname(full), { recursive: true });
  const tmp = `${full}.${process.pid}.tmp`;
  await writeFile(tmp, bytes);
  await rename(tmp, full);
}

/** Best-effort: a failed delete must never fail the request that triggered it. */
export async function deleteFiles(
  keys: string[],
  base?: string,
): Promise<void> {
  const bucket = s3Bucket(base);
  if (bucket) {
    const valid = keys.filter(isValidKey);
    if (valid.length === 0) return;
    try {
      const res = await s3().send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: valid.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      for (const err of res.Errors ?? []) {
        console.error("[storage] could not delete", err.Key, err.Message);
      }
    } catch (error) {
      console.error("[storage] could not delete", valid, error);
    }
    return;
  }
  await Promise.all(
    keys.map(async (key) => {
      const full = resolveKey(key, base);
      if (!full) return;
      try {
        await rm(full, { force: true });
        // Drop the point's folder once empty (rmdir fails while it is not).
        await rmdir(path.dirname(full)).catch(() => {});
      } catch (error) {
        console.error("[storage] could not delete", key, error);
      }
    }),
  );
}

/** Whole file as bytes, or null when the key is unsafe or the file is gone. */
export async function readFileBytes(
  key: string,
  base?: string,
): Promise<Buffer | null> {
  const bucket = s3Bucket(base);
  if (bucket) {
    if (!isValidKey(key)) return null;
    try {
      const res = await s3().send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      return res.Body
        ? Buffer.from(await res.Body.transformToByteArray())
        : null;
    } catch {
      return null;
    }
  }
  const full = resolveKey(key, base);
  if (!full) return null;
  try {
    return await readFile(full);
  } catch {
    return null;
  }
}

export async function openFile(
  key: string,
  base?: string,
): Promise<{ stream: ReadableStream; size: number } | null> {
  const bucket = s3Bucket(base);
  if (bucket) {
    if (!isValidKey(key)) return null;
    try {
      const res = await s3().send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      if (!res.Body || res.ContentLength === undefined) return null;
      return {
        stream: res.Body.transformToWebStream(),
        size: res.ContentLength,
      };
    } catch {
      return null;
    }
  }
  const full = resolveKey(key, base);
  if (!full) return null;
  try {
    const info = await stat(full);
    if (!info.isFile()) return null;
    const stream = Readable.toWeb(createReadStream(full)) as ReadableStream;
    return { stream, size: info.size };
  } catch {
    return null;
  }
}
