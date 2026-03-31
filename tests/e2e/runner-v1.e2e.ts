import { expect, test } from "@playwright/test";

test("user can place PlayerStart, enter run mode, and spawn from it", async ({ page }) => {
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

  await page.getByTestId("place-player-start").click();
  await page.getByTestId("player-start-position-x").fill("4");
  await page.getByTestId("player-start-position-y").fill("0");
  await page.getByTestId("player-start-position-z").fill("-2");
  await page.getByTestId("player-start-yaw").fill("90");
  await page.getByTestId("apply-player-start").click();

  await page.getByTestId("enter-run-mode").click();

  await expect(page.getByTestId("runner-shell")).toBeVisible();
  await expect(page.getByTestId("runner-spawn-state")).toContainText("Player Start");
  await expect(page.getByTestId("runner-player-position")).toContainText("4.00, 0.00, -2.00");

  await page.getByTestId("runner-mode-orbit-visitor").click();
  await expect(page.getByTestId("runner-mode-orbit-visitor")).toHaveClass(/toolbar__button--active/);

  await page.getByTestId("exit-run-mode").click();
  await expect(page.getByTestId("viewport-shell")).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
