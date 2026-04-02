import { expect, test } from "@playwright/test";

async function clickViewport(page: Parameters<typeof test>[1] extends (arg: infer T, ...args: never[]) => unknown ? T extends { page: infer P } ? P : never : never) {
  const viewportCanvas = page.locator('[data-testid="viewport-shell"] canvas');

  if ((await viewportCanvas.count()) > 0) {
    await viewportCanvas.click();
    return;
  }

  await page.getByTestId("viewport-fallback-create-box").click();
}

test("orthographic views keep brush authoring and selection behavior intact", async ({ page }) => {
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
  await clickViewport(page);
  await expect(page.getByRole("button", { name: /Box Brush 1/ })).toBeVisible();
  await expect(page.getByText("1 brush selected (Box Brush 1)")).toBeVisible();

  await page.getByTestId("viewport-mode-top").click();
  await expect(page.getByTestId("viewport-mode-top")).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Box Create" }).click();
  await expect(page.getByTestId("viewport-overlay")).toContainText("XZ grid");
  await clickViewport(page);
  await expect(page.getByRole("button", { name: /Box Brush 2/ })).toBeVisible();
  await expect(page.getByText("1 brush selected (Box Brush 2)")).toBeVisible();

  await page.getByTestId("viewport-mode-front").click();
  await expect(page.getByTestId("viewport-mode-front")).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Box Create" }).click();
  await expect(page.getByTestId("viewport-overlay")).toContainText("XY grid");
  await clickViewport(page);
  await expect(page.getByRole("button", { name: /Box Brush 3/ })).toBeVisible();
  await expect(page.getByText("1 brush selected (Box Brush 3)")).toBeVisible();

  await page.getByTestId("viewport-mode-side").click();
  await expect(page.getByTestId("viewport-mode-side")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("1 brush selected (Box Brush 3)")).toBeVisible();
  await expect(page.getByTestId("viewport-overlay")).toContainText("Side view active");

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
