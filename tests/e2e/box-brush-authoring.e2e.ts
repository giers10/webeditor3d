import { expect, test } from "@playwright/test";

import { beginBoxCreation, clickViewport, getEditorStoreSnapshot } from "./viewport-test-helpers";

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

  await beginBoxCreation(page);
  const creationSnapshot = await getEditorStoreSnapshot(page);
  expect(creationSnapshot).toMatchObject({
    toolMode: "create",
    viewportTransientState: {
      toolPreview: {
        kind: "create",
        sourcePanelId: "topLeft",
        target: {
          kind: "box-brush"
        },
        center: null
      }
    }
  });
  await page.keyboard.press("Escape");
  const cancelledSnapshot = await getEditorStoreSnapshot(page);
  expect(cancelledSnapshot).toMatchObject({
    toolMode: "select",
    viewportTransientState: {
      toolPreview: {
        kind: "none"
      }
    }
  });

  await beginBoxCreation(page);
  await clickViewport(page);
  const committedSnapshot = await getEditorStoreSnapshot(page);
  expect(committedSnapshot).toMatchObject({
    toolMode: "select",
    viewportTransientState: {
      toolPreview: {
        kind: "none"
      }
    }
  });
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
  await expect(page.getByRole("button", { name: /^Entry Room$/ })).toBeVisible();

  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.reload();

  await expect(page.getByRole("button", { name: /^Entry Room$/ })).toBeVisible();
  await page.getByRole("button", { name: /^Entry Room$/ }).click();
  await expect(page.getByTestId("brush-center-y")).toHaveValue("2");
  await expect(page.getByTestId("brush-size-z")).toHaveValue("4");
  await expect(page.getByTestId("viewport-overlay-topLeft")).toHaveCount(0);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("switching selection while a transform input is active does not overwrite the newly selected brush", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, "webeditor3d.scene-document-draft");
  await page.reload();

  await beginBoxCreation(page);
  await clickViewport(page);
  await beginBoxCreation(page);
  await clickViewport(page);

  const outlinerButtons = page.getByTestId("outliner-brush-list").getByRole("button");

  await outlinerButtons.nth(0).click();
  await page.getByTestId("brush-size-z").fill("4");
  await outlinerButtons.nth(1).click();

  await expect(page.getByText("1 brush selected (Box Brush 2)")).toBeVisible();
  await expect(page.getByTestId("brush-size-z")).toHaveValue("2");

  await outlinerButtons.nth(0).click();
  await expect(page.getByTestId("brush-size-z")).toHaveValue("4");
});
