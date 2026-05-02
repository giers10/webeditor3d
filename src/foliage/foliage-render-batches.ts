import { Matrix4, Quaternion, Vector3 } from "three";

import type { Vec3 } from "../core/vector";
import type { FoliagePrototype, FoliagePrototypeRegistry } from "./foliage";
import type {
  DerivedFoliageInstance,
  FoliageScatterResult
} from "./foliage-scatter";

export const FOLIAGE_RENDER_LOD_LEVEL = 0 as const;

export interface FoliageRenderBatch {
  key: string;
  terrainId: string;
  layerId: string;
  prototypeId: string;
  lodLevel: typeof FOLIAGE_RENDER_LOD_LEVEL;
  bundledPath: string;
  castShadow: boolean;
  instances: DerivedFoliageInstance[];
}

const IDENTITY_SOURCE_MATRIX = new Matrix4();
const UP_VECTOR = new Vector3(0, 1, 0);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createVector3(vector: Vec3): Vector3 {
  return new Vector3(vector.x, vector.y, vector.z);
}

export function getFoliagePrototypeRenderLod(
  prototype: FoliagePrototype
): {
  bundledPath: string;
  castShadow: boolean;
} | null {
  const lod = prototype.lods.find(
    (candidate) => candidate.level === FOLIAGE_RENDER_LOD_LEVEL
  );

  if (lod === undefined || lod.source !== "bundled") {
    return null;
  }

  return {
    bundledPath: lod.bundledPath,
    castShadow: lod.castShadow
  };
}

export function createFoliageRenderBatchKey(options: {
  terrainId: string;
  layerId: string;
  prototypeId: string;
  bundledPath: string;
}): string {
  return [
    options.terrainId,
    options.layerId,
    options.prototypeId,
    FOLIAGE_RENDER_LOD_LEVEL,
    options.bundledPath
  ].join("|");
}

export function createFoliageRenderBatches(
  scatter: FoliageScatterResult,
  prototypeRegistry: FoliagePrototypeRegistry
): FoliageRenderBatch[] {
  const batches = new Map<string, FoliageRenderBatch>();

  for (const chunk of scatter.chunks) {
    for (const instance of chunk.instances) {
      const prototype = prototypeRegistry[instance.prototypeId];

      if (prototype === undefined) {
        continue;
      }

      const renderLod = getFoliagePrototypeRenderLod(prototype);

      if (renderLod === null) {
        continue;
      }

      const key = createFoliageRenderBatchKey({
        terrainId: instance.terrainId,
        layerId: instance.layerId,
        prototypeId: instance.prototypeId,
        bundledPath: renderLod.bundledPath
      });
      let batch = batches.get(key);

      if (batch === undefined) {
        batch = {
          key,
          terrainId: instance.terrainId,
          layerId: instance.layerId,
          prototypeId: instance.prototypeId,
          lodLevel: FOLIAGE_RENDER_LOD_LEVEL,
          bundledPath: renderLod.bundledPath,
          castShadow: renderLod.castShadow,
          instances: []
        };
        batches.set(key, batch);
      }

      batch.instances.push(instance);
    }
  }

  return [...batches.values()].sort((left, right) =>
    left.key.localeCompare(right.key)
  );
}

export function createFoliageInstanceMatrix(
  instance: Pick<
    DerivedFoliageInstance,
    "position" | "normal" | "yawRadians" | "scale" | "alignToNormal"
  >,
  sourceMatrix: Matrix4 = IDENTITY_SOURCE_MATRIX
): Matrix4 {
  const normal = createVector3(instance.normal);

  if (normal.lengthSq() <= 0) {
    normal.copy(UP_VECTOR);
  } else {
    normal.normalize();
  }

  const tilt = new Quaternion().setFromUnitVectors(UP_VECTOR, normal);
  const tiltAmount = clamp(instance.alignToNormal, 0, 1);
  const partialTilt = new Quaternion().slerpQuaternions(
    new Quaternion(),
    tilt,
    tiltAmount
  );
  const yaw = new Quaternion().setFromAxisAngle(normal, instance.yawRadians);
  const rotation = yaw.multiply(partialTilt);
  const instanceMatrix = new Matrix4().compose(
    createVector3(instance.position),
    rotation,
    new Vector3(instance.scale, instance.scale, instance.scale)
  );

  return instanceMatrix.multiply(sourceMatrix);
}
