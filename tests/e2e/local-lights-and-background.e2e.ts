import path from "node:path";

import { expect, test } from "@playwright/test";

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

  await page.locator('input[type="file"][accept*="image"]').setInputFiles(panoramaFixturePath);

  await expect(page.getByTestId("asset-list")).toContainText("skybox-panorama.svg");
  await expect(page.getByTestId("world-background-mode-value")).toContainText("Image");
  await expect(page.getByTestId("world-background-asset-value")).toContainText("skybox-panorama.svg");
  await expect(page.getByTestId("viewport-shell")).toHaveCSS("background-image", /url/);

  await page.getByTestId("add-entity-pointLight").click();
  await expect(page.getByTestId("point-light-distance")).toHaveValue("8");
  await page.getByTestId("point-light-distance").fill("12");
  await page.getByTestId("point-light-distance").press("Tab");

  await page.getByTestId("add-entity-spotLight").click();
  await expect(page.getByTestId("spot-light-angle")).toHaveValue("35");
  await page.getByTestId("spot-light-angle").fill("48");
  await page.getByTestId("spot-light-angle").press("Tab");
  await page.getByTestId("spot-light-direction-y").fill("-0.9");
  await page.getByTestId("spot-light-direction-y").press("Tab");

  await expect(page.locator('[data-testid^="outliner-entity-"]')).toHaveCount(2);

  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page.getByTestId("status-message")).toContainText("Local draft saved.");

  await page.reload();

  await expect(page.getByTestId("asset-list")).toContainText("skybox-panorama.svg");
  await expect(page.locator('[data-testid^="outliner-entity-"]')).toHaveCount(2);

  await page.getByTestId("enter-run-mode").click();

  await expect(page.getByTestId("runner-shell")).toBeVisible();
  await expect(page.getByTestId("runner-shell")).toHaveCSS("background-image", /url/);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
