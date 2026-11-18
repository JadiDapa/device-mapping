/**
 * Local-disk file storage for uploaded images. Files live under UPLOADS_DIR
 * (a Docker volume in production) and are addressed by an opaque `key` like
 * `camera/<pointId>/<imageId>-display.webp`. Keys are validated against a
 * strict pattern and the resolved path must stay inside the base directory,
 * so a hostile key can never escape it.
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
