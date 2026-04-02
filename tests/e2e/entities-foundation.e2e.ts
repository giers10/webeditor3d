import { expect, test } from "@playwright/test";

import { getEditorStoreSnapshot, getViewportCanvas } from "./viewport-test-helpers";

test("user can place and select typed entities from the entity foundation workflow", async ({ page }) => {
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
  await page.getByTestId("add-menu-sound-emitter").click();
  await page.getByTestId("viewport-panel-topLeft").click({ position: { x: 16, y: 16 }, force: true });
  const viewportCanvas = getViewportCanvas(page);
  await viewportCanvas.hover({ position: { x: 124, y: 108 }, force: true });
  await expect(page.getByTestId("viewport-snap-preview-topLeft")).toBeVisible();
  await viewportCanvas.click({ position: { x: 124, y: 108 }, force: true });
  const soundEmitterSnapshot = await getEditorStoreSnapshot(page);
  const selectedSoundEmitterId =
    soundEmitterSnapshot.selection.kind === "entities" ? soundEmitterSnapshot.selection.ids?.[0] ?? null : null;

  expect(selectedSoundEmitterId).not.toBeNull();

  const selectedSoundEmitter = soundEmitterSnapshot.document.entities[selectedSoundEmitterId as string];

  if (selectedSoundEmitter === undefined) {
    throw new Error("Placed sound emitter is missing from the document snapshot.");
  }

  expect(Math.abs(selectedSoundEmitter.position.x) > 0 || Math.abs(selectedSoundEmitter.position.z) > 0).toBe(true);
  await expect(page.getByTestId("sound-emitter-ref-distance")).toHaveValue("6");
  await expect(page.getByTestId("sound-emitter-max-distance")).toHaveValue("24");

  await page.getByTestId("sound-emitter-ref-distance").fill("9");
  await page.getByTestId("sound-emitter-ref-distance").press("Tab");

  await page.getByTestId("sound-emitter-autoplay").click();
  await page.getByTestId("sound-emitter-loop").click();
  await expect(page.getByTestId("sound-emitter-autoplay")).toBeChecked();
  await expect(page.getByTestId("sound-emitter-loop")).toBeChecked();

  await page.getByTestId("outliner-add-button").click();
  await page.getByTestId("add-menu-entities").click();
  await page.getByTestId("add-menu-interactable").click();
  await page.getByTestId("viewport-panel-topLeft").click({ position: { x: 16, y: 16 }, force: true });
  await viewportCanvas.hover({ position: { x: 240, y: 156 }, force: true });
  await expect(page.getByTestId("viewport-snap-preview-topLeft")).toBeVisible();
  await viewportCanvas.click({ position: { x: 240, y: 156 }, force: true });
  await expect(page.getByTestId("interactable-prompt")).toHaveValue("Use");

  await page
    .locator('[data-testid^="outliner-entity-"]')
    .filter({ hasText: "Sound Emitter" })
    .first()
    .click();

  await expect(page.getByTestId("sound-emitter-ref-distance")).toHaveValue("9");
  await expect(page.getByTestId("sound-emitter-autoplay")).toBeChecked();
  await expect(page.getByTestId("sound-emitter-loop")).toBeChecked();
  await expect(page.getByTestId("interactable-prompt")).toHaveCount(0);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("shift+a opens the add menu at the cursor", async ({ page }) => {
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

  await page.mouse.move(420, 260);
  await page.keyboard.press("Shift+A");

  await expect(page.getByRole("menu", { name: "Add" })).toBeVisible();
  await page.getByTestId("add-menu-lights").click();
  await page.getByTestId("add-menu-point-light").click();
  await page.getByTestId("viewport-panel-topLeft").click({ position: { x: 16, y: 16 }, force: true });
  const pointLightViewportCanvas = getViewportCanvas(page);
  await pointLightViewportCanvas.hover({ position: { x: 168, y: 128 }, force: true });
  await pointLightViewportCanvas.click({ position: { x: 168, y: 128 }, force: true });
  await expect(page.getByTestId("point-light-intensity")).toHaveValue("1.25");

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
