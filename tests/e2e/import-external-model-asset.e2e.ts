import path from "node:path";

import { expect, test } from "@playwright/test";

const gltfFixturePath = path.resolve(process.cwd(), "fixtures/assets/external-triangle/scene.gltf");
const binFixturePath = path.resolve(process.cwd(), "fixtures/assets/external-triangle/triangle.bin");

test("imports a gltf asset with external resources and survives reload", async ({ page }) => {
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

  await expect(page.getByRole("button", { name: "Import Model" })).toBeEnabled();

  await page.locator('input[type="file"][accept*="gltf"]').setInputFiles([gltfFixturePath, binFixturePath]);

  await expect(page.getByTestId("asset-list").getByText("scene.gltf", { exact: true })).toBeVisible();
  await expect(page.getByTestId("asset-list")).not.toContainText("Storage key:");
  await expect(page.getByTestId("outliner-model-instance-list").getByRole("button")).toHaveCount(1);

  await page.getByRole("button", { name: "Place instance for scene.gltf" }).hover();
  await expect(page.getByTestId("status-asset-hover")).toContainText("Storage key:");
  await page.getByRole("button", { name: "Place instance for scene.gltf" }).click();
  await expect(page.getByTestId("outliner-model-instance-list").getByRole("button")).toHaveCount(2);

  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page.getByTestId("status-message")).toContainText("Local draft saved.");

  await page.reload();

  await expect(page.getByTestId("asset-list").getByText("scene.gltf", { exact: true })).toBeVisible();
  await expect(page.getByTestId("asset-list")).not.toContainText("Storage key:");
  await expect(page.getByTestId("outliner-model-instance-list").getByRole("button")).toHaveCount(2);
  await expect(page.getByTestId("asset-status-message")).toHaveCount(0);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
