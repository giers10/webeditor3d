import { test, type Page } from "@playwright/test";

import { createTerrain } from "../../src/document/terrains";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";
import {
  getViewportCanvas,
  replaceSceneDocument
} from "./viewport-test-helpers";

async function sampleAnimationFrames(page: Page, frameCount: number) {
  return page.evaluate((count) => {
    return new Promise<{
      averageMs: number;
      maxMs: number;
      over24Ms: number;
      over33Ms: number;
    }>((resolve) => {
      const samples: number[] = [];
      let previous = performance.now();

      function step(now: number) {
        samples.push(now - previous);
        previous = now;

        if (samples.length >= count) {
          const sum = samples.reduce((total, value) => total + value, 0);
          resolve({
            averageMs: sum / samples.length,
            maxMs: Math.max(...samples),
            over24Ms: samples.filter((value) => value > 24).length,
            over33Ms: samples.filter((value) => value > 33).length
          });
          return;
        }

        requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    });
  }, frameCount);
}

async function installLongTaskObserver(page: Page) {
  await page.evaluate(() => {
    const targetWindow = window as Window & {
      __terrainPerfLongTasks?: { duration: number }[];
      __terrainPerfObserver?: PerformanceObserver;
    };
    targetWindow.__terrainPerfLongTasks = [];
    targetWindow.__terrainPerfObserver?.disconnect();

    if (typeof PerformanceObserver === "undefined") {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        targetWindow.__terrainPerfLongTasks?.push(
          ...list.getEntries().map((entry) => ({
            duration: entry.duration
          }))
        );
      });
      observer.observe({ entryTypes: ["longtask"] });
      targetWindow.__terrainPerfObserver = observer;
    } catch {
      // Long-task entries are not available in every browser mode.
    }
  });
}

async function readLongTaskCount(page: Page) {
  return page.evaluate(() => {
    const targetWindow = window as Window & {
      __terrainPerfLongTasks?: { duration: number }[];
    };

    return targetWindow.__terrainPerfLongTasks?.length ?? 0;
  });
}

async function resetLongTasks(page: Page) {
  await page.evaluate(() => {
    const targetWindow = window as Window & {
      __terrainPerfLongTasks?: { duration: number }[];
    };
    targetWindow.__terrainPerfLongTasks = [];
  });
}

function createTerrainScene(size: number, collisionEnabled: boolean) {
  const document = createEmptySceneDocument({
    name: `Terrain ${size} perf`
  });
  const terrain = createTerrain({
    id: `terrain-${size}`,
    sampleCountX: size,
    sampleCountZ: size,
    cellSize: 1,
    collisionEnabled
  });
  const playerStart = createPlayerStartEntity({
    id: `player-start-${size}`,
    position: {
      x: 0,
      y: 1,
      z: 0
    },
    navigationMode: "thirdPerson"
  });

  document.terrains[terrain.id] = terrain;
  document.entities[playerStart.id] = playerStart;

  return document;
}

test("terrain runner and editor zoom perf probe", async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto("/");
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, "webeditor3d.scene-document-draft");
  await page.reload();
  await installLongTaskObserver(page);

  for (const size of [100, 320, 640]) {
    await resetLongTasks(page);
    await replaceSceneDocument(page, createTerrainScene(size, true));
    await page.getByTestId("enter-run-mode").click();
    await page.getByTestId("runner-shell").waitFor({ state: "visible" });
    await page.waitForTimeout(2_000);
    const frames = await sampleAnimationFrames(page, 180);
    const longTaskCount = await readLongTaskCount(page);

    console.log(
      `runner ${size} collision=on avg=${frames.averageMs.toFixed(2)}ms max=${frames.maxMs.toFixed(2)}ms over24=${frames.over24Ms} over33=${frames.over33Ms} longTasks=${longTaskCount}`
    );

    await page.getByTestId("exit-run-mode").click();
    await page.getByTestId("viewport-shell").waitFor({ state: "visible" });
  }

  await replaceSceneDocument(page, createTerrainScene(640, false));
  await page.evaluate(() => {
    const store = (window as Window & {
      __webeditor3dEditorStore?: {
        setSelection(selection: { kind: "terrains"; ids: string[] }): void;
      };
    }).__webeditor3dEditorStore;
    store?.setSelection({ kind: "terrains", ids: ["terrain-640"] });
  });
  const canvas = getViewportCanvas(page);
  await canvas.dispatchEvent("wheel", {
    deltaY: -600,
    bubbles: true,
    cancelable: true
  });
  const editorZoomInFrames = await sampleAnimationFrames(page, 120);
  await canvas.dispatchEvent("wheel", {
    deltaY: 600,
    bubbles: true,
    cancelable: true
  });
  const editorZoomOutFrames = await sampleAnimationFrames(page, 120);

  console.log(
    `editor 640 selected zoomIn avg=${editorZoomInFrames.averageMs.toFixed(2)}ms max=${editorZoomInFrames.maxMs.toFixed(2)}ms over24=${editorZoomInFrames.over24Ms} over33=${editorZoomInFrames.over33Ms}`
  );
  console.log(
    `editor 640 selected zoomOut avg=${editorZoomOutFrames.averageMs.toFixed(2)}ms max=${editorZoomOutFrames.maxMs.toFixed(2)}ms over24=${editorZoomOutFrames.over24Ms} over33=${editorZoomOutFrames.over33Ms}`
  );
});
