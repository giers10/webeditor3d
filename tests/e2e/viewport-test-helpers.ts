import type { Page } from "@playwright/test";

import type { TransformSessionState } from "../../src/core/transform-session";
import type { SceneDocument } from "../../src/document/scene-document";
import type { EntityKind } from "../../src/entities/entity-instances";
import type { CreationTarget, ViewportToolPreview } from "../../src/viewport-three/viewport-transient-state";
import type { ViewportPanelId } from "../../src/viewport-three/viewport-layout";

export const DEFAULT_VIEWPORT_PANEL_ID: ViewportPanelId = "topLeft";

export function getViewportPanel(page: Page, panelId: string = DEFAULT_VIEWPORT_PANEL_ID) {
  return page.getByTestId(`viewport-panel-${panelId}`);
}

export function getViewportCanvas(page: Page, panelId: string = DEFAULT_VIEWPORT_PANEL_ID) {
  return getViewportPanel(page, panelId).locator("canvas");
}

export function getViewportOverlay(page: Page, panelId: string = DEFAULT_VIEWPORT_PANEL_ID) {
  return page.getByTestId(`viewport-overlay-${panelId}`);
}

interface EditorStoreSnapshot {
  selection: {
    kind: string;
    ids?: string[];
    brushId?: string;
    faceId?: string;
    edgeId?: string;
    vertexId?: string;
  };
  whiteboxSelectionMode: string;
  toolMode: string;
  document: {
    assets: Record<string, { id: string; kind: string; sourceName: string }>;
    brushes: Record<string, { center: { x: number; y: number; z: number } }>;
    modelInstances: Record<string, { position: { x: number; y: number; z: number } }>;
    entities: Record<string, { position: { x: number; y: number; z: number } }>;
  };
  viewportQuadSplit: {
    x: number;
    y: number;
  };
  viewportTransientState: {
    toolPreview: ViewportToolPreview;
    transformSession: TransformSessionState;
  };
}

export async function getEditorStoreSnapshot(page: Page): Promise<EditorStoreSnapshot> {
  return page.evaluate(() => {
    const store = (window as Window & {
      __webeditor3dEditorStore?: {
        getState(): EditorStoreSnapshot;
      };
    }).__webeditor3dEditorStore;

    if (store === undefined) {
      throw new Error("Editor store debug hook is unavailable.");
    }

    return store.getState();
  });
}

export async function getViewportToolPreview(page: Page): Promise<EditorStoreSnapshot["viewportTransientState"]["toolPreview"]> {
  const snapshot = await getEditorStoreSnapshot(page);
  return snapshot.viewportTransientState.toolPreview;
}

export async function replaceSceneDocument(page: Page, document: SceneDocument) {
  await page.evaluate((nextDocument) => {
    const store = (window as Window & {
      __webeditor3dEditorStore?: {
        replaceDocument(document: SceneDocument, resetHistory?: boolean): void;
      };
    }).__webeditor3dEditorStore;

    if (store === undefined) {
      throw new Error("Editor store debug hook is unavailable.");
    }

    store.replaceDocument(nextDocument);
  }, document);
}

export async function setViewportCreationPreview(
  page: Page,
  panelId: ViewportPanelId,
  target:
    | CreationTarget
    | {
        kind: "entity";
        entityKind: EntityKind;
        audioAssetId?: string | null;
        modelAssetId?: string | null;
      },
  center: { x: number; y: number; z: number } | null
) {
  const normalizedTarget: CreationTarget =
    target.kind === "entity"
      ? {
          kind: "entity",
          entityKind: target.entityKind,
          audioAssetId: target.audioAssetId ?? null,
          modelAssetId: target.modelAssetId ?? null
        }
      : target;

  await page.evaluate(
    ({ sourcePanelId, nextTarget, nextCenter }) => {
      const store = (window as Window & {
        __webeditor3dEditorStore?: {
          setViewportToolPreview(preview: ViewportToolPreview): void;
        };
      }).__webeditor3dEditorStore;

      if (store === undefined) {
        throw new Error("Editor store debug hook is unavailable.");
      }

      store.setViewportToolPreview({
        kind: "create",
        sourcePanelId,
        target: nextTarget,
        center: nextCenter
      });
    },
    {
      sourcePanelId: panelId,
      nextTarget: normalizedTarget,
      nextCenter: center
    }
  );
}

export async function clearViewportCreationPreview(page: Page) {
  await page.evaluate(() => {
    const store = (window as Window & {
      __webeditor3dEditorStore?: {
        setViewportToolPreview(preview: ViewportToolPreview): void;
      };
    }).__webeditor3dEditorStore;

    if (store === undefined) {
      throw new Error("Editor store debug hook is unavailable.");
    }

    store.setViewportToolPreview({
      kind: "none"
    });
  });
}

export async function beginBoxCreation(page: Page) {
  await page.getByTestId("outliner-add-button").click();
  await page.getByTestId("add-menu-box").click();
}

export async function clickViewport(page: Page, panelId: string = DEFAULT_VIEWPORT_PANEL_ID) {
  const viewportPanel = getViewportPanel(page, panelId);
  await viewportPanel.click({ position: { x: 16, y: 16 }, force: true });

  const fallbackButton = viewportPanel.getByTestId(`viewport-fallback-create-${panelId}`);

  if ((await fallbackButton.count()) > 0) {
    await fallbackButton.click();
    return;
  }

  const viewportCanvas = getViewportCanvas(page, panelId);

  if ((await viewportCanvas.count()) > 0) {
    await viewportCanvas.click();
    return;
  }
}

export async function clickViewportAtRatio(page: Page, panelId: string, xRatio: number, yRatio: number) {
  const viewportCanvas = getViewportCanvas(page, panelId);

  if ((await viewportCanvas.count()) > 0) {
    const canvasBox = await viewportCanvas.boundingBox();

    if (canvasBox !== null) {
      await viewportCanvas.click({
        position: {
          x: canvasBox.width * xRatio,
          y: canvasBox.height * yRatio
        }
      });
      return;
    }
  }

  const viewportPanel = getViewportPanel(page, panelId);
  const box = await viewportPanel.boundingBox();

  if (box === null) {
    throw new Error(`Missing viewport panel for ${panelId}.`);
  }

  await page.mouse.click(box.x + box.width * xRatio, box.y + box.height * yRatio);
}

export async function setSharedBoxCreationPreview(
  page: Page,
  panelId: ViewportPanelId,
  center: { x: number; y: number; z: number } | null
) {
  return setViewportCreationPreview(
    page,
    panelId,
    {
      kind: "box-brush"
    },
    center
  );
}
