import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  type Object3D
} from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTerrain,
  createTerrainFoliageMask
} from "../../src/document/terrains";
import { BUNDLED_FOLIAGE_PROTOTYPES } from "../../src/foliage/bundled-foliage-manifest";
import { createFoliageLayer } from "../../src/foliage/foliage";

const loaderState = vi.hoisted(() => ({
  loadCalls: [] as string[]
}));

vi.mock("../../src/foliage/bundled-foliage-model-loader", () => ({
  loadBundledFoliageModelTemplate: async (bundledPath: string) => {
    loaderState.loadCalls.push(bundledPath);

    const template = new Group();
    template.add(
      new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())
    );

    return template;
  }
}));

import { FoliageInstancedRenderer } from "../../src/foliage/foliage-instanced-renderer";

const TEST_TERRAIN_ID = "terrain-renderer";
const TEST_LAYER_ID = "foliage-layer-renderer";

function createCamera(position: { x: number; y: number; z: number }) {
  const camera = new PerspectiveCamera(60, 1, 0.1, 500);

  camera.position.set(position.x, position.y, position.z);
  camera.lookAt(8, 0, 8);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  return camera;
}

function createRendererInput() {
  const prototype = BUNDLED_FOLIAGE_PROTOTYPES[0]!;
  const sampleCount = 17;
  const terrain = createTerrain({
    id: TEST_TERRAIN_ID,
    position: { x: 0, y: 0, z: 0 },
    sampleCountX: sampleCount,
    sampleCountZ: sampleCount,
    cellSize: 1,
    heights: new Array<number>(sampleCount * sampleCount).fill(0),
    foliageMasks: {
      [TEST_LAYER_ID]: createTerrainFoliageMask({
        layerId: TEST_LAYER_ID,
        resolutionX: sampleCount,
        resolutionZ: sampleCount,
        values: new Array<number>(sampleCount * sampleCount).fill(1)
      })
    }
  });
  const layer = createFoliageLayer({
    id: TEST_LAYER_ID,
    name: "Renderer foliage layer",
    prototypeIds: [prototype.id],
    density: 3,
    seed: 11
  });

  return {
    terrains: {
      [terrain.id]: terrain
    },
    foliageLayers: {
      [layer.id]: layer
    },
    bundledFoliagePrototypes: {
      [prototype.id]: prototype
    },
    quality: {
      enabled: true,
      densityMultiplier: 1,
      maxDistanceMultiplier: 1,
      shadows: "near" as const
    }
  };
}

function getInstancedMeshes(group: Group): Object3D[] {
  const meshes: Object3D[] = [];

  group.traverse((object) => {
    const maybeInstancedMesh = object as Object3D & {
      isInstancedMesh?: boolean;
    };

    if (maybeInstancedMesh.isInstancedMesh === true) {
      meshes.push(object);
    }
  });

  return meshes;
}

function getVisibleBatchKeys(group: Group): string[] {
  const keys: string[] = [];

  group.traverse((object) => {
    if (object.type !== "Group" || object.visible !== true) {
      return;
    }

    const batchKey = object.userData.foliageBatchKey;

    if (typeof batchKey === "string") {
      keys.push(batchKey);
    }
  });

  return keys.sort();
}

describe("FoliageInstancedRenderer", () => {
  beforeEach(() => {
    loaderState.loadCalls.length = 0;
  });

  it("updates camera-dependent foliage LOD by visibility without rebuilding resources", async () => {
    let rebuildCount = 0;
    const rebuildWaiters: Array<() => void> = [];
    const renderer = new FoliageInstancedRenderer({
      onRebuilt: () => {
        rebuildCount += 1;
        rebuildWaiters.shift()?.();
      }
    });
    const waitForRebuild = () =>
      new Promise<void>((resolve) => {
        rebuildWaiters.push(resolve);
      });

    const initialRebuild = waitForRebuild();
    renderer.sync(createRendererInput());
    renderer.updateView(createCamera({ x: 8, y: 8, z: 8 }));
    await initialRebuild;

    const activeBatchRoot = renderer.group.children[0];
    const instancedMeshes = getInstancedMeshes(renderer.group);
    const initialVisibleBatchKeys = getVisibleBatchKeys(renderer.group);
    const initialLoadCallCount = loaderState.loadCalls.length;
    const initialRebuildCount = rebuildCount;

    expect(activeBatchRoot).toBeDefined();
    expect(instancedMeshes.length).toBeGreaterThan(0);
    expect(initialVisibleBatchKeys.some((key) => key.includes("|0|"))).toBe(
      true
    );

    renderer.updateView(createCamera({ x: 68, y: 8, z: 8 }));
    await Promise.resolve();

    expect(renderer.group.children[0]).toBe(activeBatchRoot);
    expect(getInstancedMeshes(renderer.group)).toEqual(instancedMeshes);
    expect(loaderState.loadCalls).toHaveLength(initialLoadCallCount);
    expect(rebuildCount).toBe(initialRebuildCount);
    expect(getVisibleBatchKeys(renderer.group)).not.toEqual(
      initialVisibleBatchKeys
    );
  });
});
