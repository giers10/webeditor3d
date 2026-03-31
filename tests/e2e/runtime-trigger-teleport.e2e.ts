import { expect, test } from "@playwright/test";

test("Trigger Volume enter can teleport the player to a Teleport Target", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, "webeditor3d.scene-document-draft");
  await page.reload();

  await page.getByTestId("place-player-start").click();
  await page.getByTestId("add-entity-triggerVolume").click();
  await page.getByTestId("add-entity-teleportTarget").click();

  await page.getByTestId("teleportTarget-position-x").fill("6");
  await page.getByTestId("teleportTarget-position-x").press("Tab");

  await page
    .locator('[data-testid^="outliner-entity-"]')
    .filter({ hasText: "Trigger Volume" })
    .first()
    .click();

  await page.getByTestId("add-trigger-teleport-link").click();

  await page.getByTestId("enter-run-mode").click();

  await expect(page.getByTestId("runner-shell")).toBeVisible();
  await expect(page.getByTestId("runner-player-position")).toContainText("6.00, 0.00, 0.00");

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
