import { expect, test, type Page } from "@playwright/test";

import { createModelInstance } from "../../src/assets/model-instances";
import { createProjectAssetStorageKey, type ModelAssetRecord } from "../../src/assets/project-assets";
import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";
import {
  clickViewport,
  getEditorStoreSnapshot,
  getViewportCanvas,
  replaceSceneDocument
} from "./viewport-test-helpers";

const modelAsset = {
  id: "asset-model-transform-e2e",
  kind: "model",
  sourceName: "transform-fixture.glb",
  mimeType: "model/gltf-binary",
  storageKey: createProjectAssetStorageKey("asset-model-transform-e2e"),
  byteLength: 72,
  metadata: {
    kind: "model",
    format: "glb",
    sceneName: "Transform Fixture",
    nodeCount: 1,
    meshCount: 1,
    materialNames: [],
    textureNames: [],
    animationNames: [],
    boundingBox: {
      min: {
        x: -0.5,
        y: 0,
        z: -0.5
      },
      max: {
        x: 0.5,
        y: 1,
        z: 0.5
      },
      size: {
        x: 1,
        y: 1,
        z: 1
      }
    },
    warnings: []
  }
} satisfies ModelAssetRecord;

async function seedTransformScene(page: Page) {
  const brush = createBoxBrush({
    id: "brush-transform-main",
    name: "Brush Transform Fixture",
    center: {
      x: 0,
      y: 1,
      z: 0
    }
  });
  const playerStart = createPlayerStartEntity({
    id: "entity-player-start-transform",
    name: "Player Start Fixture",
    position: {
      x: 4,
      y: 0,
      z: -4
    },
    yawDegrees: 0
  });
  const modelInstance = createModelInstance({
    id: "model-instance-transform-main",
    assetId: modelAsset.id,
    name: "Model Transform Fixture",
    position: {
      x: -4,
      y: 0,
      z: 4
    }
  });

  await replaceSceneDocument(page, {
    ...createEmptySceneDocument({ name: "Transform Foundation Fixture" }),
    brushes: {
      [brush.id]: brush
    },
    assets: {
      [modelAsset.id]: modelAsset
    },
    entities: {
      [playerStart.id]: playerStart
    },
    modelInstances: {
      [modelInstance.id]: modelInstance
    }
  });

  return {
    brush,
    playerStart,
    modelInstance
  };
}

async function getViewportCenter(page: Page, panelId: "topLeft" | "topRight" | "bottomLeft" | "bottomRight") {
  const viewportCanvas = getViewportCanvas(page, panelId);
  const bounds = await viewportCanvas.boundingBox();

  if (bounds === null) {
    throw new Error(`Viewport ${panelId} is not visible.`);
  }

  return {
    x: bounds.x + bounds.width * 0.5,
    y: bounds.y + bounds.height * 0.5
  };
}

async function commitKeyboardMove(
  page: Page,
  panelId: "topLeft" | "topRight" | "bottomLeft" | "bottomRight",
  delta: { x: number; y: number },
  axisConstraint?: "x" | "y" | "z"
) {
  const center = await getViewportCenter(page, panelId);

  await page.mouse.move(center.x, center.y);
  await page.keyboard.press("g");

  if (axisConstraint !== undefined) {
    await page.keyboard.press(axisConstraint);
  }

  await page.mouse.move(center.x + delta.x, center.y + delta.y);
  await page.mouse.click(center.x + delta.x, center.y + delta.y);
}

test("viewport picking defaults to whole-brush selection and axis-constrained brush move commits through the shared transform session", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, "webeditor3d.scene-document-draft");
  await page.reload();

  const fixtures = await seedTransformScene(page);

  await page.getByTestId("viewport-layout-quad").click();
  await clickViewport(page, "topRight");

  const selectedSnapshot = await getEditorStoreSnapshot(page);
  expect(selectedSnapshot.selection).toEqual({
    kind: "brushes",
    ids: [fixtures.brush.id]
  });

  await commitKeyboardMove(page, "topRight", { x: 160, y: 0 }, "x");

  const movedSnapshot = await getEditorStoreSnapshot(page);
  expect(movedSnapshot.viewportTransientState.transformSession).toEqual({
    kind: "none"
  });
  expect(movedSnapshot.document.brushes[fixtures.brush.id].center.y).toBe(fixtures.brush.center.y);
  expect(movedSnapshot.document.brushes[fixtures.brush.id].center.z).toBe(fixtures.brush.center.z);
  expect(movedSnapshot.document.brushes[fixtures.brush.id].center.x).not.toBe(fixtures.brush.center.x);
});

test("keyboard move commits an entity translation through the shared transform controller", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, "webeditor3d.scene-document-draft");
  await page.reload();

  const fixtures = await seedTransformScene(page);

  await page.getByRole("button", { name: fixtures.playerStart.name as string }).click();
  await commitKeyboardMove(page, "topLeft", { x: 100, y: -60 });

  const snapshot = await getEditorStoreSnapshot(page);
  expect(snapshot.viewportTransientState.transformSession).toEqual({
    kind: "none"
  });
  expect(snapshot.document.entities[fixtures.playerStart.id].position).not.toEqual(fixtures.playerStart.position);
});

test("escape cancels an active entity transform session without committing preview changes", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, "webeditor3d.scene-document-draft");
  await page.reload();

  const fixtures = await seedTransformScene(page);

  await page.getByRole("button", { name: fixtures.playerStart.name as string }).click();

  const center = await getViewportCenter(page, "topLeft");
  await page.mouse.move(center.x, center.y);
  await page.keyboard.press("g");
  await page.mouse.move(center.x + 140, center.y + 40);
  await page.keyboard.press("Escape");

  const snapshot = await getEditorStoreSnapshot(page);
  expect(snapshot.viewportTransientState.transformSession).toEqual({
    kind: "none"
  });
  expect(snapshot.document.entities[fixtures.playerStart.id].position).toEqual(fixtures.playerStart.position);
});

test("keyboard move commits a model instance translation through the shared transform controller", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, "webeditor3d.scene-document-draft");
  await page.reload();

  const fixtures = await seedTransformScene(page);

  await page.getByRole("button", { name: fixtures.modelInstance.name as string }).click();
  await commitKeyboardMove(page, "topLeft", { x: -120, y: 80 });

  const snapshot = await getEditorStoreSnapshot(page);
  expect(snapshot.viewportTransientState.transformSession).toEqual({
    kind: "none"
  });
  expect(snapshot.document.modelInstances[fixtures.modelInstance.id].position).not.toEqual(fixtures.modelInstance.position);
});
