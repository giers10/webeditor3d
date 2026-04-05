export const DEFAULT_VIEWPORT_PANEL_ID = "topLeft";
export function getViewportPanel(page, panelId = DEFAULT_VIEWPORT_PANEL_ID) {
    return page.getByTestId(`viewport-panel-${panelId}`);
}
export function getViewportCanvas(page, panelId = DEFAULT_VIEWPORT_PANEL_ID) {
    return getViewportPanel(page, panelId).locator("canvas");
}
export function getViewportOverlay(page, panelId = DEFAULT_VIEWPORT_PANEL_ID) {
    return page.getByTestId(`viewport-overlay-${panelId}`);
}
export async function getEditorStoreSnapshot(page) {
    return page.evaluate(() => {
        const store = window.__webeditor3dEditorStore;
        if (store === undefined) {
            throw new Error("Editor store debug hook is unavailable.");
        }
        return store.getState();
    });
}
export async function getViewportToolPreview(page) {
    const snapshot = await getEditorStoreSnapshot(page);
    return snapshot.viewportTransientState.toolPreview;
}
export async function replaceSceneDocument(page, document) {
    await page.evaluate((nextDocument) => {
        const store = window.__webeditor3dEditorStore;
        if (store === undefined) {
            throw new Error("Editor store debug hook is unavailable.");
        }
        store.replaceDocument(nextDocument);
    }, document);
}
export async function setViewportCreationPreview(page, panelId, target, center) {
    await page.evaluate(({ sourcePanelId, nextTarget, nextCenter }) => {
        const store = window.__webeditor3dEditorStore;
        if (store === undefined) {
            throw new Error("Editor store debug hook is unavailable.");
        }
        store.setViewportToolPreview({
            kind: "create",
            sourcePanelId,
            target: nextTarget,
            center: nextCenter
        });
    }, {
        sourcePanelId: panelId,
        nextTarget: target,
        nextCenter: center
    });
}
export async function clearViewportCreationPreview(page) {
    await page.evaluate(() => {
        const store = window.__webeditor3dEditorStore;
        if (store === undefined) {
            throw new Error("Editor store debug hook is unavailable.");
        }
        store.setViewportToolPreview({
            kind: "none"
        });
    });
}
export async function beginBoxCreation(page) {
    await page.getByTestId("outliner-add-button").click();
    await page.getByTestId("add-menu-box").click();
}
export async function clickViewport(page, panelId = DEFAULT_VIEWPORT_PANEL_ID) {
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
export async function clickViewportAtRatio(page, panelId, xRatio, yRatio) {
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
export async function setSharedBoxCreationPreview(page, panelId, center) {
    return setViewportCreationPreview(page, panelId, {
        kind: "box-brush"
    }, center);
}
