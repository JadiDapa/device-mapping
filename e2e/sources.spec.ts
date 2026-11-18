import { expect, test } from "@playwright/test";
import { addDevice, createZone, deleteZone, login } from "./helpers";

/**
 * PRD F6 / M5: admin adds a network source on the zone map, connects a
 * device to it (optional link), toggles the connection lines, and sees the
 * source on /network-sources and /map.
 */

const zoneName = `E2E Sumber ${Date.now()}`;
const sourceName = `Shelter E2E ${Date.now()}`;

test("admin: source on the map -> link a device -> connection line", async ({
  page,
}) => {
  await login(page);
  await createZone(page, zoneName);
  await addDevice(page, 0.4, 0.4, "A");

  // Add a source by clicking the map.
  await page
    .getByRole("button", { name: "Tambah sumber jaringan" })
    .first()
    .click();
  const map = page.locator(".leaflet-container");
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.getByLabel("Nama", { exact: true }).fill(sourceName);
  await page.getByLabel("Jenis").fill("Shelter");
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByTestId("source-detail")).toContainText(sourceName);
  await expect(page.getByTestId("source-marker")).toHaveCount(1);

  // Connect the device to it (the link is optional; this is the opt-in).
  await page.getByRole("button", { name: "Kembali ke daftar" }).click();
  await page
    .getByTestId("device-item")
    .first()
    .getByRole("button")
    .last()
    .click();
  await page
    .getByLabel("Sumber jaringan (opsional)")
    .selectOption({ label: `${sourceName} (Shelter)` });
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await page.getByRole("button", { name: "Kembali ke daftar" }).click();

  // Connection lines are off by default, drawn when toggled on.
  const lines = page.locator(".leaflet-container .connection-line");
  await expect(lines).toHaveCount(0);
  await page.getByRole("button", { name: "Garis koneksi" }).click();
  await expect(lines).toHaveCount(1);

  // The source shows its connected device on its own page.
  await page.goto("/network-sources");
  const row = page.getByTestId("source-row").filter({ hasText: sourceName });
  await expect(row).toContainText("1 perangkat");
  await row.getByRole("link", { name: sourceName }).click();
  await expect(page.getByTestId("source-device")).toHaveCount(1);

  // Everything appears on the all-zones map.
  await page.goto("/map");
  await expect(
    page.locator(`[data-testid="source-marker"][data-name="${sourceName}"]`),
  ).toHaveCount(1);

  // Cleanup: delete the source (its device is detached), then the zone.
  await page.goto("/network-sources");
  await row.getByRole("link", { name: sourceName }).click();
  await page.getByRole("button", { name: "Hapus" }).first().click();
  await page.getByRole("button", { name: "Hapus" }).last().click();
  await page.waitForURL("/network-sources");
  await expect(page.getByText(sourceName)).toHaveCount(0);
  await deleteZone(page, zoneName);
});
