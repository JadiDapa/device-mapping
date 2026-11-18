/**
 * Detect JPEG / PNG / WebP from the file's magic bytes (never trust the
 * client's Content-Type or file name) and read the pixel size from the header.
 */
export type SniffedImage = {
  mime: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
  width: number;
  height: number;
};

const u16be = (b: Uint8Array, o: number) => (b[o]! << 8) | b[o + 1]!;
const u32be = (b: Uint8Array, o: number) =>
  ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;
const u16le = (b: Uint8Array, o: number) => b[o]! | (b[o + 1]! << 8);
const u24le = (b: Uint8Array, o: number) =>
  b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16);
const ascii = (b: Uint8Array, o: number, n: number) =>
  String.fromCharCode(...b.subarray(o, o + n));

function sniffPng(b: Uint8Array): SniffedImage | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 24 || !sig.every((v, i) => b[i] === v)) return null;
  if (ascii(b, 12, 4) !== "IHDR") return null;
  return {
    mime: "image/png",
    ext: "png",
    width: u32be(b, 16),
    height: u32be(b, 20),
  };
}

function sniffJpeg(b: Uint8Array): SniffedImage | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let o = 2;
  while (o + 9 < b.length) {
    if (b[o] !== 0xff) {
      o += 1;
      continue;
    }
    const marker = b[o + 1]!;
    if (marker === 0xff) {
      o += 1;
      continue;
    }
    // Standalone markers carry no length.
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      o += 2;
      continue;
    }
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      return {
        mime: "image/jpeg",
        ext: "jpg",
        height: u16be(b, o + 5),
        width: u16be(b, o + 7),
      };
    }
    o += 2 + u16be(b, o + 2);
  }
  return null;
}

function sniffWebp(b: Uint8Array): SniffedImage | null {
  if (b.length < 30 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP")
    return null;
  const kind = ascii(b, 12, 4);
  let width: number;
  let height: number;
  if (kind === "VP8X") {
    width = u24le(b, 24) + 1;
    height = u24le(b, 27) + 1;
  } else if (kind === "VP8 ") {
    width = u16le(b, 26) & 0x3fff;
    height = u16le(b, 28) & 0x3fff;
  } else if (kind === "VP8L") {
    if (b[20] !== 0x2f) return null;
    width = 1 + ((b[21]! | (b[22]! << 8)) & 0x3fff);
    height =
      1 + (((b[22]! >> 6) | (b[23]! << 2) | ((b[24]! & 0xf) << 10)) & 0x3fff);
  } else {
    return null;
  }
  return { mime: "image/webp", ext: "webp", width, height };
}

export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  const found = sniffPng(bytes) ?? sniffJpeg(bytes) ?? sniffWebp(bytes);
  if (!found || found.width < 1 || found.height < 1) return null;
  return found;
}
