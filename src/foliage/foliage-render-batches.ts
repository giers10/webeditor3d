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

export interface FoliageRenderChunk {
  key: string;
  chunkId: string;
  terrainId: string;
  layerId: string;
  prototypeId: string;
  chunkBounds: DerivedFoliageScatterChunk["bounds"];
  center: Vec3;
  radius: number;
  lods: FoliageRenderLod[];
  batchKeysByLodLevel: Partial<Record<FoliagePrototypeLodLevel, string>>;
  lodBias: number;
  maxCullDistance: number;
}

export interface FoliageRenderResourcePlan {
  batches: FoliageRenderBatch[];
  chunks: FoliageRenderChunk[];
}

const IDENTITY_SOURCE_MATRIX = new Matrix4();
const UP_VECTOR = new Vector3(0, 1, 0);
const DEFAULT_FOLIAGE_LOD_HYSTERESIS_RATIO = 0.08;
const MIN_FOLIAGE_LOD_HYSTERESIS_DISTANCE = 0.5;

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

function createChunkMetrics(
  chunk: Pick<DerivedFoliageScatterChunk, "bounds">
): { center: Vec3; radius: number } {
  const center = getChunkCenter(chunk);

  return {
    center,
    radius: Math.max(
      distanceBetween(center, chunk.bounds.min),
      distanceBetween(center, chunk.bounds.max)
    )
  };
}

function distanceFromPointToCachedChunkCenter(
  chunk: Pick<FoliageRenderChunk, "center">,
  point: Vec3
): number {
  return distanceBetween(chunk.center, point);
}

function getHysteresisDistance(distance: number, ratio: number): number {
  const normalizedRatio = Math.max(0, ratio);

  if (normalizedRatio <= 0) {
    return 0;
  }

  return Math.max(
    MIN_FOLIAGE_LOD_HYSTERESIS_DISTANCE,
    Math.max(0, distance) * normalizedRatio
  );
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
  previousLodLevel?: FoliagePrototypeLodLevel | null;
  hysteresisRatio?: number;
}): FoliageRenderLod | null {
  const {
    lods,
    cameraDistance,
    lodBias,
    maxDistanceMultiplier,
    previousLodLevel = null,
    hysteresisRatio = 0
  } = options;
  const distanceMultiplier = Math.max(0, maxDistanceMultiplier);
  const biasedDistance = Math.max(
    0,
    cameraDistance * (1 + clamp(lodBias, -1, 1) * 0.12)
  );
  const previousLodIndex =
    previousLodLevel === null
      ? -1
      : lods.findIndex((lod) => lod.level === previousLodLevel);

  if (previousLodIndex >= 0) {
    const previousLod = lods[previousLodIndex]!;
    const lowerDistance =
      previousLodIndex === 0
        ? 0
        : lods[previousLodIndex - 1]!.maxDistance * distanceMultiplier;
    const upperDistance = previousLod.maxDistance * distanceMultiplier;
    const hysteresisDistance = getHysteresisDistance(
      upperDistance,
      hysteresisRatio
    );

    if (
      biasedDistance >= Math.max(0, lowerDistance - hysteresisDistance) &&
      biasedDistance <= upperDistance + hysteresisDistance
    ) {
      return previousLod;
    }
  }

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

function shouldCullCachedFoliageRenderChunkByDistance(options: {
  chunk: Pick<FoliageRenderChunk, "center" | "radius">;
  cameraPosition: Vec3;
  maxDistance: number;
  hysteresisDistance?: number;
}): boolean {
  return (
    distanceFromPointToCachedChunkCenter(options.chunk, options.cameraPosition) -
      options.chunk.radius >
    options.maxDistance + (options.hysteresisDistance ?? 0)
  );
}

function shouldCullCachedFoliageRenderChunkByFrustum(options: {
  chunk: Pick<FoliageRenderChunk, "center" | "radius">;
  frustum: Frustum | null | undefined;
  sphere: Sphere;
}): boolean {
  if (options.frustum === null || options.frustum === undefined) {
    return false;
  }

  options.sphere.center.set(
    options.chunk.center.x,
    options.chunk.center.y,
    options.chunk.center.z
  );
  options.sphere.radius = options.chunk.radius;

  return !options.frustum.intersectsSphere(options.sphere);
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

export function createFoliageRenderChunkKey(options: {
  chunkId: string;
  terrainId: string;
  layerId: string;
  prototypeId: string;
}): string {
  return [
    options.chunkId,
    options.terrainId,
    options.layerId,
    options.prototypeId
  ].join("|");
}

function resolveFoliageLodCastShadow(
  lod: FoliageRenderLod,
  quality: FoliageQualitySettings
): boolean {
  return quality.shadows === "off"
    ? false
    : quality.shadows === "full"
      ? lod.castShadow
      : lod.castShadow && lod.level <= 1;
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

      const castShadow = resolveFoliageLodCastShadow(renderLod, quality);
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

export function createFoliageRenderResourcePlan(
  scatter: FoliageScatterResult,
  prototypeRegistry: FoliagePrototypeRegistry,
  options: {
    quality?: FoliageQualitySettings | null;
  } = {}
): FoliageRenderResourcePlan {
  const quality = resolveFoliageQualitySettings(options.quality);

  if (!quality.enabled || quality.densityMultiplier <= 0) {
    return {
      batches: [],
      chunks: []
    };
  }

  const chunkGroups = new Map<
    string,
    {
      chunk: DerivedFoliageScatterChunk;
      terrainId: string;
      layerId: string;
      prototypeId: string;
      instances: DerivedFoliageInstance[];
    }
  >();

  for (const chunk of scatter.chunks) {
    for (const instance of chunk.instances) {
      const key = createFoliageRenderChunkKey({
        chunkId: chunk.id,
        terrainId: instance.terrainId,
        layerId: instance.layerId,
        prototypeId: instance.prototypeId
      });
      let group = chunkGroups.get(key);

      if (group === undefined) {
        group = {
          chunk,
          terrainId: instance.terrainId,
          layerId: instance.layerId,
          prototypeId: instance.prototypeId,
          instances: []
        };
        chunkGroups.set(key, group);
      }

      group.instances.push(instance);
    }
  }

  const chunks: FoliageRenderChunk[] = [];
  const batches: FoliageRenderBatch[] = [];

  for (const [key, group] of chunkGroups) {
    const prototype = prototypeRegistry[group.prototypeId];

    if (prototype === undefined) {
      continue;
    }

    const renderLods = getFoliagePrototypeRenderLods(prototype);

    if (renderLods.length === 0) {
      continue;
    }

    const lodBias =
      group.instances.reduce((total, instance) => total + instance.lodBias, 0) /
      group.instances.length;
    const maxCullDistance = Math.max(
      ...group.instances.map((instance) => instance.cullDistance),
      ...renderLods.map((lod) => lod.maxDistance)
    );
    const chunkMetrics = createChunkMetrics(group.chunk);
    const batchKeysByLodLevel: Partial<
      Record<FoliagePrototypeLodLevel, string>
    > = {};

    chunks.push({
      key,
      chunkId: group.chunk.id,
      terrainId: group.terrainId,
      layerId: group.layerId,
      prototypeId: group.prototypeId,
      chunkBounds: cloneChunkBounds(group.chunk.bounds),
      center: chunkMetrics.center,
      radius: chunkMetrics.radius,
      lods: renderLods,
      batchKeysByLodLevel,
      lodBias,
      maxCullDistance
    });

    for (const renderLod of renderLods) {
      const batchKey = createFoliageRenderBatchKey({
        chunkId: group.chunk.id,
        terrainId: group.terrainId,
        layerId: group.layerId,
        prototypeId: group.prototypeId,
        lodLevel: renderLod.level,
        bundledPath: renderLod.bundledPath
      });
      batchKeysByLodLevel[renderLod.level] = batchKey;
      batches.push({
        key: batchKey,
        chunkId: group.chunk.id,
        terrainId: group.terrainId,
        layerId: group.layerId,
        prototypeId: group.prototypeId,
        lodLevel: renderLod.level,
        bundledPath: renderLod.bundledPath,
        castShadow: resolveFoliageLodCastShadow(renderLod, quality),
        chunkBounds: cloneChunkBounds(group.chunk.bounds),
        instances: group.instances
      });
    }
  }

  return {
    batches: batches.sort((left, right) => left.key.localeCompare(right.key)),
    chunks: chunks.sort((left, right) => left.key.localeCompare(right.key))
  };
}

export function resolveFoliageRenderChunkLod(options: {
  chunk: FoliageRenderChunk;
  view?: FoliageRenderView | null;
  quality?: FoliageQualitySettings | null;
  previousLodLevel?: FoliagePrototypeLodLevel | null;
  hysteresisRatio?: number;
  frustumSphere?: Sphere;
}): FoliageRenderLod | null {
  const quality = resolveFoliageQualitySettings(options.quality);
  const hysteresisRatio =
    options.hysteresisRatio ?? DEFAULT_FOLIAGE_LOD_HYSTERESIS_RATIO;

  if (
    !quality.enabled ||
    quality.densityMultiplier <= 0 ||
    options.chunk.lods.length === 0
  ) {
    return null;
  }

  if (options.view === null || options.view === undefined) {
    return options.chunk.lods[0]!;
  }

  if (
    options.view.frustum !== null &&
    options.view.frustum !== undefined &&
    shouldCullCachedFoliageRenderChunkByFrustum({
      chunk: options.chunk,
      frustum: options.view.frustum,
      sphere: options.frustumSphere ?? new Sphere()
    })
  ) {
    return null;
  }

  const maxRenderDistance =
    options.chunk.maxCullDistance * quality.maxDistanceMultiplier;

  if (
    shouldCullCachedFoliageRenderChunkByDistance({
      chunk: options.chunk,
      cameraPosition: options.view.cameraPosition,
      maxDistance: maxRenderDistance,
      hysteresisDistance:
        options.previousLodLevel === null ||
        options.previousLodLevel === undefined
          ? 0
          : getHysteresisDistance(maxRenderDistance, hysteresisRatio)
    })
  ) {
    return null;
  }

  return resolveFoliageRenderLod({
    lods: options.chunk.lods,
    cameraDistance: distanceFromPointToCachedChunkCenter(
      options.chunk,
      options.view.cameraPosition
    ),
    lodBias: options.chunk.lodBias,
    maxDistanceMultiplier: quality.maxDistanceMultiplier,
    previousLodLevel: options.previousLodLevel,
    hysteresisRatio
  });
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
