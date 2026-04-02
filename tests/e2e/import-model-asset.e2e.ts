import path from "node:path";

import { expect, test } from "@playwright/test";

import { clickViewport, getEditorStoreSnapshot, setViewportCreationPreview } from "./viewport-test-helpers";

const fixturePath = path.resolve(process.cwd(), "fixtures/assets/tiny-triangle.gltf");

test("imports a model asset, places an instance, and survives reload", async ({ page }) => {
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
  await expect(page.getByTestId("import-menu-model")).toBeVisible();
  await expect(page.getByTestId("import-menu-environment")).toBeVisible();
  await expect(page.getByTestId("import-menu-audio")).toBeVisible();
  await page.getByTestId("import-menu-model").click();

  await page.locator('input[type="file"][accept*="gltf"]').setInputFiles(fixturePath);

  await expect(page.getByTestId("asset-list").getByText("tiny-triangle.gltf", { exact: true })).toBeVisible();
  await expect(page.getByTestId("asset-list")).not.toContainText("Storage key:");
  await expect(page.getByTestId("outliner-model-instance-list").getByRole("button")).toHaveCount(1);

  await page.getByRole("button", { name: "Place instance for tiny-triangle.gltf" }).hover();
  await expect(page.getByTestId("status-asset-hover")).toContainText("Storage key:");
  await page.getByRole("button", { name: "Place instance for tiny-triangle.gltf" }).click();
  const importedSnapshot = await getEditorStoreSnapshot(page);
  expect(importedSnapshot).toMatchObject({
    toolMode: "create",
    viewportTransientState: {
      toolPreview: {
        kind: "create",
        sourcePanelId: "topLeft",
        target: {
          kind: "model-instance",
          assetId: expect.any(String)
        },
        center: null
      }
    }
  });
  const importedModelAsset = Object.values(importedSnapshot.document.assets).find(
    (asset) => asset.kind === "model" && asset.sourceName === "tiny-triangle.gltf"
  );

  if (importedModelAsset === undefined) {
    throw new Error("Imported model asset was not found in the document snapshot.");
  }

  await page.keyboard.press("Escape");
  const cancelledSnapshot = await getEditorStoreSnapshot(page);
  expect(cancelledSnapshot).toMatchObject({
    toolMode: "select",
    viewportTransientState: {
      toolPreview: {
        kind: "none"
      }
    }
  });

  await page.getByRole("button", { name: "Place instance for tiny-triangle.gltf" }).click();
  await setViewportCreationPreview(page, "topLeft", { kind: "model-instance", assetId: importedModelAsset.id }, { x: 92, y: 0, z: -76 });
  await expect(page.getByTestId("viewport-snap-preview-topLeft")).toBeVisible();
  await clickViewport(page, "topLeft");
  const committedSnapshot = await getEditorStoreSnapshot(page);
  expect(committedSnapshot).toMatchObject({
    toolMode: "select",
    viewportTransientState: {
      toolPreview: {
        kind: "none"
      }
    }
  });
  await expect(page.getByTestId("outliner-model-instance-list").getByRole("button")).toHaveCount(2);
  const snapshot = committedSnapshot;
  const selectedModelInstanceId = snapshot.selection.kind === "modelInstances" ? snapshot.selection.ids?.[0] ?? null : null;

  expect(selectedModelInstanceId).not.toBeNull();

  const selectedModelInstance = snapshot.document.modelInstances[selectedModelInstanceId as string];

  if (selectedModelInstance === undefined) {
    throw new Error("Placed model instance is missing from the document snapshot.");
  }

  expect(selectedModelInstance.position).toMatchObject({
    x: 92,
    z: -76
  });

  await page.getByRole("button", { name: "Save Draft" }).dispatchEvent("click");
  await expect(page.getByTestId("status-message")).toContainText("Local draft saved.");

  await page.reload();

  await expect(page.getByTestId("asset-list").getByText("tiny-triangle.gltf", { exact: true })).toBeVisible();
  await expect(page.getByTestId("asset-list")).not.toContainText("Storage key:");
  await expect(page.getByTestId("outliner-model-instance-list").getByRole("button")).toHaveCount(2);
  await expect(page.getByTestId("asset-status-message")).toHaveCount(0);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
