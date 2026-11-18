/**
 * Export renderer (PRD F7): opens an internal `/print/*` page in headless
 * Chromium, waits for the page's `window.__MAP_READY__` flag (set after the
 * tile layers finished loading and the markers are rendered), then takes a
 * PNG screenshot or an A4-landscape PDF.
 *
 * One browser is kept per process (launched lazily, relaunched if it dies);
 * each render gets its own context. At most MAX_CONCURRENT renders run at a
 * time so a few simultaneous exports can't exhaust memory.
 */
import { chromium, type Browser } from "playwright";

export const PNG_SIZE = { width: 1600, height: 1000 } as const;
/** A4 landscape minus 10 mm margins, in CSS px at 96 dpi (277 x 190 mm). */
const PDF_VIEWPORT = { width: 1047, height: 718 } as const;
const READY_TIMEOUT_MS = 45_000;
const MAX_CONCURRENT = 2;

export class ExportRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportRenderError";
  }
}

declare global {
  var __exportBrowser: Promise<Browser> | undefined;
}

function launchArgs(): string[] {
  // Containers usually can't use Chromium's sandbox (no user namespaces).
  const args = ["--disable-dev-shm-usage"];
  if (process.env.EXPORT_NO_SANDBOX === "1") args.push("--no-sandbox");
  return args;
}

async function getBrowser(): Promise<Browser> {
  if (!globalThis.__exportBrowser) {
    const launching = chromium
      .launch({ headless: true, args: launchArgs() })
      .then((browser) => {
        browser.on("disconnected", () => {
          if (globalThis.__exportBrowser === launching) {
            globalThis.__exportBrowser = undefined;
          }
        });
        return browser;
      })
      .catch((error: unknown) => {
        globalThis.__exportBrowser = undefined;
        throw error;
      });
    globalThis.__exportBrowser = launching;
  }
  return globalThis.__exportBrowser;
}

let running = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

async function withPage<T>(
  url: string,
  viewport: { width: number; height: number },
  media: "screen" | "print",
  fn: (page: import("playwright").Page) => Promise<T>,
): Promise<T> {
  return withSlot(async () => {
    const browser = await getBrowser();
    const context = await browser.newContext({
      viewport,
      colorScheme: "light",
      deviceScaleFactor: 1,
    });
    try {
      const page = await context.newPage();
      await page.emulateMedia({ media });
      const response = await page.goto(url, { waitUntil: "load" });
      if (!response || !response.ok()) {
        throw new ExportRenderError(
          `Print page responded ${response?.status() ?? "no response"}`,
        );
      }
      try {
        await page.waitForFunction(() => window.__MAP_READY__ === true, null, {
          timeout: READY_TIMEOUT_MS,
        });
      } catch {
        throw new ExportRenderError("Timed out waiting for the map to render");
      }
      return await fn(page);
    } finally {
      await context.close();
    }
  });
}

/** PNG of `/print/zones/[id]` (fixed 1600 x 1000 canvas). */
export function renderPng(url: string): Promise<Buffer> {
  return withPage(url, PNG_SIZE, "screen", (page) =>
    page.screenshot({ type: "png" }),
  );
}

/** A4-landscape PDF of `/print/report`. */
export function renderPdf(url: string): Promise<Buffer> {
  return withPage(url, PDF_VIEWPORT, "print", (page) =>
    page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
    }),
  );
}
