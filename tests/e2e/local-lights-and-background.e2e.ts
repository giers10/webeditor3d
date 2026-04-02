import path from "node:path";

import { expect, test } from "@playwright/test";

import { clickViewport, setViewportCreationPreview } from "./viewport-test-helpers";

const panoramaFixturePath = path.resolve(process.cwd(), "fixtures/assets/skybox-panorama.svg");

test("local lights and background images persist through editor and runner flows", async ({ page }) => {
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
  await page.getByTestId("add-menu-import").click();
  await page.getByTestId("import-menu-environment").click();
  await page.locator('input[type="file"][accept*="image"]').setInputFiles(panoramaFixturePath);

  await page.getByTestId("outliner-add-button").click();
  await page.getByTestId("add-menu-assets").click();
  await page.getByTestId("add-menu-assets-environments").click();
  await expect(page.getByRole("button", { name: "skybox-panorama.svg" })).toBeVisible();
  await expect(page.getByTestId("world-background-mode-value")).toContainText("Image");
  await expect(page.getByTestId("world-background-asset-value")).toContainText("skybox-panorama.svg");
  await expect(page.getByTestId("viewport-canvas-topLeft")).toHaveCSS("background-image", /url/);

  await page.getByTestId("outliner-add-button").click();
  await page.getByTestId("add-menu-lights").click();
  await page.getByTestId("add-menu-point-light").click();
  await setViewportCreationPreview(page, "topLeft", { kind: "entity", entityKind: "pointLight", audioAssetId: null }, { x: 12, y: 3, z: -4 });
  await expect(page.getByTestId("viewport-snap-preview-topLeft")).toBeVisible();
  await clickViewport(page, "topLeft");
  await expect(page.getByTestId("point-light-distance")).toHaveValue("8");
  await page.getByTestId("point-light-distance").fill("12");
  await page.getByTestId("point-light-distance").press("Tab");

  await page.getByTestId("outliner-add-button").click();
  await page.getByTestId("add-menu-lights").click();
  await page.getByTestId("add-menu-spot-light").click();
  await setViewportCreationPreview(page, "topLeft", { kind: "entity", entityKind: "spotLight", audioAssetId: null }, { x: -10, y: 4, z: 6 });
  await expect(page.getByTestId("viewport-snap-preview-topLeft")).toBeVisible();
  await clickViewport(page, "topLeft");
  await expect(page.getByTestId("spot-light-angle")).toHaveValue("35");
  await page.getByTestId("spot-light-angle").fill("48");
  await page.getByTestId("spot-light-angle").press("Tab");
  await page.getByTestId("spot-light-direction-y").fill("-0.9");
  await page.getByTestId("spot-light-direction-y").press("Tab");

  await expect(page.locator('[data-testid^="outliner-entity-"]')).toHaveCount(2);

  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page.getByTestId("status-message")).toContainText("Local draft saved.");

  await page.reload();

  await page.getByTestId("outliner-add-button").click();
  await page.getByTestId("add-menu-assets").click();
  await page.getByTestId("add-menu-assets-environments").click();
  await expect(page.getByRole("button", { name: "skybox-panorama.svg" })).toBeVisible();
  await expect(page.locator('[data-testid^="outliner-entity-"]')).toHaveCount(2);
  await expect(page.getByTestId("viewport-canvas-topLeft")).toHaveCSS("background-image", /url/);

  await page.getByTestId("enter-run-mode").click();

  await expect(page.getByTestId("runner-shell")).toBeVisible();
  await expect(page.getByTestId("runner-shell")).toHaveCSS("background-image", /url/);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
