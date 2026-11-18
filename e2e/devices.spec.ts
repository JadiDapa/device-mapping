import { expect, test, type Page } from "@playwright/test";

/**
 * PRD §11 scenarios 1-3: admin creates a zone with a polygon, adds three
 * devices (numbered 1-3), reorders, then sets one to "partial" with a
 * checklist (orange marker + one more history row).
 */

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";
const zoneName = `E2E Zona ${Date.now()}`;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata Sandi").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("/");
}

async function drawPolygon(page: Page) {
  const map = page.locator(".leaflet-container");
  await expect(map).toBeVisible();
  const box = (await map.boundingBox())!;
  const at = (fx: number, fy: number) => ({
    x: box.x + box.width * fx,
    y: box.y + box.height * fy,
  });
  await page.getByRole("button", { name: "Gambar batas" }).click();
  const corners: [number, number][] = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.75, 0.75],
    [0.25, 0.75],
  ];
  for (const [fx, fy] of corners) {
    const p = at(fx, fy);
    await page.mouse.click(p.x, p.y);
  }
  // Finish by clicking the first vertex.
  const first = at(0.25, 0.25);
  await page.mouse.click(first.x, first.y);
}

async function addDevice(page: Page, fx: number, fy: number, label: string) {
  await page.getByRole("button", { name: "Tambah perangkat" }).first().click();
  const map = page.locator(".leaflet-container");
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
  await page.getByLabel("Lokasi detail").fill(label);
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByTestId("device-detail")).toBeVisible();
  await page.getByRole("button", { name: "Kembali ke daftar" }).click();
}

const markers = (page: Page) => page.getByTestId("device-marker");

test("admin: zone -> 3 devices -> reorder -> partial status", async ({
  page,
}) => {
  await login(page);

  // 1. Create a zone with a polygon.
  await page.getByRole("link", { name: "Zona baru" }).click();
  await page.getByLabel("Nama zona").fill(zoneName);
  await drawPolygon(page);
  await page.getByRole("button", { name: "Simpan" }).click();
  await page.waitForURL(/\/zones\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { name: zoneName, level: 1 }),
  ).toBeVisible();

  // 2. Three devices, numbered 1-3.
  await addDevice(page, 0.4, 0.4, "A");
  await addDevice(page, 0.5, 0.5, "B");
  await addDevice(page, 0.6, 0.6, "C");

  const items = page.getByTestId("device-item");
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText("A");
  await expect(items.nth(2)).toContainText("C");
  await expect(markers(page)).toHaveCount(3);
  expect(
    await markers(page).evaluateAll((els) =>
      els.map((e) => e.getAttribute("data-seq")).sort(),
    ),
  ).toEqual(["1", "2", "3"]);
  await expect(page.getByTestId("summary-total")).toHaveText("3");

  // 3. Reorder: move C (3rd) to the top with the keyboard sensor.
  const handle = items
    .nth(2)
    .getByRole("button", { name: "Seret untuk mengubah urutan" });
  await handle.focus();
  await page.keyboard.press("Space");
  // dnd-kit re-measures between key presses; give it a frame or two.
  for (const key of ["ArrowUp", "ArrowUp"]) {
    await page.waitForTimeout(250);
    await page.keyboard.press(key);
  }
  await page.waitForTimeout(250);
  await page.keyboard.press("Space");

  await expect(items.nth(0)).toContainText("C");
  await expect(items.nth(0)).toHaveAttribute("data-seq", "1");
  await expect(items.nth(1)).toContainText("A");
  await expect(items.nth(2)).toContainText("B");
  // Marker numbers follow the new order.
  await expect(
    page.locator('[data-testid="device-marker"][data-seq="1"]'),
  ).toHaveCount(1);

  // 4. Partial status with a checklist -> orange marker + history grows.
  await items.nth(0).getByRole("button").last().click();
  await page.getByRole("tab", { name: "Riwayat" }).click();
  await expect(page.getByTestId("history-entry")).toHaveCount(1);
  await page.getByRole("tab", { name: "Detail" }).click();

  await page.getByRole("radio", { name: "Terinstall sebagian" }).click();
  // Partial without checklist or note is refused client-side.
  await page.getByRole("button", { name: "Simpan status" }).click();
  await expect(page.getByText(/centang minimal satu/)).toBeVisible();
  await page.getByLabel("FO").check();
  await page.getByRole("button", { name: "Simpan status" }).click();

  const marker = page.locator('[data-testid="device-marker"][data-seq="1"]');
  await expect(marker).toHaveAttribute("data-status", "partial");
  await expect(marker).toHaveAttribute("style", /#F59E0B/i);

  await page.getByRole("tab", { name: "Riwayat" }).click();
  await expect(page.getByTestId("history-entry")).toHaveCount(2);

  // 5. Summary comes from the DB and matches.
  await expect(
    page.getByTestId("summary-box").locator('[data-status="partial"]'),
  ).toContainText("1");

  // Cleanup: delete the zone (cascades to its devices).
  await page.goto("/");
  await page
    .getByRole("link", { name: new RegExp(zoneName) })
    .first()
    .click();
  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Hapus zona" }).click();
  await page.getByLabel(/Ketik nama zona/).fill(zoneName);
  await page.getByRole("button", { name: "Hapus zona" }).last().click();
  await page.waitForURL("/");
});
