import { expect, test } from "@playwright/test";

test("user can place and select typed entities from the entity foundation workflow", async ({ page }) => {
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

  await page.getByTestId("add-entity-soundEmitter").click();
  await expect(page.getByTestId("sound-emitter-radius")).toHaveValue("6");

  await page.getByTestId("sound-emitter-radius").fill("9");
  await page.getByTestId("sound-emitter-radius").press("Tab");

  await page.getByTestId("add-entity-interactable").click();
  await expect(page.getByTestId("interactable-prompt")).toHaveValue("Use");

  await page
    .locator('[data-testid^="outliner-entity-"]')
    .filter({ hasText: "Sound Emitter" })
    .first()
    .click();

  await expect(page.getByTestId("sound-emitter-radius")).toHaveValue("9");
  await expect(page.getByText("Sound Emitter", { exact: true })).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
