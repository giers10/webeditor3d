import { expect, test } from "@playwright/test";

test("first-room workflow covers create, texture, save/load, and run", async ({ page }) => {
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

  await page.getByRole("button", { name: "Box Create" }).click();
  const viewportCanvas = page.locator('[data-testid="viewport-shell"] canvas');
  if ((await viewportCanvas.count()) > 0) {
    await viewportCanvas.click();
  } else {
    await page.getByTestId("viewport-fallback-create-box").click();
  }
  await page.getByTestId("face-button-posZ").click();
  await page.getByTestId("material-button-starter-amber-grid").click();

  await page.getByRole("button", { name: "First Person" }).click();
  await expect(page.getByTestId("status-message")).toContainText("Author a Player Start before running");
  await expect(page.getByTestId("status-run-preflight")).toContainText("Blocked");

  await page.getByTestId("place-player-start").click();
  await page.getByTestId("player-start-position-x").fill("2");
  await page.getByTestId("player-start-position-x").press("Tab");
  await page.getByTestId("player-start-position-z").fill("-2");
  await page.getByTestId("player-start-position-z").press("Tab");
  await page.getByTestId("player-start-yaw").fill("90");
  await page.getByTestId("player-start-yaw").press("Tab");

  await expect(page.getByTestId("status-run-preflight")).toContainText("Ready for First Person");

  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.getByRole("button", { name: "Box Create" }).click();
  if ((await viewportCanvas.count()) > 0) {
    await viewportCanvas.click();
  } else {
    await page.getByTestId("viewport-fallback-create-box").click();
  }
  await expect(page.getByRole("button", { name: /Box Brush 2/ })).toBeVisible();

  await page.getByRole("button", { name: "Load Draft" }).click();
  await expect(page.getByRole("button", { name: /Box Brush 2/ })).toHaveCount(0);

  await page.getByRole("button", { name: /Box Brush 1/ }).click();
  await page.getByTestId("face-button-posZ").click();
  await expect(page.getByTestId("selected-face-material-name")).toContainText("Amber Grid");

  await page.getByTestId("enter-run-mode").click();

  await expect(page.getByTestId("runner-shell")).toBeVisible();
  await expect(page.getByTestId("runner-spawn-state")).toContainText("Player Start");
  await expect(page.getByTestId("runner-player-position")).toContainText("2.00, 0.00, -2.00");

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
