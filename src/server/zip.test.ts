import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { ZipBuilder } from "./zip";

/** Tiny reader of what ZipBuilder writes (via the central directory). */
function readZip(zip: Buffer) {
  const end = zip.length - 22;
  expect(zip.readUInt32LE(end)).toBe(0x06054b50);
  const count = zip.readUInt16LE(end + 10);
  let p = zip.readUInt32LE(end + 16);
  const files: { name: string; data: Buffer; crc: number }[] = [];
  for (let i = 0; i < count; i++) {
    expect(zip.readUInt32LE(p)).toBe(0x02014b50);
    const crc = zip.readUInt32LE(p + 16);
    const size = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const local = zip.readUInt32LE(p + 42);
    const name = zip.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    expect(zip.readUInt32LE(local)).toBe(0x04034b50);
    const start = local + 30 + zip.readUInt16LE(local + 26);
    files.push({ name, data: zip.subarray(start, start + size), crc });
    p += 46 + nameLen;
  }
  return files;
}

describe("ZipBuilder", () => {
  it("round-trips entries with UTF-8 names and correct CRCs", () => {
    const zip = new ZipBuilder();
    const a = Buffer.from("hello");
    const b = Buffer.from([0, 1, 2, 3, 250]);
    const out = Buffer.concat([
      zip.add("zona/01_Lobby/a.txt", a),
      zip.add("zona/é.bin", b),
      zip.finish(),
    ]);
    const files = readZip(out);
    expect(files.map((f) => f.name)).toEqual([
      "zona/01_Lobby/a.txt",
      "zona/é.bin",
    ]);
    expect(files[0]!.data.equals(a)).toBe(true);
    expect(files[1]!.data.equals(b)).toBe(true);
    expect(files[0]!.crc).toBe(crc32(a));
  });

  it("writes an empty archive", () => {
    const out = new ZipBuilder().finish();
    expect(out.length).toBe(22);
    expect(readZip(out)).toEqual([]);
  });
});
