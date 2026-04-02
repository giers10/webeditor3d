import type { Page } from "@playwright/test";

export const DEFAULT_VIEWPORT_PANEL_ID = "topLeft";

export function getViewportPanel(page: Page, panelId: string = DEFAULT_VIEWPORT_PANEL_ID) {
  return page.getByTestId(`viewport-panel-${panelId}`);
}

export function getViewportCanvas(page: Page, panelId: string = DEFAULT_VIEWPORT_PANEL_ID) {
  return getViewportPanel(page, panelId).locator("canvas");
}

export function getViewportOverlay(page: Page, panelId: string = DEFAULT_VIEWPORT_PANEL_ID) {
  return page.getByTestId(`viewport-overlay-${panelId}`);
}

export async function clickViewport(page: Page, panelId: string = DEFAULT_VIEWPORT_PANEL_ID) {
  const viewportPanel = getViewportPanel(page, panelId);
  await viewportPanel.click({ position: { x: 16, y: 16 }, force: true });

  const viewportCanvas = getViewportCanvas(page, panelId);

  if ((await viewportCanvas.count()) > 0) {
    await viewportCanvas.click();
    return;
  }

  const fallbackButton = viewportPanel.getByTestId(`viewport-fallback-create-box-${panelId}`);
  await fallbackButton.waitFor({ state: "visible" });
  await fallbackButton.click();
}

export async function setSharedBoxCreatePreview(
  page: Page,
  panelId: string,
  center: { x: number; y: number; z: number } | null
) {
  await page.evaluate(
    ({ panelId: sourcePanelId, center: nextCenter }) => {
      const store = (window as Window & {
        __webeditor3dEditorStore?: {
          setViewportToolPreview(preview: { kind: "none" } | { kind: "box-create"; sourcePanelId: string; center: { x: number; y: number; z: number } | null }): void;
        };
      }).__webeditor3dEditorStore;

      if (store === undefined) {
        throw new Error("Editor store debug hook is unavailable.");
      }

      store.setViewportToolPreview(
        nextCenter === null
          ? { kind: "none" }
          : {
              kind: "box-create",
              sourcePanelId,
              center: nextCenter
            }
      );
    },
    {
      panelId,
      center
    }
  );
}
