import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { createZone, deleteZone, login } from "./helpers";

/**
 * F9: admin creates a camera point, uploads three photos, captions and
 * reorders them; the popover and fullscreen gallery then work (buttons,
 * keyboard, thumbnail strip). Uploaded files are not served to anonymous
 * requests.
 */

const zoneName = `E2E Kamera ${Date.now()}`;
const fixture = (n: number) =>
  path.join(import.meta.dirname, "fixtures", `camera-${n}.png`);

test("admin: camera point -> upload -> caption/reorder -> gallery", async ({
  page,
  browser,
}) => {
  await login(page);
  await createZone(page, zoneName);

  // Create the point by clicking the map.
  await page
    .getByRole("button", { name: "Tambah titik kamera" })
    .first()
    .click();
  const box = (await page.locator(".leaflet-container").boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.getByLabel("Nama titik").fill("Lobby Utara");
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByTestId("camera-dropzone")).toBeVisible();

  // Upload three photos (compressed in the browser, then POSTed).
  await page
    .getByTestId("camera-file-input")
    .setInputFiles([fixture(1), fixture(2), fixture(3)]);
  const items = page.getByTestId("camera-image-item");
  await expect(items).toHaveCount(3, { timeout: 30_000 });

  // Caption the first photo.
  const caption = items.nth(0).getByLabel("Keterangan 1");
  await caption.fill("Sudut barat");
  await caption.press("Enter");
  await expect(page.getByText("Keterangan disimpan.")).toBeVisible();

  // Reorder: move the first photo one position back with the move button.
  await items
    .nth(0)
    .getByRole("button", { name: "Geser satu posisi ke belakang" })
    .click();
  await expect(items.nth(1).getByLabel("Keterangan 2")).toHaveValue(
    "Sudut barat",
  );

  // Marker badge shows the count; the popover opens above the point.
  await expect(page.getByTestId("camera-marker")).toHaveAttribute(
    "data-count",
    "3",
  );
  await page.getByRole("button", { name: "Kembali ke daftar" }).click();
  await page.getByTestId("camera-marker").click();
  const popover = page.getByTestId("camera-popover");
  await expect(popover).toContainText("Lobby Utara");
  await popover.getByRole("button", { name: "Buka foto 1" }).click();

  // Gallery: counter, keyboard, thumbnail strip, caption.
  const gallery = page.getByTestId("camera-gallery");
  await expect(gallery).toBeVisible();
  const counter = page.getByTestId("camera-gallery-counter");
  await expect(counter).toHaveText("1 / 3");
  await page.keyboard.press("ArrowRight");
  await expect(counter).toHaveText("2 / 3");
  // The captioned photo was moved to position 2.
  await expect(page.getByTestId("camera-gallery-caption")).toHaveText(
    "Sudut barat",
  );
  await gallery.getByRole("button", { name: "Buka foto 3" }).click();
  await expect(counter).toHaveText("3 / 3");
  await expect(
    gallery.getByRole("button", { name: "Foto berikutnya" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(gallery).toBeHidden();

  // Uploaded files require a session.
  const src = await page
    .locator('[data-testid="camera-popover"] img, img[src^="/api/uploads/"]')
    .first()
    .getAttribute("src");
  expect(src).toMatch(/^\/api\/uploads\/camera\//);
  const anon = await browser.newContext();
  const res = await anon.request.get(new URL(src!, page.url()).toString(), {
    maxRedirects: 0,
  });
  expect(res.status()).toBe(401);
  await anon.close();

  // ZIP of every photo: folder per point, coordinates in the file name, manifest.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Unduh foto (ZIP)" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(
    /_foto-kamera_\d{4}-\d{2}-\d{2}\.zip$/,
  );
  const zip = readFileSync((await download.path())!).toString("latin1");
  expect(zip.startsWith("PK")).toBe(true);
  expect(zip).toContain("manifest.csv");
  expect(zip).toMatch(
    /01_Lobby-Utara\/01_Lobby-Utara_001_-?\d+\.\d{5}_-?\d+\.\d{5}\.webp/,
  );
  expect(zip).toContain("01_Lobby-Utara_003_");

  await deleteZone(page, zoneName);
});
