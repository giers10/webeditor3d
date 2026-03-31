import { expect, test } from "@playwright/test";

test("user can create a box brush and keep it through a draft reload", async ({ page }) => {
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
  await expect(page.getByRole("button", { name: /Box Brush 1/ })).toBeVisible();
  await expect(page.getByText("1 brush selected (Box Brush 1)")).toBeVisible();
  await expect(page.getByTestId("apply-brush-position")).toHaveCount(0);
  await expect(page.getByTestId("apply-brush-size")).toHaveCount(0);
  await page.getByTestId("brush-center-y").fill("2");
  await page.getByTestId("brush-center-y").press("Tab");
  await page.getByTestId("brush-size-z").fill("4");
  await page.getByTestId("brush-size-z").press("Tab");
  await page.getByTestId("selected-brush-name").fill("Entry Room");
  await page.getByTestId("selected-brush-name").press("Tab");
  await expect(page.getByRole("button", { name: /Entry Room/ })).toBeVisible();

  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.reload();

  await expect(page.getByRole("button", { name: /Entry Room/ })).toBeVisible();
  await page.getByRole("button", { name: /Entry Room/ }).click();
  await expect(page.getByTestId("brush-center-y")).toHaveValue("2");
  await expect(page.getByTestId("brush-size-z")).toHaveValue("4");
  await expect(page.getByTestId("viewport-overlay")).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
