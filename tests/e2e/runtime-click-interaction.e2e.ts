import { expect, test } from "@playwright/test";

import { clickViewport, setViewportCreationPreview } from "./viewport-test-helpers";

for (const navigationMode of [
  {
    buttonLabel: "First Person",
    name: "first-person"
  },
  {
    buttonLabel: "Third Person",
    name: "third-person"
  }
] as const) {
  test(`Interactable click prompt can teleport the player in ${navigationMode.name} run mode`, async ({ page }) => {
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

    await page.getByTestId("outliner-add-button").click();
    await page.getByTestId("add-menu-entities").click();
    await page.getByTestId("add-menu-player-start").click();
    await setViewportCreationPreview(page, "topLeft", { kind: "entity", entityKind: "playerStart", audioAssetId: null }, { x: 0, y: 0, z: 0 });
    await clickViewport(page, "topLeft");
    await page.getByTestId("outliner-add-button").click();
    await page.getByTestId("add-menu-entities").click();
    await page.getByTestId("add-menu-interactable").click();
    await setViewportCreationPreview(page, "topLeft", { kind: "entity", entityKind: "interactable", audioAssetId: null }, { x: 0, y: 0, z: 0 });
    await clickViewport(page, "topLeft");
    await page.getByTestId("interactable-position-y").fill("1");
    await page.getByTestId("interactable-position-y").press("Tab");
    await page.getByTestId("interactable-position-z").fill("1");
    await page.getByTestId("interactable-position-z").press("Tab");
    await page.getByTestId("interactable-radius").fill("4");
    await page.getByTestId("interactable-radius").press("Tab");
    await page.getByTestId("interactable-prompt").fill("Use Console");
    await page.getByTestId("interactable-prompt").press("Tab");

    await page.getByTestId("outliner-add-button").click();
    await page.getByTestId("add-menu-entities").click();
    await page.getByTestId("add-menu-teleport-target").click();
    await setViewportCreationPreview(page, "topLeft", { kind: "entity", entityKind: "teleportTarget", audioAssetId: null }, { x: 0, y: 0, z: 0 });
    await clickViewport(page, "topLeft");
    await page.getByTestId("teleportTarget-position-x").fill("6");
    await page.getByTestId("teleportTarget-position-x").press("Tab");

    await page
      .locator('[data-testid^="outliner-entity-"]')
      .filter({ hasText: "Interactable" })
      .first()
      .click();

    await page.getByTestId("add-interactable-teleport-link").click();
    await page.getByRole("button", { name: navigationMode.buttonLabel }).first().click();
    await page.getByTestId("enter-run-mode").click();

    await expect(page.getByTestId("runner-shell")).toBeVisible();
    await expect(page.getByTestId("runner-interaction-state")).toContainText(
      "Ready"
    );
    await expect(page.getByTestId("runner-interaction-prompt")).toBeVisible();
    await expect(page.getByTestId("runner-interaction-prompt-text")).toContainText("Use Console");

    await page.locator('[data-testid="runner-shell"] canvas').click();
    await expect(page.getByTestId("runner-player-position")).toContainText("6.00,");

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}
