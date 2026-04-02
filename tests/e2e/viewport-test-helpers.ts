import type { Page } from "@playwright/test";

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
  };
  toolMode: string;
  document: {
    assets: Record<string, { id: string; kind: string; sourceName: string }>;
    modelInstances: Record<string, { position: { x: number; y: number; z: number } }>;
    entities: Record<string, { position: { x: number; y: number; z: number } }>;
  };
  viewportTransientState: {
    toolPreview: ViewportToolPreview;
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

export async function setViewportCreationPreview(
  page: Page,
  panelId: ViewportPanelId,
  target: CreationTarget,
  center: { x: number; y: number; z: number } | null
) {
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
      nextTarget: target,
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
