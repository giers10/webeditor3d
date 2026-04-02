import { expect, test } from "@playwright/test";

import { clickViewport, getEditorStoreSnapshot, setViewportCreationPreview } from "./viewport-test-helpers";

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
  await setViewportCreationPreview(
    page,
    "topLeft",
    { kind: "entity", entityKind: "soundEmitter", audioAssetId: null },
    { x: 4, y: 1, z: -6 }
  );
  await expect(page.getByTestId("viewport-snap-preview-topLeft")).toBeVisible();
  await clickViewport(page, "topLeft");
  const soundEmitterSnapshot = await getEditorStoreSnapshot(page);
  const selectedSoundEmitterId =
    soundEmitterSnapshot.selection.kind === "entities" ? soundEmitterSnapshot.selection.ids?.[0] ?? null : null;

  expect(selectedSoundEmitterId).not.toBeNull();

  const selectedSoundEmitter = soundEmitterSnapshot.document.entities[selectedSoundEmitterId as string];

  if (selectedSoundEmitter === undefined) {
    throw new Error("Placed sound emitter is missing from the document snapshot.");
  }

  expect(selectedSoundEmitter.position).toMatchObject({
    x: 4,
    y: 1,
    z: -6
  });
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
  await setViewportCreationPreview(
    page,
    "topLeft",
    { kind: "entity", entityKind: "interactable", audioAssetId: null },
    { x: -8, y: 1, z: 12 }
  );
  await expect(page.getByTestId("viewport-snap-preview-topLeft")).toBeVisible();
  await clickViewport(page, "topLeft");
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
  await setViewportCreationPreview(
    page,
    "topLeft",
    { kind: "entity", entityKind: "pointLight", audioAssetId: null },
    { x: 12, y: 3, z: -4 }
  );
  await clickViewport(page, "topLeft");
  await expect(page.getByTestId("point-light-intensity")).toHaveValue("1.25");

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
