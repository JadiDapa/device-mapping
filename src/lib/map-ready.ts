/**
 * Readiness handshake with the export renderer (PRD F7): the print pages set
 * `window.__MAP_READY__ = true` once every map on the page has finished
 * loading its tiles and has rendered its markers. The page declares how many
 * maps to wait for; each map reports in when it is ready.
 */
declare global {
  interface Window {
    __MAP_READY__?: boolean;
  }
}

const ready = new Set<string>();
let expected: number | null = null;

function check() {
  if (typeof window === "undefined") return;
  if (expected !== null && ready.size >= expected) window.__MAP_READY__ = true;
}

/** Number of maps on this print page (0 => ready immediately). */
export function expectMaps(count: number): void {
  expected = count;
  check();
}

export function markMapReady(key: string): void {
  ready.add(key);
  check();
}

/** For tests / client-side navigation between print pages. */
export function resetMapReady(): void {
  ready.clear();
  expected = null;
  if (typeof window !== "undefined") window.__MAP_READY__ = false;
}
