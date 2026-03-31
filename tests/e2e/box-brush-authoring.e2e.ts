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

  await page.getByTestId("create-box-brush").click();
  await expect(page.getByText("Box Brush 1")).toBeVisible();
  await expect(page.getByText("1 brush selected (Box Brush 1)")).toBeVisible();

  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.reload();

  await expect(page.getByText("Box Brush 1")).toBeVisible();
  await expect(page.getByText("1 box brushes loaded. Click a brush in the viewport or outliner to select it.")).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
