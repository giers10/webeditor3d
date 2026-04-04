import { expect, test } from "@playwright/test";

import { beginBoxCreation, clickViewport, getEditorStoreSnapshot, getViewportPanel, setSharedBoxCreationPreview } from "./viewport-test-helpers";

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

  await beginBoxCreation(page);
  await clickViewport(page, "topLeft");
  await expect(page.getByRole("button", { name: /Whitebox Box 1/ })).toBeVisible();
  await expect(page.getByText("1 solid selected (Whitebox Box 1)")).toBeVisible();

  await page.getByTestId("viewport-layout-quad").click();

  await expect(page.getByTestId("viewport-panel-topLeft")).toBeVisible();
  await expect(page.getByTestId("viewport-panel-topRight")).toBeVisible();
  await expect(page.getByTestId("viewport-panel-bottomLeft")).toBeVisible();
  await expect(page.getByTestId("viewport-panel-bottomRight")).toBeVisible();

  const initialLayoutSnapshot = await getEditorStoreSnapshot(page);
  expect(initialLayoutSnapshot.viewportQuadSplit).toEqual({
    x: 0.5,
    y: 0.5
  });

  const dragSplitter = async (testId: string, deltaX: number, deltaY: number) => {
    const splitter = page.getByTestId(testId);
    const box = await splitter.boundingBox();

    if (box === null) {
      throw new Error(`Missing splitter handle: ${testId}`);
    }

    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5 + deltaX, box.y + box.height * 0.5 + deltaY);
    await page.mouse.up();
  };

  await dragSplitter("viewport-quad-splitter-center", 80, 48);
  const afterCenterResizeSnapshot = await getEditorStoreSnapshot(page);
  expect(afterCenterResizeSnapshot.viewportQuadSplit.x).toBeGreaterThan(0.5);
  expect(afterCenterResizeSnapshot.viewportQuadSplit.y).toBeGreaterThan(0.5);

  await dragSplitter("viewport-quad-splitter-vertical", -60, 0);
  const afterVerticalResizeSnapshot = await getEditorStoreSnapshot(page);
  expect(afterVerticalResizeSnapshot.viewportQuadSplit.x).toBeLessThan(afterCenterResizeSnapshot.viewportQuadSplit.x);
  expect(Math.abs(afterVerticalResizeSnapshot.viewportQuadSplit.y - afterCenterResizeSnapshot.viewportQuadSplit.y)).toBeLessThan(0.02);

  await dragSplitter("viewport-quad-splitter-horizontal", 0, -40);
  const afterHorizontalResizeSnapshot = await getEditorStoreSnapshot(page);
  expect(Math.abs(afterHorizontalResizeSnapshot.viewportQuadSplit.x - afterVerticalResizeSnapshot.viewportQuadSplit.x)).toBeLessThan(0.02);
  expect(afterHorizontalResizeSnapshot.viewportQuadSplit.y).toBeLessThan(afterVerticalResizeSnapshot.viewportQuadSplit.y);

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
    await expect(getViewportPanel(page, panelId).locator(".viewport-panel__subtitle")).toHaveCount(0);
    await expect(getViewportPanel(page, panelId).locator(".viewport-canvas__overlay-text")).toHaveCount(0);
  }

  await setSharedBoxCreationPreview(page, "topLeft", { x: 4, y: 0, z: 8 });
  const initialSnapshot = await getEditorStoreSnapshot(page);
  expect(initialSnapshot).toMatchObject({
    viewportTransientState: {
      toolPreview: {
        kind: "create",
        sourcePanelId: "topLeft",
        target: {
          kind: "box-brush"
        },
        center: {
          x: 4,
          y: 0,
          z: 8
        }
      }
    }
  });

  await getViewportPanel(page, "topRight").click({ position: { x: 16, y: 16 }, force: true });
  await page.getByTestId("viewport-panel-topRight-view-side").dispatchEvent("click");
  await expect(getViewportPanel(page, "topRight")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("viewport-panel-topRight-view-side")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Whitebox Box 1/ })).toBeVisible();
  const transferredSnapshot = await getEditorStoreSnapshot(page);
  expect(transferredSnapshot).toMatchObject({
    viewportTransientState: {
      toolPreview: {
        kind: "create",
        sourcePanelId: "topLeft",
        target: {
          kind: "box-brush"
        },
        center: {
          x: 4,
          y: 0,
          z: 8
        }
      }
    }
  });

  await getViewportPanel(page, "topLeft").click({ position: { x: 16, y: 16 }, force: true });
  await page.getByTestId("viewport-panel-topLeft-display-authoring").dispatchEvent("click");
  await expect(getViewportPanel(page, "topLeft")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("viewport-panel-topLeft-display-authoring")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("viewport-canvas-topLeft")).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(page.getByText("1 solid selected (Whitebox Box 1)")).toBeVisible();
  const finalSnapshot = await getEditorStoreSnapshot(page);
  expect(finalSnapshot).toMatchObject({
    viewportTransientState: {
      toolPreview: {
        kind: "create",
        sourcePanelId: "topLeft",
        target: {
          kind: "box-brush"
        },
        center: {
          x: 4,
          y: 0,
          z: 8
        }
      }
    }
  });

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
