import { test } from "@playwright/test";

import { createTerrain } from "../../src/document/terrains";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";
import { replaceSceneDocument } from "./viewport-test-helpers";

function createScene(options: { terrainSize?: number }) {
  const document = createEmptySceneDocument({
    name: `Collision readiness ${options.terrainSize ?? "empty"}`
  });
  const playerStart = createPlayerStartEntity({
    id: "player-start-probe",
    position: {
      x: 0,
      y: 1,
      z: 0
    },
    navigationMode: "thirdPerson"
  });

  document.entities[playerStart.id] = playerStart;

  if (options.terrainSize !== undefined) {
    const terrain = createTerrain({
      id: `terrain-${options.terrainSize}`,
      sampleCountX: options.terrainSize,
      sampleCountZ: options.terrainSize,
      cellSize: 1
    });

    document.terrains[terrain.id] = terrain;
  }

  return document;
}

test("collision readiness probe", async ({ page }) => {
  test.setTimeout(90_000);
  const pageErrors: string[] = [];
  const consoleMessages: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("console", (message) => {
    consoleMessages.push(`${message.type()}: ${message.text()}`);
  });

  await page.goto("/");
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, "webeditor3d.scene-document-draft");
  await page.reload();

  for (const terrainSize of [undefined, 100, 640]) {
    await replaceSceneDocument(page, createScene({ terrainSize }));
    await page.getByTestId("enter-run-mode").click();
    await page.getByTestId("runner-shell").waitFor({ state: "visible" });
    await page.waitForTimeout(5_000);
    const overlay = await page.getByTestId("runner-loading-overlay").evaluate(
      (element) => ({
        className: element.className,
        text: element.textContent
      })
    );
    const status = await page.getByTestId("runner-spawn-state").textContent();
    console.log(
      `terrain=${terrainSize ?? "none"} overlay=${JSON.stringify(overlay)} spawn=${status}`
    );
    await page.getByTestId("exit-run-mode").click();
    await page.getByTestId("viewport-shell").waitFor({ state: "visible" });
  }

  console.log(consoleMessages.join("\n"));
  console.log(`pageErrors=${JSON.stringify(pageErrors)}`);
});
