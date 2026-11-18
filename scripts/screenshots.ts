/**
 * Visual QA screenshots (PRD M8 section 6.3).
 *   npm run screenshots -- [--only=login,dashboard] [--base=http://localhost:3000]
 *                          [--themes=light,dark] [--sizes=desktop,mobile]
 * Screens: login, dashboard, zone, zone-partial, add-device, device-panel,
 * export, print. Needs a running app + seeded dev data (`npm run seed:dev`).
 * Output: docs/screenshots/<screen>-<theme>-<WxH>.png. Missing selectors only
 * warn; the page is still captured.
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import { stubTiles } from "../e2e/tile-stub";
import { signExportToken } from "../src/server/export/token";

const SCREENS = [
  "login",
  "dashboard",
  "zone",
  "zone-partial",
  "add-device",
  "device-panel",
  "export",
  "print",
] as const;
type Screen = (typeof SCREENS)[number];

const SIZES = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const list = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const base = arg("base", "http://localhost:3000").replace(/\/+$/, "");
const only = new Set(list(arg("only", SCREENS.join(","))));
const themes = list(arg("themes", "light,dark")) as ("light" | "dark")[];
const sizes = list(arg("sizes", "desktop,mobile")) as (keyof typeof SIZES)[];
const outDir = resolve(process.cwd(), "docs", "screenshots");
const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";

const warn = (m: string) => console.warn(`  ! ${m}`);

async function settle(page: Page, map: boolean) {
  await page.waitForLoadState("load").catch(() => {});
  if (map) {
    await page
      .locator(".leaflet-container")
      .first()
      .waitFor({ timeout: 15_000 })
      .catch(() => warn("peta (.leaflet-container) tidak ditemukan"));
    await page.waitForTimeout(1200);
  }
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(300);
}

async function step(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    warn(`${label}: ${(e as Error).message.split("\n")[0]}`);
  }
}

async function login(page: Page) {
  await page.goto(`${base}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata Sandi").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(`${base}/`, { timeout: 30_000 });
}

async function firstZoneId(page: Page): Promise<string> {
  await page.goto(`${base}/`);
  await page
    .locator('a[href^="/zones/"]')
    .first()
    .waitFor({ timeout: 15_000 })
    .catch(() => {});
  const hrefs = await page
    .locator('a[href^="/zones/"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""));
  const href = hrefs.find((h) => /^\/zones\/[0-9a-f-]{36}$/.test(h));
  if (!href) throw new Error("tidak ada zona; jalankan `npm run seed:dev`");
  return href.split("/").pop()!;
}

async function ensurePartialSelected(page: Page): Promise<void> {
  const items = page.getByTestId("device-item");
  await items.first().waitFor({ timeout: 10_000 });
  const partial = items.filter({ hasText: "Terinstall sebagian" });
  if ((await partial.count()) > 0) {
    await partial.first().click();
    return;
  }
  // None partial: make the first device partial through the UI.
  await items.first().click();
  await step("buka tab Detail", () =>
    page.getByRole("tab", { name: "Detail" }).click({ timeout: 3000 }),
  );
  await page.getByRole("radio", { name: "Terinstall sebagian" }).click();
  await page.getByLabel("FO").check();
  await page.getByRole("button", { name: "Simpan status" }).click();
  await page.waitForTimeout(1000);
}

async function runVariant(
  context: BrowserContext,
  tag: string,
  state: { zoneId: string },
) {
  const page = await context.newPage();
  const want = (s: Screen) => only.has(s);
  const capture = async (s: Screen) => {
    await page.screenshot({ path: resolve(outDir, `${s}-${tag}.png`) });
    console.log(`  ok ${s}-${tag}.png`);
  };

  if (want("login")) {
    await page.goto(`${base}/login`);
    await settle(page, false);
    await capture("login");
  }
  await login(page);
  if (!state.zoneId) state.zoneId = await firstZoneId(page);
  const zoneId = state.zoneId;

  if (want("dashboard")) {
    await page.goto(`${base}/`);
    await settle(page, false);
    await capture("dashboard");
  }

  const zoneUrl = `${base}/zones/${zoneId}`;
  if (want("zone")) {
    await page.goto(zoneUrl);
    await settle(page, true);
    await capture("zone");
  }
  if (want("zone-partial") || want("device-panel")) {
    await page.goto(zoneUrl);
    await settle(page, true);
    await step("pilih perangkat partial", () => ensurePartialSelected(page));
    await page.waitForTimeout(600);
    if (want("zone-partial")) await capture("zone-partial");
    if (want("device-panel")) {
      await step("panel perangkat", () =>
        page.getByTestId("device-detail").waitFor({ timeout: 5000 }),
      );
      await capture("device-panel");
    }
  }
  if (want("add-device")) {
    await page.goto(zoneUrl);
    await settle(page, true);
    await step("mode tambah perangkat", () =>
      page
        .getByRole("button", { name: "Tambah perangkat" })
        .first()
        .click({ timeout: 5000 }),
    );
    await page.waitForTimeout(500);
    await capture("add-device");
  }
  if (want("export")) {
    await page.goto(`${base}/export`);
    await settle(page, false);
    await capture("export");
  }
  if (want("print")) {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) {
      warn("BETTER_AUTH_SECRET kosong; halaman print dilewati");
    } else {
      const token = signExportToken({ zones: [zoneId], secret });
      await page.goto(`${base}/print/zones/${zoneId}?token=${token}`);
      await page
        .waitForFunction(
          () =>
            (window as unknown as { __MAP_READY__?: boolean }).__MAP_READY__ ===
            true,
          undefined,
          { timeout: 20_000 },
        )
        .catch(() => warn("__MAP_READY__ tidak aktif"));
      await settle(page, false);
      await capture("print");
    }
  }
  await page.close();
}

async function main() {
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD wajib diisi");
  }
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const state = { zoneId: "" };
  try {
    for (const theme of themes) {
      for (const size of sizes) {
        const vp = SIZES[size];
        const tag = `${theme}-${vp.width}x${vp.height}`;
        console.log(`[${tag}]`);
        const context = await browser.newContext({
          viewport: vp,
          colorScheme: theme,
          deviceScaleFactor: 1,
          hasTouch: size === "mobile",
          isMobile: size === "mobile",
        });
        await context.addInitScript((t) => {
          try {
            localStorage.setItem("theme", t);
          } catch {
            // storage unavailable
          }
        }, theme);
        await stubTiles(context);
        try {
          await runVariant(context, tag, state);
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
