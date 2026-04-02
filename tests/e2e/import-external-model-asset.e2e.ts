import path from "node:path";

import { expect, test } from "@playwright/test";

import { getEditorStoreSnapshot, getViewportCanvas } from "./viewport-test-helpers";

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
  await page.getByTestId("viewport-panel-topLeft").click({ position: { x: 16, y: 16 }, force: true });
  const viewportCanvas = getViewportCanvas(page);
  await viewportCanvas.hover({ position: { x: 88, y: 84 }, force: true });
  await expect(page.getByTestId("viewport-snap-preview-topLeft")).toBeVisible();
  await viewportCanvas.click({ position: { x: 88, y: 84 }, force: true });
  await expect(page.getByTestId("outliner-model-instance-list").getByRole("button")).toHaveCount(2);
  const snapshot = await getEditorStoreSnapshot(page);
  const selectedModelInstanceId = snapshot.selection.kind === "modelInstances" ? snapshot.selection.ids?.[0] ?? null : null;

  expect(selectedModelInstanceId).not.toBeNull();

  const selectedModelInstance = snapshot.document.modelInstances[selectedModelInstanceId as string];

  if (selectedModelInstance === undefined) {
    throw new Error("Placed model instance is missing from the document snapshot.");
  }

  expect(Math.abs(selectedModelInstance.position.x) > 0 || Math.abs(selectedModelInstance.position.z) > 0).toBe(true);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
