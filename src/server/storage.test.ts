import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  deleteFiles,
  isValidKey,
  makeKey,
  openFile,
  resolveKey,
  saveFile,
} from "./storage";

const P = "11111111-1111-4111-8111-111111111111";
const I = "22222222-2222-4222-8222-222222222222";

describe("storage", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "uploads-"));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("accepts only well-formed keys", () => {
    expect(isValidKey(makeKey(P, I, "display", "webp"))).toBe(true);
    expect(isValidKey("../../etc/passwd")).toBe(false);
    expect(isValidKey(`camera/${P}/../x-display.webp`)).toBe(false);
    expect(resolveKey("camera/a/b-display.webp", dir)).toBeNull();
  });

  it("saves, reads and deletes a file", async () => {
    const key = makeKey(P, I, "thumb", "webp");
    await saveFile(key, Uint8Array.from([1, 2, 3]), dir);
    const opened = await openFile(key, dir);
    expect(opened?.size).toBe(3);
    await opened?.stream.cancel();
    await deleteFiles([key], dir);
    expect(await openFile(key, dir)).toBeNull();
    expect(await readdir(path.join(dir, "camera"))).toEqual([]);
  });
});
