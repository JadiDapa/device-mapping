import { expect, type Page } from "@playwright/test";

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";

export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata Sandi").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL("/");
}

export async function drawPolygon(page: Page) {
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

/** Admin creates a zone with a polygon and lands on its page. */
export async function createZone(page: Page, zoneName: string) {
  await page.getByRole("link", { name: "Zona baru" }).click();
  await page.getByLabel("Nama zona").fill(zoneName);
  await drawPolygon(page);
  await page.getByRole("button", { name: "Simpan" }).click();
  await page.waitForURL(/\/zones\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { name: zoneName, level: 1 }),
  ).toBeVisible();
}

export async function addDevice(
  page: Page,
  fx: number,
  fy: number,
  label: string,
) {
  await page.getByRole("button", { name: "Tambah perangkat" }).first().click();
  const map = page.locator(".leaflet-container");
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
  await page.getByLabel("Lokasi detail").fill(label);
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByTestId("device-detail")).toBeVisible();
  await page.getByRole("button", { name: "Kembali ke daftar" }).click();
}

/** Delete a zone (cascades to its devices) through its edit page. */
export async function deleteZone(page: Page, zoneName: string) {
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
}
