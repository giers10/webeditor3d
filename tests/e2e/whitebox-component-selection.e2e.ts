import { expect, test } from "@playwright/test";

import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import {
  clickViewportAtRatio,
  getEditorStoreSnapshot,
  replaceSceneDocument
} from "./viewport-test-helpers";

test("whitebox component selection modes keep object picking intentional across perspective and orthographic panes", async ({ page }) => {
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

  const brush = createBoxBrush({
    id: "brush-selection-modes-main",
    name: "Selection Fixture",
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
    ...createEmptySceneDocument({ name: "Selection Modes Scene" }),
    brushes: {
      [brush.id]: brush
    }
  });

  await page.getByTestId("viewport-layout-quad").click();

  await page.evaluate(({ target }) => {
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
            topRight: {
              cameraState: {
                target: { x: number; y: number; z: number };
                perspectiveOrbit: { radius: number; theta: number; phi: number };
                orthographicZoom: number;
              };
            };
          };
        };
        setViewportPanelCameraState(
          panelId: "topLeft" | "topRight",
          cameraState: {
            target: { x: number; y: number; z: number };
            perspectiveOrbit: { radius: number; theta: number; phi: number };
            orthographicZoom: number;
          }
        ): void;
        setViewportPanelViewMode(panelId: "topRight", viewMode: "top"): void;
      };
    }).__webeditor3dEditorStore;

    if (store === undefined) {
      throw new Error("Editor store debug hook is unavailable.");
    }

    const topLeftCameraState = store.getState().viewportPanels.topLeft.cameraState;
    const topRightCameraState = store.getState().viewportPanels.topRight.cameraState;

    store.setViewportPanelCameraState("topLeft", {
      ...topLeftCameraState,
      target,
      perspectiveOrbit: {
        radius: 4.5,
        theta: 0.72,
        phi: 1.08
      }
    });
    store.setViewportPanelViewMode("topRight", "top");
    store.setViewportPanelCameraState("topRight", {
      ...topRightCameraState,
      target,
      orthographicZoom: 8
    });
  }, { target: brush.center });

  await expect(page.getByTestId("viewport-selection-mode-topLeft")).toHaveText("Object");
  await clickViewportAtRatio(page, "topLeft", 0.5, 0.52);
  let snapshot = await getEditorStoreSnapshot(page);
  expect(snapshot.whiteboxSelectionMode).toBe("object");
  expect(snapshot.selection).toMatchObject({
    kind: "brushes",
    ids: [brush.id]
  });

  await page.getByTestId("whitebox-selection-mode-face").click();
  await expect(page.getByTestId("viewport-selection-mode-topRight")).toHaveText("Face");
  await clickViewportAtRatio(page, "topRight", 0.5, 0.5);
  snapshot = await getEditorStoreSnapshot(page);
  expect(snapshot.whiteboxSelectionMode).toBe("face");
  expect(snapshot.selection).toMatchObject({
    kind: "brushFace",
    brushId: brush.id,
    faceId: "posY"
  });
  await expect(page.getByTestId("viewport-panel-active-badge-topRight")).toBeVisible();

  await page.getByTestId("whitebox-selection-mode-edge").click();
  await expect(page.getByTestId("viewport-selection-mode-topRight")).toHaveText("Edge");
  await clickViewportAtRatio(page, "topRight", 0.5, 0.12);
  snapshot = await getEditorStoreSnapshot(page);
  expect(snapshot.whiteboxSelectionMode).toBe("edge");
  expect(snapshot.selection).toMatchObject({
    kind: "brushEdge",
    brushId: brush.id,
    edgeId: "edgeX_posY_negZ"
  });

  await page.getByTestId("whitebox-selection-mode-vertex").click();
  await expect(page.getByTestId("viewport-selection-mode-topRight")).toHaveText("Vertex");
  await clickViewportAtRatio(page, "topRight", 0.88, 0.12);
  snapshot = await getEditorStoreSnapshot(page);
  expect(snapshot.whiteboxSelectionMode).toBe("vertex");
  expect(snapshot.selection).toMatchObject({
    kind: "brushVertex",
    brushId: brush.id,
    vertexId: "posX_posY_negZ"
  });

  await page.getByTestId("whitebox-selection-mode-object").click();
  await clickViewportAtRatio(page, "topRight", 0.5, 0.5);
  snapshot = await getEditorStoreSnapshot(page);
  expect(snapshot.whiteboxSelectionMode).toBe("object");
  expect(snapshot.selection).toMatchObject({
    kind: "brushes",
    ids: [brush.id]
  });

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
