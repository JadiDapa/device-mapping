import { expect, test, type Page } from "@playwright/test";
import { addDevice, createZone, deleteZone, login } from "./helpers";

/**
 * PRD §11 scenarios 1-3: admin creates a zone with a polygon, adds three
 * devices (numbered 1-3), reorders, then sets one to "partial" with a
 * checklist (orange marker + one more history row).
 */

const zoneName = `E2E Zona ${Date.now()}`;

const markers = (page: Page) => page.getByTestId("device-marker");

test("admin: zone -> 3 devices -> reorder -> partial status", async ({
  page,
}) => {
  await login(page);

  // 1. Create a zone with a polygon.
  await createZone(page, zoneName);

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
  await expect(marker).toHaveAttribute("style", /var\(--status-partial\)/);

  await page.getByRole("tab", { name: "Riwayat" }).click();
  await expect(page.getByTestId("history-entry")).toHaveCount(2);

  // 5. Summary comes from the DB and matches.
  await expect(
    page.getByTestId("summary-box").locator('[data-status="partial"]'),
  ).toContainText("1");

  // Cleanup: delete the zone (cascades to its devices).
  await deleteZone(page, zoneName);
});
