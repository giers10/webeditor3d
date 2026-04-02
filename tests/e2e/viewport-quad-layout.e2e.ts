import { expect, test } from "@playwright/test";

import { clickViewport, getViewportPanel, setSharedBoxCreatePreview } from "./viewport-test-helpers";

test("quad viewport layout shows four linked panels with shared selection and active panel state", async ({ page }) => {
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

  await page.getByRole("button", { name: "Box Create" }).click();
  await clickViewport(page, "topLeft");
  await expect(page.getByRole("button", { name: /Box Brush 1/ })).toBeVisible();
  await expect(page.getByText("1 brush selected (Box Brush 1)")).toBeVisible();

  await page.getByTestId("viewport-layout-quad").click();

  await expect(page.getByTestId("viewport-panel-topLeft")).toBeVisible();
  await expect(page.getByTestId("viewport-panel-topRight")).toBeVisible();
  await expect(page.getByTestId("viewport-panel-bottomLeft")).toBeVisible();
  await expect(page.getByTestId("viewport-panel-bottomRight")).toBeVisible();

  await expect(page.getByTestId("viewport-panel-topLeft-view-perspective")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("viewport-panel-topLeft-display-normal")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("viewport-panel-topRight-view-top")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("viewport-panel-topRight-display-authoring")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("viewport-canvas-topRight")).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(page.getByTestId("viewport-panel-bottomLeft-view-front")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("viewport-panel-bottomLeft-display-authoring")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("viewport-panel-bottomRight-view-side")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("viewport-panel-bottomRight-display-authoring")).toHaveAttribute("aria-pressed", "true");

  for (const panelId of ["topLeft", "topRight", "bottomLeft", "bottomRight"] as const) {
    await expect(getViewportPanel(page, panelId).locator(".viewport-canvas__overlay-text")).toHaveCount(0);
  }

  await setSharedBoxCreatePreview(page, "topLeft", { x: 4, y: 0, z: 8 });

  for (const panelId of ["topLeft", "topRight", "bottomLeft", "bottomRight"] as const) {
    await expect(page.getByTestId(`viewport-snap-preview-${panelId}`)).toContainText("Preview: 4, 0, 8");
  }

  await getViewportPanel(page, "topRight").click({ position: { x: 16, y: 16 }, force: true });
  await page.getByTestId("viewport-panel-topRight-view-side").dispatchEvent("click");
  await expect(page.getByTestId("viewport-active-panel")).toContainText("Top Right");
  await expect(page.getByTestId("viewport-panel-topRight-view-side")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Box Brush 1/ })).toBeVisible();

  await getViewportPanel(page, "topLeft").click({ position: { x: 16, y: 16 }, force: true });
  await page.getByTestId("viewport-panel-topLeft-display-authoring").dispatchEvent("click");
  await expect(page.getByTestId("viewport-active-panel")).toContainText("Top Left");
  await expect(page.getByTestId("viewport-panel-topLeft-display-authoring")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("viewport-canvas-topLeft")).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(page.getByText("1 brush selected (Box Brush 1)")).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
