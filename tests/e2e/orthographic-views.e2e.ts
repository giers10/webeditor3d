import { expect, test } from "@playwright/test";

import { beginBoxCreation, clickViewport, getViewportOverlay, getViewportPanel } from "./viewport-test-helpers";

test("orthographic panel controls keep brush authoring and selection behavior intact", async ({ page }) => {
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

  await beginBoxCreation(page);
  await clickViewport(page, "topLeft");

  await expect(page.getByRole("button", { name: /Box Brush 1/ })).toBeVisible();
  await expect(page.getByText("1 brush selected (Box Brush 1)")).toBeVisible();
  await expect(page.getByTestId("viewport-active-panel")).toHaveCount(0);
  await expect(page.getByTestId("viewport-panel-topLeft-view-perspective")).toHaveAttribute("aria-pressed", "true");
  await expect(getViewportOverlay(page, "topLeft")).toHaveCount(0);

  await page.getByTestId("viewport-panel-topLeft-view-top").dispatchEvent("click");
  await expect(page.getByTestId("viewport-panel-topLeft-view-top")).toHaveAttribute("aria-pressed", "true");
  await expect(getViewportOverlay(page, "topLeft")).toHaveCount(0);

  await page.getByTestId("viewport-panel-topLeft-view-front").dispatchEvent("click");
  await expect(page.getByTestId("viewport-panel-topLeft-view-front")).toHaveAttribute("aria-pressed", "true");
  await expect(getViewportOverlay(page, "topLeft")).toHaveCount(0);

  await page.getByTestId("viewport-panel-topLeft-view-side").dispatchEvent("click");
  await expect(page.getByTestId("viewport-panel-topLeft-view-side")).toHaveAttribute("aria-pressed", "true");
  await expect(getViewportOverlay(page, "topLeft")).toHaveCount(0);

  await page.getByTestId("viewport-panel-topLeft-display-authoring").dispatchEvent("click");
  await expect(page.getByTestId("viewport-panel-topLeft-display-authoring")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("viewport-canvas-topLeft")).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(getViewportPanel(page, "topLeft")).toHaveAttribute("data-active", "true");
  await expect(page.getByText("1 brush selected (Box Brush 1)")).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
