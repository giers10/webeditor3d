import {
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  type Material,
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

vi.mock("../../src/foliage/bundled-foliage-model-loader", async () => {
  const three = await vi.importActual<typeof import("three")>("three");

  return {
    loadBundledFoliageModelTemplate: async (bundledPath: string) => {
      loaderState.loadCalls.push(bundledPath);

      const template = new three.Group();
      template.add(
        new three.Mesh(
          new three.BoxGeometry(1, 1, 1),
          new three.MeshStandardMaterial()
        )
      );

      return template;
    }
  };
});

import { FoliageInstancedRenderer } from "../../src/foliage/foliage-instanced-renderer";

const TEST_TERRAIN_ID = "terrain-renderer";
const TEST_LAYER_ID = "foliage-layer-renderer";

function createCamera(
  position: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number } = { x: 8, y: 0, z: 8 }
) {
  const camera = new PerspectiveCamera(60, 1, 0.1, 500);

  camera.position.set(position.x, position.y, position.z);
  camera.lookAt(target.x, target.y, target.z);
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
      shadows: "near" as const,
      windEnabled: true,
      windStrength: 1,
      windSpeed: 1,
      windDirectionDegrees: 35
    }
  };
}

function getInstancedMeshes(group: Group): InstancedMesh[] {
  const meshes: InstancedMesh[] = [];

  group.traverse((object) => {
    const maybeInstancedMesh = object as Object3D & {
      isInstancedMesh?: boolean;
    };

    if (maybeInstancedMesh.isInstancedMesh === true) {
      meshes.push(object as InstancedMesh);
    }
  });

  return meshes;
}

function getSingleMaterial(material: Material | Material[]): Material {
  return Array.isArray(material) ? material[0]! : material;
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

    renderer.updateView(
      createCamera(
        { x: 8, y: 8, z: 8 },
        {
          x: 10,
          y: 0,
          z: 8
        }
      )
    );
    await Promise.resolve();

    expect(renderer.group.children[0]).toBe(activeBatchRoot);
    expect(getInstancedMeshes(renderer.group)).toEqual(instancedMeshes);
    expect(loaderState.loadCalls).toHaveLength(initialLoadCallCount);
    expect(rebuildCount).toBe(initialRebuildCount);

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

  it("patches standard foliage materials with GPU wind attributes and uniforms", async () => {
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
    const input = createRendererInput();
    const initialRebuild = waitForRebuild();

    renderer.sync(input);
    renderer.updateView(createCamera({ x: 8, y: 8, z: 8 }));
    await initialRebuild;

    const instancedMesh = getInstancedMeshes(renderer.group)[0]!;
    const material = getSingleMaterial(instancedMesh.material);

    expect(material).toBeInstanceOf(MeshStandardMaterial);
    expect(instancedMesh.geometry.getAttribute("foliageWind")?.itemSize).toBe(
      2
    );
    expect(material.customProgramCacheKey()).toContain("foliage-wind-v1");

    const shader = {
      uniforms: {},
      vertexShader:
        "#include <common>\nvoid main() {\n#include <project_vertex>\n}",
      fragmentShader: ""
    } as any;

    material.onBeforeCompile(shader, {} as never);

    expect(shader.vertexShader).toContain("attribute vec2 foliageWind");
    expect(shader.vertexShader).toContain("foliageWindStrength");
    expect(shader.uniforms.foliageWindStrength.value).toBe(1);
    expect(shader.uniforms.foliageWindSpeed.value).toBe(1);

    const initialLoadCallCount = loaderState.loadCalls.length;
    const initialRebuildCount = rebuildCount;
    renderer.sync({
      ...input,
      quality: {
        ...input.quality,
        windStrength: 2.25,
        windSpeed: 3,
        windDirectionDegrees: 90
      }
    });
    await Promise.resolve();

    expect(getInstancedMeshes(renderer.group)[0]).toBe(instancedMesh);
    expect(loaderState.loadCalls).toHaveLength(initialLoadCallCount);
    expect(rebuildCount).toBe(initialRebuildCount);
    expect(shader.uniforms.foliageWindStrength.value).toBe(2.25);
    expect(shader.uniforms.foliageWindSpeed.value).toBe(3);
    expect(shader.uniforms.foliageWindDirection.value.x).toBeCloseTo(0, 6);
    expect(shader.uniforms.foliageWindDirection.value.y).toBeCloseTo(1, 6);

    renderer.updateWind(0.5);
    expect(shader.uniforms.foliageWindTime.value).toBeCloseTo(0.5);
  });

  it("leaves foliage materials and geometry unpatched when wind is disabled", async () => {
    const rebuildWaiters: Array<() => void> = [];
    const renderer = new FoliageInstancedRenderer({
      onRebuilt: () => {
        rebuildWaiters.shift()?.();
      }
    });
    const waitForRebuild = () =>
      new Promise<void>((resolve) => {
        rebuildWaiters.push(resolve);
      });
    const input = createRendererInput();
    const initialRebuild = waitForRebuild();

    renderer.sync({
      ...input,
      quality: {
        ...input.quality,
        windEnabled: false
      }
    });
    renderer.updateView(createCamera({ x: 8, y: 8, z: 8 }));
    await initialRebuild;

    const instancedMesh = getInstancedMeshes(renderer.group)[0]!;
    const material = getSingleMaterial(instancedMesh.material);

    expect(instancedMesh.geometry.getAttribute("foliageWind")).toBeUndefined();
    expect(material.customProgramCacheKey()).not.toContain("foliage-wind-v1");
  });

  it("writes zero wind influence for prototypes with no authored wind strength", async () => {
    const rebuildWaiters: Array<() => void> = [];
    const renderer = new FoliageInstancedRenderer({
      onRebuilt: () => {
        rebuildWaiters.shift()?.();
      }
    });
    const waitForRebuild = () =>
      new Promise<void>((resolve) => {
        rebuildWaiters.push(resolve);
      });
    const input = createRendererInput();
    const prototype = BUNDLED_FOLIAGE_PROTOTYPES[0]!;
    input.bundledFoliagePrototypes[prototype.id] = {
      ...prototype,
      windStrength: 0
    };
    const initialRebuild = waitForRebuild();

    renderer.sync(input);
    renderer.updateView(createCamera({ x: 8, y: 8, z: 8 }));
    await initialRebuild;

    const instancedMesh = getInstancedMeshes(renderer.group)[0]!;
    const windAttribute = instancedMesh.geometry.getAttribute("foliageWind")!;
    const values = Array.from(windAttribute.array as Float32Array);

    expect(values.length).toBeGreaterThan(0);
    expect(values.filter((_value, index) => index % 2 === 1)).toEqual(
      new Array(values.length / 2).fill(0)
    );
  });
});
