/**
 * Short-lived signed token that lets the headless browser open the internal
 * `/print/*` pages without a session (PRD F7). HMAC-SHA256 over a JSON
 * payload `{ zones, exp }`; the key is derived from BETTER_AUTH_SECRET with a
 * purpose label so it can't be replayed as anything else. Pure functions with
 * the secret passed in, so they are unit-testable.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const EXPORT_TOKEN_TTL_MS = 120_000;

export type ExportTokenPayload = { zones: string[]; exp: number };

function signingKey(secret: string): Buffer {
  return createHmac("sha256", secret).update("device-mapper:export").digest();
}

function sign(body: string, secret: string): Buffer {
  return createHmac("sha256", signingKey(secret)).update(body).digest();
}

export function signExportToken(opts: {
  zones: string[];
  secret: string;
  now?: number;
  ttlMs?: number;
}): string {
  const payload: ExportTokenPayload = {
    zones: [...opts.zones],
    exp: (opts.now ?? Date.now()) + (opts.ttlMs ?? EXPORT_TOKEN_TTL_MS),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, opts.secret).toString("base64url")}`;
}

/** The payload when the signature is valid and not expired, else null. */
export function verifyExportToken(
  token: string | null | undefined,
  secret: string,
  now: number = Date.now(),
): ExportTokenPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts as [string, string];

  const expected = sign(body, secret);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Partial<ExportTokenPayload>;
    if (
      !Array.isArray(payload.zones) ||
      !payload.zones.every((z) => typeof z === "string") ||
      typeof payload.exp !== "number" ||
      payload.exp <= now
    ) {
      return null;
    }
    return { zones: payload.zones, exp: payload.exp };
  } catch {
    return null;
  }
}

/** Valid token that covers EVERY requested zone (and at least one). */
export function tokenCoversZones(
  payload: ExportTokenPayload | null,
  zoneIds: string[],
): boolean {
  return (
    payload !== null &&
    zoneIds.length > 0 &&
    zoneIds.every((z) => payload.zones.includes(z))
  );
}
