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
