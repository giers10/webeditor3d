import { expect, test } from "@playwright/test";

import { beginBoxCreation, clickViewport, getViewportPanel } from "./viewport-test-helpers";

test("transform status updates keep the footer and viewport heights stable", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, "webeditor3d.scene-document-draft");
  await page.reload();

  await beginBoxCreation(page);
  await clickViewport(page);

  const viewportPanel = getViewportPanel(page);
  const statusBar = page.locator("footer.status-bar").first();

  await viewportPanel.click({ position: { x: 24, y: 24 }, force: true });

  const initialViewportHeight = await viewportPanel.evaluate(
    (element) => Math.round(element.getBoundingClientRect().height)
  );
  const initialStatusBarHeight = await statusBar.evaluate(
    (element) => Math.round(element.getBoundingClientRect().height)
  );

  for (const key of ["G", "R", "S"]) {
    await page.keyboard.press(key);
    await page.keyboard.press("Z");

    const nextViewportHeight = await viewportPanel.evaluate(
      (element) => Math.round(element.getBoundingClientRect().height)
    );
    const nextStatusBarHeight = await statusBar.evaluate(
      (element) => Math.round(element.getBoundingClientRect().height)
    );

    expect(nextViewportHeight).toBe(initialViewportHeight);
    expect(nextStatusBarHeight).toBe(initialStatusBarHeight);

    await page.keyboard.press("Escape");
  }
});
