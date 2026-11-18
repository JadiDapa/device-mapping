import { id } from "@/lib/i18n/id";

export type GeoErrorKind =
  "denied" | "unavailable" | "timeout" | "insecure" | "unsupported";

export class GeoError extends Error {
  constructor(readonly kind: GeoErrorKind) {
    super(`GEO_${kind.toUpperCase()}`);
    this.name = "GeoError";
  }
}

export type GeoPosition = { lat: number; lng: number; accuracy: number };

/** W3C GeolocationPositionError.code → our error kind. */
export function geoKindFromCode(code: number): GeoErrorKind {
  if (code === 1) return "denied";
  if (code === 3) return "timeout";
  return "unavailable";
}

export function geoErrorMessage(error: unknown): string {
  const kind = error instanceof GeoError ? error.kind : "unavailable";
  return id.geo[kind];
}

/**
 * Current browser position as a Promise. Browsers only expose geolocation in
 * a secure context (HTTPS or localhost), so a plain-HTTP LAN address yields
 * an "insecure" error with a clear message instead of a silent failure.
 */
export function locate(timeoutMs = 15_000): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      reject(new GeoError("unsupported"));
      return;
    }
    if (window.isSecureContext === false) {
      reject(new GeoError("insecure"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }),
      (e) => reject(new GeoError(geoKindFromCode(e.code))),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 10_000 },
    );
  });
}
