import { Frustum, Matrix4, Quaternion, Sphere, Vector3 } from "three";

import type { Vec3 } from "../core/vector";
import {
  resolveFoliageQualitySettings,
  type FoliageQualitySettings
} from "../document/world-settings";
import type {
  FoliagePrototype,
  FoliagePrototypeLodLevel,
  FoliagePrototypeRegistry
} from "./foliage";
import type {
  DerivedFoliageInstance,
  DerivedFoliageScatterChunk,
  FoliageScatterResult
} from "./foliage-scatter";

export interface FoliageRenderLod {
  level: FoliagePrototypeLodLevel;
  bundledPath: string;
  maxDistance: number;
  castShadow: boolean;
}

export interface FoliageRenderView {
  cameraPosition: Vec3;
  frustum?: Frustum | null;
}

export interface FoliageRenderBatch {
  key: string;
  chunkId: string;
  terrainId: string;
  layerId: string;
  prototypeId: string;
  lodLevel: FoliagePrototypeLodLevel;
  bundledPath: string;
  castShadow: boolean;
  chunkBounds: DerivedFoliageScatterChunk["bounds"];
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

function distanceBetween(left: Vec3, right: Vec3): number {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function getChunkCenter(chunk: Pick<DerivedFoliageScatterChunk, "bounds">): Vec3 {
  return {
    x: (chunk.bounds.min.x + chunk.bounds.max.x) * 0.5,
    y: (chunk.bounds.min.y + chunk.bounds.max.y) * 0.5,
    z: (chunk.bounds.min.z + chunk.bounds.max.z) * 0.5
  };
}

function getChunkRadius(chunk: Pick<DerivedFoliageScatterChunk, "bounds">): number {
  const center = getChunkCenter(chunk);

  return Math.max(
    distanceBetween(center, chunk.bounds.min),
    distanceBetween(center, chunk.bounds.max)
  );
}

function cloneChunkBounds(
  bounds: DerivedFoliageScatterChunk["bounds"]
): DerivedFoliageScatterChunk["bounds"] {
  return {
    min: { ...bounds.min },
    max: { ...bounds.max }
  };
}

export function getFoliagePrototypeRenderLods(
  prototype: FoliagePrototype
): FoliageRenderLod[] {
  const renderLods: FoliageRenderLod[] = [];

  for (const lod of prototype.lods) {
    if (lod.source !== "bundled") {
      continue;
    }

    renderLods.push({
      level: lod.level,
      bundledPath: lod.bundledPath,
      maxDistance: lod.maxDistance,
      castShadow: lod.castShadow
    });
  }

  return renderLods.sort((left, right) => left.level - right.level);
}

export function resolveFoliageRenderLod(options: {
  lods: readonly FoliageRenderLod[];
  cameraDistance: number;
  lodBias: number;
  maxDistanceMultiplier: number;
}): FoliageRenderLod | null {
  const { lods, cameraDistance, lodBias, maxDistanceMultiplier } = options;
  const distanceMultiplier = Math.max(0, maxDistanceMultiplier);
  const biasedDistance = Math.max(
    0,
    cameraDistance * (1 + clamp(lodBias, -1, 1) * 0.12)
  );

  for (const lod of lods) {
    if (biasedDistance <= lod.maxDistance * distanceMultiplier) {
      return lod;
    }
  }

  return null;
}

export function shouldCullFoliageChunkByDistance(options: {
  chunk: Pick<DerivedFoliageScatterChunk, "bounds">;
  cameraPosition: Vec3;
  maxDistance: number;
}): boolean {
  const center = getChunkCenter(options.chunk);
  const radius = getChunkRadius(options.chunk);

  return distanceBetween(center, options.cameraPosition) - radius > options.maxDistance;
}

export function shouldCullFoliageChunkByFrustum(options: {
  chunk: Pick<DerivedFoliageScatterChunk, "bounds">;
  frustum: Frustum | null | undefined;
}): boolean {
  if (options.frustum === null || options.frustum === undefined) {
    return false;
  }

  const center = getChunkCenter(options.chunk);
  const sphere = new Sphere(createVector3(center), getChunkRadius(options.chunk));

  return !options.frustum.intersectsSphere(sphere);
}

export function createFoliageRenderBatchKey(options: {
  chunkId: string;
  terrainId: string;
  layerId: string;
  prototypeId: string;
  lodLevel: FoliagePrototypeLodLevel;
  bundledPath: string;
}): string {
  return [
    options.chunkId,
    options.terrainId,
    options.layerId,
    options.prototypeId,
    options.lodLevel,
    options.bundledPath
  ].join("|");
}

export function createFoliageRenderBatches(
  scatter: FoliageScatterResult,
  prototypeRegistry: FoliagePrototypeRegistry,
  options: {
    view?: FoliageRenderView | null;
    quality?: FoliageQualitySettings | null;
  } = {}
): FoliageRenderBatch[] {
  const quality = resolveFoliageQualitySettings(options.quality);

  if (!quality.enabled || quality.densityMultiplier <= 0) {
    return [];
  }

  const batches = new Map<string, FoliageRenderBatch>();

  for (const chunk of scatter.chunks) {
    if (
      shouldCullFoliageChunkByFrustum({
        chunk,
        frustum: options.view?.frustum
      })
    ) {
      continue;
    }

    for (const instance of chunk.instances) {
      const prototype = prototypeRegistry[instance.prototypeId];

      if (prototype === undefined) {
        continue;
      }

      const renderLods = getFoliagePrototypeRenderLods(prototype);

      if (renderLods.length === 0) {
        continue;
      }

      const maxRenderDistance =
        Math.max(
          instance.cullDistance,
          ...renderLods.map((lod) => lod.maxDistance)
        ) * quality.maxDistanceMultiplier;

      if (
        options.view !== null &&
        options.view !== undefined &&
        shouldCullFoliageChunkByDistance({
          chunk,
          cameraPosition: options.view.cameraPosition,
          maxDistance: maxRenderDistance
        })
      ) {
        continue;
      }

      const renderLod =
        options.view === null || options.view === undefined
          ? renderLods[0]!
          : resolveFoliageRenderLod({
              lods: renderLods,
              cameraDistance: distanceBetween(
                instance.position,
                options.view.cameraPosition
              ),
              lodBias: instance.lodBias,
              maxDistanceMultiplier: quality.maxDistanceMultiplier
            });

      if (renderLod === null) {
        continue;
      }

      const castShadow =
        quality.shadows === "off"
          ? false
          : quality.shadows === "full"
            ? renderLod.castShadow
            : renderLod.castShadow && renderLod.level <= 1;
      const key = createFoliageRenderBatchKey({
        chunkId: chunk.id,
        terrainId: instance.terrainId,
        layerId: instance.layerId,
        prototypeId: instance.prototypeId,
        lodLevel: renderLod.level,
        bundledPath: renderLod.bundledPath
      });
      let batch = batches.get(key);

      if (batch === undefined) {
        batch = {
          key,
          chunkId: chunk.id,
          terrainId: instance.terrainId,
          layerId: instance.layerId,
          prototypeId: instance.prototypeId,
          lodLevel: renderLod.level,
          bundledPath: renderLod.bundledPath,
          castShadow,
          chunkBounds: cloneChunkBounds(chunk.bounds),
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
  const yawAxis = UP_VECTOR.clone().applyQuaternion(partialTilt).normalize();
  const yaw = new Quaternion().setFromAxisAngle(yawAxis, instance.yawRadians);
  const rotation = yaw.multiply(partialTilt);
  const instanceMatrix = new Matrix4().compose(
    createVector3(instance.position),
    rotation,
    new Vector3(instance.scale, instance.scale, instance.scale)
  );

  return instanceMatrix.multiply(sourceMatrix);
}
