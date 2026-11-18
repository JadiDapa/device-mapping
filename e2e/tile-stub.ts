import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TILE_FIXTURE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "tile.png",
);

const FALLBACK_HOST = "server.arcgisonline.com";

function tileHost(): string {
  const template = process.env.NEXT_PUBLIC_TILE_URL;
  if (template) {
    try {
      return new URL(template.replace(/\{[a-z]+\}/g, "0")).host;
    } catch {
      // fall through to the default host
    }
  }
  return FALLBACK_HOST;
}

type Routable = {
  route: (
    url: (url: URL) => boolean,
    handler: (route: {
      fulfill: (r: {
        status: number;
        contentType: string;
        body: Buffer;
      }) => Promise<void>;
    }) => Promise<void> | void,
  ) => Promise<unknown>;
};

/**
 * Fulfil every tile request (configured NEXT_PUBLIC_TILE_URL host, default
 * Esri) with a neutral local PNG so screenshots/tests don't hit the network.
 * Works for a Page or a BrowserContext. Browser-side only: it cannot affect
 * the server-side Chromium used by the export renderer.
 */
export async function stubTiles(target: Routable): Promise<void> {
  const host = tileHost();
  const body = readFileSync(TILE_FIXTURE_PATH);
  await target.route(
    (url) => url.host === host,
    (route) => route.fulfill({ status: 200, contentType: "image/png", body }),
  );
}
