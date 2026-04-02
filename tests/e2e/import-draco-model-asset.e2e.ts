import path from "node:path";

import { expect, test } from "@playwright/test";

import { getEditorStoreSnapshot, setViewportPlacementPreview } from "./viewport-test-helpers";

const fixturePath = path.resolve(process.cwd(), "fixtures/assets/tiny-triangle-draco.glb");

test("imports a draco-compressed glb asset, places an instance, and survives reload", async ({ page }) => {
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

  await page.getByTestId("outliner-add-button").click();
  await page.getByTestId("add-menu-import").click();
  await page.getByTestId("import-menu-model").click();

  await page.locator('input[type="file"][accept*="gltf"]').setInputFiles(fixturePath);

  await expect(page.getByTestId("asset-list").getByText("tiny-triangle-draco.glb", { exact: true })).toBeVisible();
  await expect(page.getByTestId("outliner-model-instance-list").getByRole("button")).toHaveCount(1);

  await page.getByRole("button", { name: "Place instance for tiny-triangle-draco.glb" }).click();
  const importedSnapshot = await getEditorStoreSnapshot(page);
  const importedModelAsset = Object.values(importedSnapshot.document.assets).find(
    (asset) => asset.kind === "model" && asset.sourceName === "tiny-triangle-draco.glb"
  );

  if (importedModelAsset === undefined) {
    throw new Error("Imported model asset was not found in the document snapshot.");
  }

  await setViewportPlacementPreview(
    page,
    "topLeft",
    { kind: "model-instance", assetId: importedModelAsset.id },
    { x: 84, y: 0, z: -88 }
  );
  await expect(page.getByTestId("viewport-snap-preview-topLeft")).toBeVisible();
  await page.getByTestId("viewport-fallback-place-topLeft").dispatchEvent("click");
  await expect(page.getByTestId("outliner-model-instance-list").getByRole("button")).toHaveCount(2);
  const snapshot = await getEditorStoreSnapshot(page);
  const selectedModelInstanceId = snapshot.selection.kind === "modelInstances" ? snapshot.selection.ids?.[0] ?? null : null;

  expect(selectedModelInstanceId).not.toBeNull();

  const selectedModelInstance = snapshot.document.modelInstances[selectedModelInstanceId as string];

  if (selectedModelInstance === undefined) {
    throw new Error("Placed model instance is missing from the document snapshot.");
  }

  expect(selectedModelInstance.position).toMatchObject({
    x: 84,
    z: -88
  });

  await page.getByRole("button", { name: "Save Draft" }).dispatchEvent("click");
  await expect(page.getByTestId("status-message")).toContainText("Local draft saved.");

  await page.reload();

  await expect(page.getByTestId("asset-list").getByText("tiny-triangle-draco.glb", { exact: true })).toBeVisible();
  await expect(page.getByTestId("outliner-model-instance-list").getByRole("button")).toHaveCount(2);
  await expect(page.getByTestId("asset-status-message")).toHaveCount(0);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
