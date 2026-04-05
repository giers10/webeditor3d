import { expect, test } from "@playwright/test";
import { beginBoxCreation, clickViewport, getEditorStoreSnapshot } from "./viewport-test-helpers";
test("user can create a whitebox box with float transforms and keep it through reload and run mode", async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];
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
    const creationSnapshot = await getEditorStoreSnapshot(page);
    expect(creationSnapshot).toMatchObject({
        toolMode: "create",
        viewportTransientState: {
            toolPreview: {
                kind: "create",
                sourcePanelId: "topLeft",
                target: {
                    kind: "box-brush"
                },
                center: null
            }
        }
    });
    await page.keyboard.press("Escape");
    const cancelledSnapshot = await getEditorStoreSnapshot(page);
    expect(cancelledSnapshot).toMatchObject({
        toolMode: "select",
        viewportTransientState: {
            toolPreview: {
                kind: "none"
            }
        }
    });
    await beginBoxCreation(page);
    await clickViewport(page);
    await page.getByTestId("whitebox-snap-toggle").click();
    const committedSnapshot = await getEditorStoreSnapshot(page);
    expect(committedSnapshot).toMatchObject({
        toolMode: "select",
        viewportTransientState: {
            toolPreview: {
                kind: "none"
            }
        }
    });
    await expect(page.getByRole("button", { name: /Whitebox Box 1/ })).toBeVisible();
    await expect(page.getByText("1 solid selected (Whitebox Box 1)")).toBeVisible();
    await expect(page.getByTestId("apply-brush-position")).toHaveCount(0);
    await expect(page.getByTestId("apply-brush-size")).toHaveCount(0);
    await page.getByTestId("brush-center-x").fill("1.25");
    await page.getByTestId("brush-center-x").press("Tab");
    await page.getByTestId("brush-center-y").fill("2.125");
    await page.getByTestId("brush-center-y").press("Tab");
    await page.getByTestId("brush-rotation-y").fill("37.5");
    await page.getByTestId("brush-rotation-y").press("Tab");
    await page.getByTestId("brush-size-z").fill("4.5");
    await page.getByTestId("brush-size-z").press("Tab");
    await page.getByTestId("selected-brush-name").fill("Entry Room");
    await page.getByTestId("selected-brush-name").press("Tab");
    await expect(page.getByTestId("selected-brush-name")).toHaveValue("Entry Room");
    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: /^Entry Room$/ })).toBeVisible();
    await page.getByRole("button", { name: /^Entry Room$/ }).click();
    await expect(page.getByTestId("brush-center-x")).toHaveValue("1.25");
    await expect(page.getByTestId("brush-center-y")).toHaveValue("2.125");
    await expect(page.getByTestId("brush-rotation-y")).toHaveValue("37.5");
    await expect(page.getByTestId("brush-size-z")).toHaveValue("4.5");
    await expect(page.getByTestId("viewport-overlay-topLeft")).toHaveCount(0);
    await page.getByTestId("enter-run-mode").click();
    await expect(page.getByTestId("runner-shell")).toBeVisible();
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
});
test("switching selection while a transform input is active does not overwrite the newly selected brush", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((storageKey) => {
        window.localStorage.removeItem(storageKey);
    }, "webeditor3d.scene-document-draft");
    await page.reload();
    await beginBoxCreation(page);
    await clickViewport(page);
    await beginBoxCreation(page);
    await clickViewport(page);
    const outlinerButtons = page.getByTestId("outliner-brush-list").getByRole("button");
    await outlinerButtons.nth(0).click();
    await page.getByTestId("brush-size-z").fill("4");
    await outlinerButtons.nth(1).click();
    await expect(page.getByText("1 solid selected (Whitebox Box 2)")).toBeVisible();
    await expect(page.getByTestId("brush-size-z")).toHaveValue("2");
    await outlinerButtons.nth(0).click();
    await expect(page.getByTestId("brush-size-z")).toHaveValue("4");
});
test("shift+d duplicates the current selection and does not trigger while typing", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((storageKey) => {
        window.localStorage.removeItem(storageKey);
    }, "webeditor3d.scene-document-draft");
    await page.reload();
    await beginBoxCreation(page);
    await clickViewport(page);
    const beforeDuplicateSnapshot = await getEditorStoreSnapshot(page);
    expect(beforeDuplicateSnapshot.selection).toMatchObject({
        kind: "brushes"
    });
    const sourceBrushId = beforeDuplicateSnapshot.selection.ids?.[0];
    expect(sourceBrushId).toBeDefined();
    await page.keyboard.press("Shift+D");
    const afterDuplicateSnapshot = await getEditorStoreSnapshot(page);
    expect(afterDuplicateSnapshot.selection).toMatchObject({
        kind: "brushes"
    });
    expect(Object.keys(afterDuplicateSnapshot.document.brushes)).toHaveLength(2);
    const duplicatedBrushId = afterDuplicateSnapshot.selection.ids?.[0];
    expect(duplicatedBrushId).toBeDefined();
    expect(duplicatedBrushId).not.toBe(sourceBrushId);
    const sourceCenter = beforeDuplicateSnapshot.document.brushes[sourceBrushId].center;
    const duplicatedCenter = afterDuplicateSnapshot.document.brushes[duplicatedBrushId].center;
    expect(duplicatedCenter).toEqual({
        x: sourceCenter.x + 1,
        y: sourceCenter.y,
        z: sourceCenter.z + 1
    });
    await page.getByTestId("selected-brush-name").click();
    await page.keyboard.press("Shift+D");
    const afterTypingShortcutSnapshot = await getEditorStoreSnapshot(page);
    expect(Object.keys(afterTypingShortcutSnapshot.document.brushes)).toHaveLength(2);
});
