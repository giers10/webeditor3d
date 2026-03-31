import { expect, test } from "@playwright/test";

test("user can assign a face material through the UI and keep it through a draft reload", async ({ page }) => {
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
  await expect(viewportCanvas).toBeVisible();
  await viewportCanvas.click();
  await page.getByTestId("face-button-posZ").click();
  await page.getByTestId("material-button-starter-amber-grid").click();

  await expect(page.getByTestId("selected-face-material-name")).toContainText("Amber Grid");

  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.reload();

  await page.getByRole("button", { name: /Box Brush 1/ }).click();
  await page.getByTestId("face-button-posZ").click();
  await expect(page.getByTestId("selected-face-material-name")).toContainText("Amber Grid");

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
