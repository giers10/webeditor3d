import { expect, test } from "@playwright/test";
import { clickViewport, setViewportCreationPreview } from "./viewport-test-helpers";
test("Trigger Volume enter can teleport the player to a Teleport Target", async ({ page }) => {
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
    await page.getByTestId("outliner-add-button").click();
    await page.getByTestId("add-menu-entities").click();
    await page.getByTestId("add-menu-player-start").click();
    await setViewportCreationPreview(page, "topLeft", { kind: "entity", entityKind: "playerStart", audioAssetId: null }, { x: 0, y: 0, z: 0 });
    await clickViewport(page, "topLeft");
    await page.getByTestId("outliner-add-button").click();
    await page.getByTestId("add-menu-entities").click();
    await page.getByTestId("add-menu-trigger-volume").click();
    await setViewportCreationPreview(page, "topLeft", { kind: "entity", entityKind: "triggerVolume", audioAssetId: null }, { x: 0, y: 0, z: 0 });
    await clickViewport(page, "topLeft");
    await page.getByTestId("outliner-add-button").click();
    await page.getByTestId("add-menu-entities").click();
    await page.getByTestId("add-menu-teleport-target").click();
    await setViewportCreationPreview(page, "topLeft", { kind: "entity", entityKind: "teleportTarget", audioAssetId: null }, { x: 0, y: 0, z: 0 });
    await clickViewport(page, "topLeft");
    await page.getByTestId("teleportTarget-position-x").fill("6");
    await page.getByTestId("teleportTarget-position-x").press("Tab");
    await page
        .locator('[data-testid^="outliner-entity-"]')
        .filter({ hasText: "Trigger Volume" })
        .first()
        .click();
    await page.getByTestId("add-trigger-teleport-link").click();
    await page.getByRole("button", { name: "First Person" }).first().click();
    await page.getByTestId("enter-run-mode").click();
    await expect(page.getByTestId("runner-shell")).toBeVisible();
    await expect(page.getByTestId("runner-player-position")).toContainText("6.00,");
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
});
