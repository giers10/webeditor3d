import { Matrix4, Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import {
  createFoliageInstanceMatrix,
  createFoliageRenderBatches,
  createFoliageRenderResourcePlan,
  getFoliagePrototypeRenderLods,
  resolveFoliageRenderChunkLod,
  resolveFoliageRenderLod,
  shouldCullFoliageChunkByDistance
} from "../../src/foliage/foliage-render-batches";
import { BUNDLED_FOLIAGE_PROTOTYPES } from "../../src/foliage/bundled-foliage-manifest";
import {
  FOLIAGE_PROTOTYPE_LOD_LEVELS,
  createFoliagePrototype,
  type FoliagePrototype
} from "../../src/foliage/foliage";
import type {
  DerivedFoliageInstance,
  FoliageScatterResult
} from "../../src/foliage/foliage-scatter";

function createInstance(
  overrides: Partial<DerivedFoliageInstance> = {}
): DerivedFoliageInstance {
  return {
    terrainId: overrides.terrainId ?? "terrain-a",
    layerId: overrides.layerId ?? "foliage-layer-a",
    prototypeId: overrides.prototypeId ?? BUNDLED_FOLIAGE_PROTOTYPES[0]!.id,
    position: overrides.position ?? { x: 0, y: 0, z: 0 },
    normal: overrides.normal ?? { x: 0, y: 1, z: 0 },
    yawRadians: overrides.yawRadians ?? 0,
    scale: overrides.scale ?? 1,
    colorTint: overrides.colorTint ?? { r: 1, g: 1, b: 1 },
    windPhase: overrides.windPhase ?? 0,
    windStrength: overrides.windStrength ?? 0,
    lodBias: overrides.lodBias ?? 0,
    alignToNormal: overrides.alignToNormal ?? 1,
    cullDistance: overrides.cullDistance ?? 100
  };
}

function createScatter(
  instances: readonly DerivedFoliageInstance[]
): FoliageScatterResult {
  return {
    chunks: [
      {
        id: "chunk-a",
        terrainId: "terrain-a",
        layerId: "foliage-layer-a",
        chunkX: 0,
        chunkZ: 0,
        bounds: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 16, y: 0, z: 16 }
        },
        instances: [...instances]
      }
    ],
    instanceCount: instances.length
  };
}

function createProjectAssetPrototype(): FoliagePrototype {
  return createFoliagePrototype({
    id: "foliage-project-render-ignored",
    label: "Project Render Ignored",
    lods: FOLIAGE_PROTOTYPE_LOD_LEVELS.map((level) => ({
      level,
      source: "projectAsset",
      modelAssetId: `asset-project-foliage-${level}`,
      maxDistance: 30 + level * 30,
      castShadow: level === 0
    }))
  });
}

describe("foliage render batch helpers", () => {
  it("groups scatter instances by terrain chunk, layer, prototype, and active bundled LOD", () => {
    const prototype = BUNDLED_FOLIAGE_PROTOTYPES[0]!;
    const otherPrototype = BUNDLED_FOLIAGE_PROTOTYPES[1]!;
    const batches = createFoliageRenderBatches(
      createScatter([
        createInstance({ prototypeId: prototype.id }),
        createInstance({ prototypeId: prototype.id }),
        createInstance({ prototypeId: otherPrototype.id })
      ]),
      {
        [prototype.id]: prototype,
        [otherPrototype.id]: otherPrototype
      }
    );

    expect(batches).toHaveLength(2);
    expect(
      batches.find((batch) => batch.prototypeId === prototype.id)?.instances
    ).toHaveLength(2);
    expect(
      batches.find((batch) => batch.prototypeId === otherPrototype.id)
        ?.instances
    ).toHaveLength(1);
    expect(batches.every((batch) => batch.lodLevel === 0)).toBe(true);
    expect(batches.every((batch) => /_LOD0\.glb$/u.test(batch.bundledPath))).toBe(
      true
    );
    expect(batches.every((batch) => batch.chunkId === "chunk-a")).toBe(true);
  });

  it("selects foliage LODs from camera distance", () => {
    const prototype = BUNDLED_FOLIAGE_PROTOTYPES[0]!;
    const batches = createFoliageRenderBatches(
      createScatter([
        createInstance({
          prototypeId: prototype.id,
          position: { x: 0, y: 0, z: 0 }
        }),
        createInstance({
          prototypeId: prototype.id,
          position: { x: 24, y: 0, z: 0 }
        }),
        createInstance({
          prototypeId: prototype.id,
          position: { x: 54, y: 0, z: 0 }
        }),
        createInstance({
          prototypeId: prototype.id,
          position: { x: 100, y: 0, z: 0 }
        })
      ]),
      {
        [prototype.id]: prototype
      },
      {
        view: {
          cameraPosition: { x: 0, y: 0, z: 0 }
        }
      }
    );

    expect(batches.map((batch) => batch.lodLevel).sort()).toEqual([
      0, 1, 2, 3
    ]);
  });

  it("uses lodBias to vary LOD switching near a threshold", () => {
    const prototype = BUNDLED_FOLIAGE_PROTOTYPES[0]!;
    const lods = getFoliagePrototypeRenderLods(prototype);
    const earlyLod = resolveFoliageRenderLod({
      lods,
      cameraDistance: 18.5,
      lodBias: 0.5,
      maxDistanceMultiplier: 1
    });
    const delayedLod = resolveFoliageRenderLod({
      lods,
      cameraDistance: 18.5,
      lodBias: -0.5,
      maxDistanceMultiplier: 1
    });

    expect(earlyLod?.level).toBe(1);
    expect(delayedLod?.level).toBe(0);
  });

  it("culls chunks beyond the effective foliage distance", () => {
    expect(
      shouldCullFoliageChunkByDistance({
        chunk: {
          bounds: {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 16, y: 0, z: 16 }
          }
        },
        cameraPosition: { x: 200, y: 0, z: 200 },
        maxDistance: 32
      })
    ).toBe(true);
    expect(
      shouldCullFoliageChunkByDistance({
        chunk: {
          bounds: {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 16, y: 0, z: 16 }
          }
        },
        cameraPosition: { x: 12, y: 0, z: 12 },
        maxDistance: 32
      })
    ).toBe(false);
  });

  it("groups batches by chunk and LOD", () => {
    const prototype = BUNDLED_FOLIAGE_PROTOTYPES[0]!;
    const scatter: FoliageScatterResult = {
      chunks: [
        createScatter([
          createInstance({
            prototypeId: prototype.id,
            position: { x: 2, y: 0, z: 2 }
          })
        ]).chunks[0]!,
        {
          ...createScatter([
            createInstance({
              prototypeId: prototype.id,
              position: { x: 40, y: 0, z: 40 }
            })
          ]).chunks[0]!,
          id: "chunk-b",
          bounds: {
            min: { x: 32, y: 0, z: 32 },
            max: { x: 48, y: 0, z: 48 }
          }
        }
      ],
      instanceCount: 2
    };
    const batches = createFoliageRenderBatches(
      scatter,
      {
        [prototype.id]: prototype
      },
      {
        view: {
          cameraPosition: { x: 0, y: 0, z: 0 }
        }
      }
    );

    expect(batches).toHaveLength(2);
    expect(new Set(batches.map((batch) => batch.chunkId))).toEqual(
      new Set(["chunk-a", "chunk-b"])
    );
    expect(new Set(batches.map((batch) => batch.lodLevel))).toEqual(
      new Set([0, 2])
    );
  });

  it("creates persistent resource batches for every bundled chunk LOD", () => {
    const prototype = BUNDLED_FOLIAGE_PROTOTYPES[0]!;
    const plan = createFoliageRenderResourcePlan(
      createScatter([
        createInstance({ prototypeId: prototype.id }),
        createInstance({ prototypeId: prototype.id })
      ]),
      {
        [prototype.id]: prototype
      }
    );

    expect(plan.chunks).toHaveLength(1);
    expect(plan.batches).toHaveLength(prototype.lods.length);
    expect(plan.batches.map((batch) => batch.lodLevel).sort()).toEqual([
      0, 1, 2, 3
    ]);
    expect(plan.batches.every((batch) => batch.instances.length === 2)).toBe(
      true
    );
  });

  it("resolves chunk-level LOD and distance culling without rebatching", () => {
    const prototype = BUNDLED_FOLIAGE_PROTOTYPES[0]!;
    const plan = createFoliageRenderResourcePlan(
      createScatter([createInstance({ prototypeId: prototype.id })]),
      {
        [prototype.id]: prototype
      }
    );
    const chunk = plan.chunks[0]!;

    expect(
      resolveFoliageRenderChunkLod({
        chunk,
        view: {
          cameraPosition: { x: 8, y: 0, z: 8 }
        }
      })?.level
    ).toBe(0);
    expect(
      resolveFoliageRenderChunkLod({
        chunk,
        view: {
          cameraPosition: { x: 60, y: 0, z: 8 }
        }
      })?.level
    ).toBe(2);
    expect(
      resolveFoliageRenderChunkLod({
        chunk,
        view: {
          cameraPosition: { x: 500, y: 0, z: 8 }
        }
      })
    ).toBeNull();
  });

  it("returns no batches when foliage quality is disabled", () => {
    const prototype = BUNDLED_FOLIAGE_PROTOTYPES[0]!;
    const batches = createFoliageRenderBatches(
      createScatter([createInstance({ prototypeId: prototype.id })]),
      {
        [prototype.id]: prototype
      },
      {
        quality: {
          enabled: false,
          densityMultiplier: 1,
          maxDistanceMultiplier: 1,
          shadows: "near"
        }
      }
    );

    expect(batches).toEqual([]);
  });

  it("limits foliage shadows to near LODs when quality shadows are near", () => {
    const prototype = BUNDLED_FOLIAGE_PROTOTYPES[0]!;
    const batches = createFoliageRenderBatches(
      createScatter([
        createInstance({
          prototypeId: prototype.id,
          position: { x: 2, y: 0, z: 2 }
        }),
        createInstance({
          prototypeId: prototype.id,
          position: { x: 54, y: 0, z: 0 }
        })
      ]),
      {
        [prototype.id]: prototype
      },
      {
        view: {
          cameraPosition: { x: 0, y: 0, z: 0 }
        },
        quality: {
          enabled: true,
          densityMultiplier: 1,
          maxDistanceMultiplier: 1,
          shadows: "near"
        }
      }
    );

    expect(batches.find((batch) => batch.lodLevel === 0)?.castShadow).toBe(
      true
    );
    expect(batches.find((batch) => batch.lodLevel === 2)?.castShadow).toBe(
      false
    );
  });

  it("ignores prototypes that do not have a bundled render source", () => {
    const projectPrototype = createProjectAssetPrototype();
    const batches = createFoliageRenderBatches(
      createScatter([createInstance({ prototypeId: projectPrototype.id })]),
      {
        [projectPrototype.id]: projectPrototype
      }
    );

    expect(batches).toEqual([]);
  });

  it("builds instance matrices from position, scale, source matrix, and normal alignment", () => {
    const sourceMatrix = new Matrix4().makeTranslation(0, 1, 0);
    const matrix = createFoliageInstanceMatrix(
      createInstance({
        position: { x: 1, y: 2, z: 3 },
        scale: 2,
        normal: { x: 0, y: 1, z: 0 },
        alignToNormal: 1
      }),
      sourceMatrix
    );
    const position = new Vector3().setFromMatrixPosition(matrix);

    expect(position.x).toBeCloseTo(1);
    expect(position.y).toBeCloseTo(4);
    expect(position.z).toBeCloseTo(3);
  });

  it("tilts local up toward the scatter normal when alignToNormal is enabled", () => {
    const normal = new Vector3(1, 1, 0).normalize();
    const matrix = createFoliageInstanceMatrix(
      createInstance({
        normal: { x: normal.x, y: normal.y, z: normal.z },
        alignToNormal: 1
      })
    );
    const rotation = new Quaternion().setFromRotationMatrix(matrix);
    const transformedUp = new Vector3(0, 1, 0).applyQuaternion(rotation);

    expect(transformedUp.x).toBeCloseTo(normal.x, 6);
    expect(transformedUp.y).toBeCloseTo(normal.y, 6);
    expect(transformedUp.z).toBeCloseTo(normal.z, 6);
  });

  it("keeps local up vertical on slopes when alignToNormal is disabled", () => {
    const matrix = createFoliageInstanceMatrix(
      createInstance({
        normal: { x: 1, y: 1, z: 0 },
        yawRadians: Math.PI * 0.5,
        alignToNormal: 0
      })
    );
    const rotation = new Quaternion().setFromRotationMatrix(matrix);
    const transformedUp = new Vector3(0, 1, 0).applyQuaternion(rotation);

    expect(transformedUp.x).toBeCloseTo(0, 6);
    expect(transformedUp.y).toBeCloseTo(1, 6);
    expect(transformedUp.z).toBeCloseTo(0, 6);
  });
});
