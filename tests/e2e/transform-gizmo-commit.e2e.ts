import { expect, test } from "@playwright/test";

import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import {
  getEditorStoreSnapshot,
  getViewportCanvas,
  replaceSceneDocument
} from "./viewport-test-helpers";

test("confirming a live scale transform over the gizmo commits the current preview", async ({
  page
}) => {
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

  test.skip(
    (await page.getByText("Viewport Unavailable").count()) > 0,
    "WebGL is unavailable in this Playwright environment."
  );

  const brush = createBoxBrush({
    id: "brush-transform-gizmo-commit",
    name: "Transform Gizmo Commit Fixture",
    center: {
      x: 0,
      y: 1,
      z: 0
    },
    size: {
      x: 2,
      y: 2,
      z: 2
    }
  });

  await replaceSceneDocument(page, {
    ...createEmptySceneDocument({ name: "Transform Gizmo Commit Scene" }),
    brushes: {
      [brush.id]: brush
    }
  });

  await page.evaluate(({ brushId, target }) => {
    const store = (window as Window & {
      __webeditor3dEditorStore?: {
        getState(): {
          viewportPanels: {
            topLeft: {
              cameraState: {
                target: { x: number; y: number; z: number };
                perspectiveOrbit: { radius: number; theta: number; phi: number };
                orthographicZoom: number;
              };
            };
          };
        };
        setSelection(selection: { kind: "brushes"; ids: string[] }): void;
        setViewportPanelViewMode(panelId: "topLeft", viewMode: "top"): void;
        setViewportPanelCameraState(
          panelId: "topLeft",
          cameraState: {
            target: { x: number; y: number; z: number };
            perspectiveOrbit: { radius: number; theta: number; phi: number };
            orthographicZoom: number;
          }
        ): void;
      };
    }).__webeditor3dEditorStore;

    if (store === undefined) {
      throw new Error("Editor store debug hook is unavailable.");
    }

    const topLeftCameraState = store.getState().viewportPanels.topLeft.cameraState;

    store.setSelection({
      kind: "brushes",
      ids: [brushId]
    });
    store.setViewportPanelViewMode("topLeft", "top");
    store.setViewportPanelCameraState("topLeft", {
      ...topLeftCameraState,
      target,
      orthographicZoom: 8
    });
  }, { brushId: brush.id, target: brush.center });

  const viewportCanvas = getViewportCanvas(page);
  await expect(viewportCanvas).toHaveCount(1);

  const canvasBox = await viewportCanvas.boundingBox();

  if (canvasBox === null) {
    throw new Error("Viewport canvas is missing.");
  }

  const centerX = canvasBox.x + canvasBox.width * 0.5;
  const centerY = canvasBox.y + canvasBox.height * 0.5;

  await page.mouse.move(centerX, centerY);
  await page.keyboard.press("S");
  await expect(page.getByTestId("viewport-transform-preview-topLeft")).toContainText("scale");

  await page.mouse.move(canvasBox.x + canvasBox.width * 0.72, centerY);

  const previewSnapshot = await getEditorStoreSnapshot(page);
  expect(previewSnapshot.viewportTransientState.transformSession.kind).toBe("active");

  if (previewSnapshot.viewportTransientState.transformSession.kind !== "active") {
    throw new Error("Expected an active scale transform session.");
  }

  expect(previewSnapshot.viewportTransientState.transformSession.operation).toBe("scale");

  if (previewSnapshot.viewportTransientState.transformSession.preview.kind !== "brush") {
    throw new Error("Expected a brush transform preview.");
  }

  const previewSizeX =
    previewSnapshot.viewportTransientState.transformSession.preview.size.x;

  expect(previewSizeX).not.toBe(brush.size.x);

  await page.mouse.click(centerX, centerY);

  const finalSnapshot = await getEditorStoreSnapshot(page);
  expect(finalSnapshot.viewportTransientState.transformSession.kind).toBe("none");

  const committedSize = await page.evaluate((brushId) => {
    const store = (window as Window & {
      __webeditor3dEditorStore?: {
        getState(): {
          document: {
            brushes: Record<string, { size: { x: number; y: number; z: number } }>;
          };
        };
      };
    }).__webeditor3dEditorStore;

    if (store === undefined) {
      throw new Error("Editor store debug hook is unavailable.");
    }

    return store.getState().document.brushes[brushId]?.size ?? null;
  }, brush.id);

  expect(committedSize).not.toBeNull();
  expect(committedSize?.x).toBeCloseTo(previewSizeX, 5);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
