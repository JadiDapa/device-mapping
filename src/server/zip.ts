/**
 * Minimal streaming ZIP writer (store method, no compression: the photos are
 * already compressed). Each `add()` returns the bytes to append to the output;
 * `finish()` returns the central directory + end record. Names are UTF-8.
 * Plain ZIP (not ZIP64): up to 65535 entries and 4 GB, enforced below.
 */
import { crc32 } from "node:zlib";

const LIMIT = 0xffffffff;

function dosDateTime(d: Date): { time: number; date: number } {
  const year = Math.max(d.getFullYear(), 1980);
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export class ZipBuilder {
  private offset = 0;
  private central: Buffer[] = [];

  add(name: string, data: Uint8Array, modified: Date = new Date()): Buffer {
    const nameBytes = Buffer.from(name, "utf8");
    if (this.central.length >= 0xffff || data.length > LIMIT) {
      throw new Error("ZIP_TOO_LARGE");
    }
    const { time, date } = dosDateTime(modified);
    const crc = crc32(data);
    const flags = 0x0800; // UTF-8 names

    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(0, 8); // store
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    nameBytes.copy(local, 30);

    const entry = Buffer.alloc(46 + nameBytes.length);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(flags, 8);
    entry.writeUInt16LE(0, 10);
    entry.writeUInt16LE(time, 12);
    entry.writeUInt16LE(date, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    // extra, comment, disk, internal/external attributes stay 0
    entry.writeUInt32LE(this.offset, 42);
    nameBytes.copy(entry, 46);
    this.central.push(entry);

    const chunk = Buffer.concat([local, data]);
    this.offset += chunk.length;
    if (this.offset > LIMIT) throw new Error("ZIP_TOO_LARGE");
    return chunk;
  }

  finish(): Buffer {
    const directory = Buffer.concat(this.central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(this.central.length, 8);
    end.writeUInt16LE(this.central.length, 10);
    end.writeUInt32LE(directory.length, 12);
    end.writeUInt32LE(this.offset, 16);
    return Buffer.concat([directory, end]);
  }
}
