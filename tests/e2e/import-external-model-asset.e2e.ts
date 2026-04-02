import path from "node:path";

import { expect, test } from "@playwright/test";

import { getEditorStoreSnapshot, setViewportPlacementPreview } from "./viewport-test-helpers";

const gltfFixturePath = path.resolve(process.cwd(), "fixtures/assets/external-triangle/scene.gltf");
const binFixturePath = path.resolve(process.cwd(), "fixtures/assets/external-triangle/triangle.bin");

test("imports a gltf asset with external resources and places an instance", async ({ page }) => {
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

  await page.locator('input[type="file"][accept*="gltf"]').setInputFiles([gltfFixturePath, binFixturePath]);

  await expect(page.getByTestId("asset-list").getByText("scene.gltf", { exact: true })).toBeVisible();
  await expect(page.getByTestId("asset-list")).not.toContainText("Storage key:");
  await expect(page.getByTestId("outliner-model-instance-list").getByRole("button")).toHaveCount(1);

  await page.getByRole("button", { name: "Place instance for scene.gltf" }).hover();
  await expect(page.getByTestId("status-asset-hover")).toContainText("Storage key:");
  await page.getByRole("button", { name: "Place instance for scene.gltf" }).click();
  const importedSnapshot = await getEditorStoreSnapshot(page);
  const importedModelAsset = Object.values(importedSnapshot.document.assets).find(
    (asset) => asset.kind === "model" && asset.sourceName === "scene.gltf"
  );

  if (importedModelAsset === undefined) {
    throw new Error("Imported model asset was not found in the document snapshot.");
  }

  await setViewportPlacementPreview(page, "topLeft", { kind: "model-instance", assetId: importedModelAsset.id }, { x: 88, y: 0, z: -84 });
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
    x: 88,
    z: -84
  });

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
