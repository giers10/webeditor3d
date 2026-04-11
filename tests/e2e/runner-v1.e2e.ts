import { expect, test } from "@playwright/test";

import { clickViewport, setViewportCreationPreview } from "./viewport-test-helpers";

test("user can place PlayerStart, author third-person navigation, and spawn from it", async ({ page }) => {
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

  await page.getByTestId("outliner-add-button").click();
  await page.getByTestId("add-menu-entities").click();
  await page.getByTestId("add-menu-player-start").click();
  await setViewportCreationPreview(page, "topLeft", { kind: "entity", entityKind: "playerStart", audioAssetId: null }, { x: 0, y: 0, z: 0 });
  await clickViewport(page, "topLeft");
  await page.getByTestId("player-start-position-x").fill("4");
  await page.getByTestId("player-start-position-x").press("Tab");
  await page.getByTestId("player-start-position-z").fill("-2");
  await page.getByTestId("player-start-position-z").press("Tab");
  await page.getByTestId("player-start-yaw").fill("90");
  await page.getByTestId("player-start-yaw").press("Tab");
  await page.getByTestId("player-start-navigation-mode").selectOption("thirdPerson");

  await page.getByTestId("enter-run-mode").click();

  await expect(page.getByTestId("runner-shell")).toBeVisible();
  await expect(page.getByTestId("runner-spawn-state")).toContainText("Player Start");
  await expect(page.getByTestId("runner-player-position")).toContainText("4.00, 0.00, -2.00");
  await expect(page.getByText("Third Person")).toBeVisible();

  await page.getByTestId("exit-run-mode").click();
  await expect(page.getByTestId("viewport-shell")).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
