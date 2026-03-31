import { expect, test } from "@playwright/test";

test("app boots and shows the viewport shell", async ({ page }) => {
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

  await expect(page.getByTestId("toolbar-scene-name")).toHaveValue("Untitled Scene");
  await expect(page.getByTestId("viewport-shell")).toBeVisible();
  await expect(page.getByTestId("enter-run-mode")).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
