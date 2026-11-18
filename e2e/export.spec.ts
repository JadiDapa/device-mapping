import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { login } from "./helpers";

/**
 * PRD §11 scenario 5 (+ F7 PNG): the PDF recap of two zones and a zone PNG
 * download as non-empty, correctly named files. Needs at least two zones
 * (`npm run seed:dev` creates Pusri 1B and 2B) and Chromium for Playwright.
 */

test.setTimeout(240_000);

test("export a 2-zone PDF recap and a zone PNG", async ({ page }) => {
  await login(page);

  // PDF: pick the first two zones on /export.
  await page.goto("/export");
  const rows = page.locator("main li label");
  await expect(rows.nth(1)).toBeVisible();
  await rows.nth(0).click();
  await rows.nth(1).click();
  await expect(page.getByText("2 zona dipilih")).toBeVisible();

  const [pdf] = await Promise.all([
    page.waitForEvent("download", { timeout: 200_000 }),
    page.getByRole("button", { name: "Unduh PDF" }).click(),
  ]);
  expect(pdf.suggestedFilename()).toMatch(
    /^Rekap_Instalasi_\d{4}-\d{2}-\d{2}\.pdf$/,
  );
  const pdfBytes = await readFile((await pdf.path())!);
  expect(pdfBytes.length).toBeGreaterThan(5_000);
  expect(pdfBytes.subarray(0, 5).toString()).toBe("%PDF-");

  // PNG: open the first zone and export its map.
  await page.goto("/");
  await page
    .locator('a[href^="/zones/"]:not([href="/zones/new"])')
    .first()
    .click();
  await expect(page.getByTestId("summary-box")).toBeVisible();
  const [png] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    page.getByRole("button", { name: "Export PNG" }).click(),
  ]);
  expect(png.suggestedFilename()).toMatch(/_\d{4}-\d{2}-\d{2}\.png$/);
  const pngBytes = await readFile((await png.path())!);
  expect(pngBytes.length).toBeGreaterThan(10_000);
  expect(pngBytes.subarray(1, 4).toString()).toBe("PNG");
});
