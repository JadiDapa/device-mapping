import { describe, expect, it } from "vitest";
import {
  EXPORT_TOKEN_TTL_MS,
  signExportToken,
  tokenCoversZones,
  verifyExportToken,
} from "./token";

const secret = "s".repeat(32);
const now = 1_700_000_000_000;

describe("export token", () => {
  it("verifies a fresh token and returns its zones", () => {
    const token = signExportToken({ zones: ["a", "b"], secret, now });
    expect(verifyExportToken(token, secret, now + 1000)).toEqual({
      zones: ["a", "b"],
      exp: now + EXPORT_TOKEN_TTL_MS,
    });
  });

  it("expires", () => {
    const token = signExportToken({ zones: ["a"], secret, now });
    expect(
      verifyExportToken(token, secret, now + EXPORT_TOKEN_TTL_MS - 1),
    ).not.toBeNull();
    expect(
      verifyExportToken(token, secret, now + EXPORT_TOKEN_TTL_MS),
    ).toBeNull();
  });

  it("rejects a different secret", () => {
    const token = signExportToken({ zones: ["a"], secret, now });
    expect(verifyExportToken(token, "x".repeat(32), now)).toBeNull();
  });

  it("rejects a tampered payload (zones swapped, signature kept)", () => {
    const token = signExportToken({ zones: ["a"], secret, now });
    const [, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ zones: ["a", "other"], exp: now + 10_000_000 }),
    ).toString("base64url");
    expect(verifyExportToken(`${forged}.${sig}`, secret, now)).toBeNull();
  });

  it("rejects malformed input", () => {
    for (const bad of [null, undefined, "", "abc", "a.b.c", "x.y"]) {
      expect(verifyExportToken(bad, secret, now)).toBeNull();
    }
  });
});

describe("tokenCoversZones", () => {
  const payload = { zones: ["a", "b"], exp: now + 1 };

  it("requires every requested zone", () => {
    expect(tokenCoversZones(payload, ["a"])).toBe(true);
    expect(tokenCoversZones(payload, ["a", "b"])).toBe(true);
    expect(tokenCoversZones(payload, ["a", "c"])).toBe(false);
  });

  it("is false for no token or no zones", () => {
    expect(tokenCoversZones(null, ["a"])).toBe(false);
    expect(tokenCoversZones(payload, [])).toBe(false);
  });
});
