import { expect, test, type Locator } from "@playwright/test";

async function setColorInput(locator: Locator, value: string) {
  await locator.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;

    input.value = nextValue as string;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

test("world environment settings persist and carry into the runner", async ({ page }) => {
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

  await page.getByTestId("world-background-mode-gradient").click();
  await setColorInput(page.getByTestId("world-background-top-color"), "#6a87ab");
  await setColorInput(page.getByTestId("world-background-bottom-color"), "#151b23");
  await setColorInput(page.getByTestId("world-ambient-color"), "#d4e2ff");
  await page.getByTestId("world-ambient-intensity").fill("0.45");
  await page.getByTestId("world-ambient-intensity").press("Tab");
  await page.getByTestId("world-sun-intensity").fill("2.25");
  await page.getByTestId("world-sun-intensity").press("Tab");
  await page.getByTestId("world-sun-direction-x").fill("-1");
  await page.getByTestId("world-sun-direction-x").press("Tab");

  await expect(page.getByTestId("world-background-mode-value")).toContainText("Vertical Gradient");
  await expect(page.getByTestId("viewport-shell")).toHaveCSS("background-image", /linear-gradient/);

  await page.getByRole("button", { name: "Save Draft" }).click();

  await page.getByTestId("world-background-mode-solid").click();
  await setColorInput(page.getByTestId("world-background-solid-color"), "#223344");
  await page.getByTestId("world-ambient-intensity").fill("0.9");
  await page.getByTestId("world-ambient-intensity").press("Tab");

  await page.getByRole("button", { name: "Load Draft" }).click();

  await expect(page.getByTestId("world-background-mode-value")).toContainText("Vertical Gradient");
  await expect(page.getByTestId("world-ambient-intensity")).toHaveValue("0.45");
  await expect(page.getByTestId("viewport-shell")).toHaveCSS("background-image", /linear-gradient/);

  await page.getByTestId("enter-run-mode").click();

  await expect(page.getByTestId("runner-shell")).toBeVisible();
  await expect(page.getByTestId("runner-shell")).toHaveCSS("background-image", /linear-gradient/);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
