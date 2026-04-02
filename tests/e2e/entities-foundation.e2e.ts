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
  await expect(page.getByTestId("sound-emitter-ref-distance")).toHaveValue("6");
  await expect(page.getByTestId("sound-emitter-max-distance")).toHaveValue("24");

  await page.getByTestId("sound-emitter-ref-distance").fill("9");
  await page.getByTestId("sound-emitter-ref-distance").press("Tab");

  await page.getByTestId("sound-emitter-autoplay").click();
  await page.getByTestId("sound-emitter-loop").click();
  await expect(page.getByTestId("sound-emitter-autoplay")).toBeChecked();
  await expect(page.getByTestId("sound-emitter-loop")).toBeChecked();

  await page.getByTestId("add-entity-interactable").click();
  await expect(page.getByTestId("interactable-prompt")).toHaveValue("Use");

  await page
    .locator('[data-testid^="outliner-entity-"]')
    .filter({ hasText: "Sound Emitter" })
    .first()
    .click();

  await expect(page.getByTestId("sound-emitter-ref-distance")).toHaveValue("9");
  await expect(page.getByTestId("sound-emitter-autoplay")).toBeChecked();
  await expect(page.getByTestId("sound-emitter-loop")).toBeChecked();
  await expect(page.getByTestId("interactable-prompt")).toHaveCount(0);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
