import {
  Euler,
  Group,
  MathUtils,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
  type BufferGeometry
} from "three";

import type { LoadedModelAsset } from "../assets/gltf-model-import";
import type { ModelInstance, ModelInstanceCollisionMode } from "../assets/model-instances";
import type { ModelAssetRecord } from "../assets/project-assets";
import type { Vec3 } from "../core/vector";

const TERRAIN_GRID_EPSILON = 1e-4;
const DYNAMIC_TRIANGLE_TARGET = 48;
const DYNAMIC_SPLIT_DEPTH_LIMIT = 3;

interface LocalTriangle {
  readonly a: Vector3;
  readonly b: Vector3;
  readonly c: Vector3;
}

interface LocalTriangleCluster {
  readonly triangles: LocalTriangle[];
}

export interface GeneratedColliderBounds {
  min: Vec3;
  max: Vec3;
}

export interface GeneratedModelColliderTransform {
  position: Vec3;
  rotationDegrees: Vec3;
  scale: Vec3;
}

interface GeneratedModelColliderBase {
  source: "modelInstance";
  instanceId: string;
  assetId: string;
  mode: ModelInstanceCollisionMode;
  visible: boolean;
  transform: GeneratedModelColliderTransform;
  localBounds: GeneratedColliderBounds;
  worldBounds: GeneratedColliderBounds;
}

export interface GeneratedModelBoxCollider extends GeneratedModelColliderBase {
  kind: "box";
  center: Vec3;
  size: Vec3;
}

export interface GeneratedModelTriMeshCollider extends GeneratedModelColliderBase {
  kind: "trimesh";
  vertices: Float32Array;
  indices: Uint32Array;
  triangleCount: number;
}

export interface GeneratedModelHeightfieldCollider extends GeneratedModelColliderBase {
  kind: "heightfield";
  rows: number;
  cols: number;
  heights: Float32Array;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface GeneratedModelCompoundColliderPiece {
  id: string;
  points: Float32Array;
  localBounds: GeneratedColliderBounds;
}

export interface GeneratedModelCompoundCollider extends GeneratedModelColliderBase {
  kind: "compound";
  pieces: GeneratedModelCompoundColliderPiece[];
  decomposition: "spatial-bisect";
  runtimeBehavior: "fixedQueryOnly";
}

export type GeneratedModelCollider =
  | GeneratedModelBoxCollider
  | GeneratedModelTriMeshCollider
  | GeneratedModelHeightfieldCollider
  | GeneratedModelCompoundCollider;

export class ModelColliderGenerationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ModelColliderGenerationError";
    this.code = code;
  }
}

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function vector3ToVec3(vector: Vector3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function createBounds(min: Vector3, max: Vector3): GeneratedColliderBounds {
  return {
    min: vector3ToVec3(min),
    max: vector3ToVec3(max)
  };
}

function createModelTransform(modelInstance: ModelInstance): GeneratedModelColliderTransform {
  return {
    position: cloneVec3(modelInstance.position),
    rotationDegrees: cloneVec3(modelInstance.rotationDegrees),
    scale: cloneVec3(modelInstance.scale)
  };
}

function createModelTransformMatrix(modelInstance: ModelInstance): Matrix4 {
  const rotation = new Euler(
    MathUtils.degToRad(modelInstance.rotationDegrees.x),
    MathUtils.degToRad(modelInstance.rotationDegrees.y),
    MathUtils.degToRad(modelInstance.rotationDegrees.z),
    "XYZ"
  );
  const quaternion = new Quaternion().setFromEuler(rotation);

  return new Matrix4().compose(
    new Vector3(modelInstance.position.x, modelInstance.position.y, modelInstance.position.z),
    quaternion,
    new Vector3(modelInstance.scale.x, modelInstance.scale.y, modelInstance.scale.z)
  );
}

function computeBoundsFromPoints(points: Iterable<Vector3>): GeneratedColliderBounds {
  const min = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  let hasPoint = false;

  for (const point of points) {
    hasPoint = true;
    min.min(point);
    max.max(point);
  }

  if (!hasPoint) {
    throw new ModelColliderGenerationError("missing-model-collider-geometry", "The selected model does not contain any collision-capable geometry.");
  }

  return createBounds(min, max);
}

function computeBoundsFromFloat32Points(points: Float32Array): GeneratedColliderBounds {
  if (points.length < 3) {
    throw new ModelColliderGenerationError("missing-model-collider-geometry", "The selected model does not contain any collision-capable geometry.");
  }

  const min = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  for (let index = 0; index < points.length; index += 3) {
    min.x = Math.min(min.x, points[index]);
    min.y = Math.min(min.y, points[index + 1]);
    min.z = Math.min(min.z, points[index + 2]);
    max.x = Math.max(max.x, points[index]);
    max.y = Math.max(max.y, points[index + 1]);
    max.z = Math.max(max.z, points[index + 2]);
  }

  return createBounds(min, max);
}

function computeWorldBoundsFromLocalBox(localBounds: GeneratedColliderBounds, modelMatrix: Matrix4): GeneratedColliderBounds {
  const min = localBounds.min;
  const max = localBounds.max;
  const corners = [
    new Vector3(min.x, min.y, min.z),
    new Vector3(min.x, min.y, max.z),
    new Vector3(min.x, max.y, min.z),
    new Vector3(min.x, max.y, max.z),
    new Vector3(max.x, min.y, min.z),
    new Vector3(max.x, min.y, max.z),
    new Vector3(max.x, max.y, min.z),
    new Vector3(max.x, max.y, max.z)
  ];

  return computeBoundsFromPoints(corners.map((corner) => corner.applyMatrix4(modelMatrix)));
}

interface PositionLikeAttribute {
  getX(index: number): number;
  getY(index: number): number;
  getZ(index: number): number;
}

function readIndexedVertex(position: PositionLikeAttribute, index: number, matrix: Matrix4): Vector3 {
  return new Vector3(position.getX(index), position.getY(index), position.getZ(index)).applyMatrix4(matrix);
}

function getMeshGeometry(object: Group | Mesh): BufferGeometry | null {
  const maybeMesh = object as Mesh & { isMesh?: boolean };

  if (maybeMesh.isMesh !== true) {
    return null;
  }

  return maybeMesh.geometry;
}

function collectMeshTriangleClusters(template: Group): LocalTriangleCluster[] {
  template.updateMatrixWorld(true);
  const clusters: LocalTriangleCluster[] = [];

  template.traverse((object) => {
    const geometry = getMeshGeometry(object as Group | Mesh);

    if (geometry === null) {
      return;
    }

    const position = geometry.getAttribute("position");

    if (position === undefined || position.itemSize < 3 || position.count < 3) {
      return;
    }

    const matrix = object.matrixWorld;
    const index = geometry.getIndex();
    const triangles: LocalTriangle[] = [];

    if (index === null) {
      for (let vertexIndex = 0; vertexIndex <= position.count - 3; vertexIndex += 3) {
        triangles.push({
          a: readIndexedVertex(position, vertexIndex, matrix),
          b: readIndexedVertex(position, vertexIndex + 1, matrix),
          c: readIndexedVertex(position, vertexIndex + 2, matrix)
        });
      }
    } else {
      for (let triangleIndex = 0; triangleIndex <= index.count - 3; triangleIndex += 3) {
        triangles.push({
          a: readIndexedVertex(position, index.getX(triangleIndex), matrix),
          b: readIndexedVertex(position, index.getX(triangleIndex + 1), matrix),
          c: readIndexedVertex(position, index.getX(triangleIndex + 2), matrix)
        });
      }
    }

    if (triangles.length > 0) {
      clusters.push({
        triangles
      });
    }
  });

  return clusters;
}

function flattenTriangleClusters(clusters: LocalTriangleCluster[]): LocalTriangle[] {
  return clusters.flatMap((cluster) => cluster.triangles);
}

function buildTriMeshBuffers(triangles: LocalTriangle[]): { vertices: Float32Array; indices: Uint32Array } {
  const vertices = new Float32Array(triangles.length * 9);
  const indices = new Uint32Array(triangles.length * 3);
  let vertexOffset = 0;

  for (let triangleIndex = 0; triangleIndex < triangles.length; triangleIndex += 1) {
    const triangle = triangles[triangleIndex];
    vertices[vertexOffset] = triangle.a.x;
    vertices[vertexOffset + 1] = triangle.a.y;
    vertices[vertexOffset + 2] = triangle.a.z;
    vertices[vertexOffset + 3] = triangle.b.x;
    vertices[vertexOffset + 4] = triangle.b.y;
    vertices[vertexOffset + 5] = triangle.b.z;
    vertices[vertexOffset + 6] = triangle.c.x;
    vertices[vertexOffset + 7] = triangle.c.y;
    vertices[vertexOffset + 8] = triangle.c.z;
    indices[triangleIndex * 3] = triangleIndex * 3;
    indices[triangleIndex * 3 + 1] = triangleIndex * 3 + 1;
    indices[triangleIndex * 3 + 2] = triangleIndex * 3 + 2;
    vertexOffset += 9;
  }

  return {
    vertices,
    indices
  };
}

function computeClusterCentroid(triangles: LocalTriangle[]): Vec3 {
  const centroid = {
    x: 0,
    y: 0,
    z: 0
  };
  let pointCount = 0;

  for (const triangle of triangles) {
    centroid.x += triangle.a.x + triangle.b.x + triangle.c.x;
    centroid.y += triangle.a.y + triangle.b.y + triangle.c.y;
    centroid.z += triangle.a.z + triangle.b.z + triangle.c.z;
    pointCount += 3;
  }

  return {
    x: centroid.x / pointCount,
    y: centroid.y / pointCount,
    z: centroid.z / pointCount
  };
}

function getTriangleBounds(triangles: LocalTriangle[]): GeneratedColliderBounds {
  return computeBoundsFromPoints(triangles.flatMap((triangle) => [triangle.a, triangle.b, triangle.c]));
}

type TriangleClusterSplit =
  | {
      kind: "leaf";
      triangles: LocalTriangle[];
    }
  | {
      kind: "split";
      left: LocalTriangle[];
      right: LocalTriangle[];
    };

function splitTriangleCluster(triangles: LocalTriangle[], depth: number): TriangleClusterSplit {
  if (triangles.length <= DYNAMIC_TRIANGLE_TARGET || depth >= DYNAMIC_SPLIT_DEPTH_LIMIT) {
    return {
      kind: "leaf",
      triangles
    };
  }

  const bounds = getTriangleBounds(triangles);
  const size = {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z
  };
  const splitAxis = size.x >= size.y && size.x >= size.z ? "x" : size.y >= size.z ? "y" : "z";
  const sortedTriangles = [...triangles].sort((left, right) => computeClusterCentroid([left])[splitAxis] - computeClusterCentroid([right])[splitAxis]);
  const splitIndex = Math.floor(sortedTriangles.length * 0.5);

  if (splitIndex <= 0 || splitIndex >= sortedTriangles.length) {
    return {
      kind: "leaf",
      triangles
    };
  }

  return {
    kind: "split",
    left: sortedTriangles.slice(0, splitIndex),
    right: sortedTriangles.slice(splitIndex)
  };
}

function collectConvexHullPointClouds(cluster: LocalTriangle[], depth = 0): Float32Array[] {
  const split = splitTriangleCluster(cluster, depth);

  if (split.kind === "leaf") {
    return [dedupeTriangleClusterPoints(split.triangles)];
  }

  return [...collectConvexHullPointClouds(split.left, depth + 1), ...collectConvexHullPointClouds(split.right, depth + 1)];
}

function quantizeCoordinate(value: number): string {
  return (Math.round(value / TERRAIN_GRID_EPSILON) * TERRAIN_GRID_EPSILON).toFixed(4);
}

function dedupeTriangleClusterPoints(triangles: LocalTriangle[]): Float32Array {
  const pointLookup = new Map<string, Vec3>();

  for (const triangle of triangles) {
    for (const point of [triangle.a, triangle.b, triangle.c]) {
      const key = `${quantizeCoordinate(point.x)}:${quantizeCoordinate(point.y)}:${quantizeCoordinate(point.z)}`;

      if (!pointLookup.has(key)) {
        pointLookup.set(key, {
          x: point.x,
          y: point.y,
          z: point.z
        });
      }
    }
  }

  if (pointLookup.size < 4) {
    throw new ModelColliderGenerationError(
      "unsupported-dynamic-model-collider",
      "Dynamic collision requires volumetric geometry that can form at least one convex hull."
    );
  }

  return new Float32Array(
    Array.from(pointLookup.values()).flatMap((point) => [point.x, point.y, point.z])
  );
}

function buildSimpleBoxCollider(modelInstance: ModelInstance, asset: ModelAssetRecord): GeneratedModelBoxCollider {
  const boundingBox = asset.metadata.boundingBox;

  if (boundingBox === null) {
    throw new ModelColliderGenerationError(
      "missing-model-collider-bounds",
      `Model instance ${modelInstance.id} cannot use simple collision because the asset does not have a measurable bounding box.`
    );
  }

  const localBounds = createBounds(
    new Vector3(boundingBox.min.x, boundingBox.min.y, boundingBox.min.z),
    new Vector3(boundingBox.max.x, boundingBox.max.y, boundingBox.max.z)
  );

  return {
    source: "modelInstance",
    instanceId: modelInstance.id,
    assetId: modelInstance.assetId,
    mode: "simple",
    kind: "box",
    visible: modelInstance.collision.visible,
    transform: createModelTransform(modelInstance),
    center: {
      x: (boundingBox.min.x + boundingBox.max.x) * 0.5,
      y: (boundingBox.min.y + boundingBox.max.y) * 0.5,
      z: (boundingBox.min.z + boundingBox.max.z) * 0.5
    },
    size: cloneVec3(boundingBox.size),
    localBounds,
    worldBounds: computeWorldBoundsFromLocalBox(localBounds, createModelTransformMatrix(modelInstance))
  };
}

function buildTriMeshCollider(modelInstance: ModelInstance, asset: ModelAssetRecord, loadedAsset: LoadedModelAsset | undefined): GeneratedModelTriMeshCollider {
  if (loadedAsset === undefined) {
    throw new ModelColliderGenerationError(
      "missing-model-collider-geometry",
      `Model instance ${modelInstance.id} cannot build ${modelInstance.collision.mode} collision until asset geometry has loaded.`
    );
  }

  const triangles = flattenTriangleClusters(collectMeshTriangleClusters(loadedAsset.template));

  if (triangles.length === 0) {
    throw new ModelColliderGenerationError(
      "missing-model-collider-geometry",
      `Model instance ${modelInstance.id} cannot use ${modelInstance.collision.mode} collision because the asset has no mesh triangles.`
    );
  }

  const buffers = buildTriMeshBuffers(triangles);
  const localBounds = computeBoundsFromFloat32Points(buffers.vertices);

  return {
    source: "modelInstance",
    instanceId: modelInstance.id,
    assetId: asset.id,
    mode: "static",
    kind: "trimesh",
    visible: modelInstance.collision.visible,
    transform: createModelTransform(modelInstance),
    vertices: buffers.vertices,
    indices: buffers.indices,
    triangleCount: triangles.length,
    localBounds,
    worldBounds: computeWorldBoundsFromLocalBox(localBounds, createModelTransformMatrix(modelInstance))
  };
}

function buildTerrainCollider(
  modelInstance: ModelInstance,
  asset: ModelAssetRecord,
  loadedAsset: LoadedModelAsset | undefined
): GeneratedModelHeightfieldCollider {
  if (loadedAsset === undefined) {
    throw new ModelColliderGenerationError(
      "missing-model-collider-geometry",
      `Model instance ${modelInstance.id} cannot build terrain collision until asset geometry has loaded.`
    );
  }

  const triangles = flattenTriangleClusters(collectMeshTriangleClusters(loadedAsset.template));

  if (triangles.length === 0) {
    throw new ModelColliderGenerationError(
      "missing-model-collider-geometry",
      `Model instance ${modelInstance.id} cannot use terrain collision because the asset has no mesh triangles.`
    );
  }

  const heightLookup = new Map<string, { x: number; y: number; z: number }>();
  const xValues = new Map<string, number>();
  const zValues = new Map<string, number>();

  for (const triangle of triangles) {
    for (const point of [triangle.a, triangle.b, triangle.c]) {
      const xKey = quantizeCoordinate(point.x);
      const zKey = quantizeCoordinate(point.z);
      const key = `${xKey}:${zKey}`;
      const previousPoint = heightLookup.get(key);

      if (previousPoint !== undefined && Math.abs(previousPoint.y - point.y) > TERRAIN_GRID_EPSILON) {
        throw new ModelColliderGenerationError(
          "unsupported-terrain-model-collider",
          `Model instance ${modelInstance.id} cannot use terrain collision because the source mesh is not a single-valued heightfield over X/Z.`
        );
      }

      heightLookup.set(key, {
        x: point.x,
        y: point.y,
        z: point.z
      });
      xValues.set(xKey, point.x);
      zValues.set(zKey, point.z);
    }
  }

  const sortedX = Array.from(xValues.values()).sort((left, right) => left - right);
  const sortedZ = Array.from(zValues.values()).sort((left, right) => left - right);

  if (sortedX.length < 2 || sortedZ.length < 2) {
    throw new ModelColliderGenerationError(
      "unsupported-terrain-model-collider",
      `Model instance ${modelInstance.id} cannot use terrain collision because the source mesh does not form a regular X/Z grid.`
    );
  }

  const expectedTriangleCount = (sortedX.length - 1) * (sortedZ.length - 1) * 2;

  if (triangles.length !== expectedTriangleCount) {
    throw new ModelColliderGenerationError(
      "unsupported-terrain-model-collider",
      `Model instance ${modelInstance.id} cannot use terrain collision because the source mesh is not a clean regular-grid terrain surface.`
    );
  }

  const heights = new Float32Array(sortedX.length * sortedZ.length);

  for (let zIndex = 0; zIndex < sortedZ.length; zIndex += 1) {
    for (let xIndex = 0; xIndex < sortedX.length; xIndex += 1) {
      const key = `${quantizeCoordinate(sortedX[xIndex])}:${quantizeCoordinate(sortedZ[zIndex])}`;
      const point = heightLookup.get(key);

      if (point === undefined) {
        throw new ModelColliderGenerationError(
          "unsupported-terrain-model-collider",
          `Model instance ${modelInstance.id} cannot use terrain collision because the source mesh is missing one or more regular-grid height samples.`
        );
      }

      heights[xIndex + zIndex * sortedX.length] = point.y;
    }
  }

  const localBounds = computeBoundsFromPoints(
    Array.from(heightLookup.values(), (point) => new Vector3(point.x, point.y, point.z))
  );

  return {
    source: "modelInstance",
    instanceId: modelInstance.id,
    assetId: asset.id,
    mode: "terrain",
    kind: "heightfield",
    visible: modelInstance.collision.visible,
    transform: createModelTransform(modelInstance),
    rows: sortedX.length,
    cols: sortedZ.length,
    heights,
    minX: sortedX[0],
    maxX: sortedX.at(-1) ?? sortedX[0],
    minZ: sortedZ[0],
    maxZ: sortedZ.at(-1) ?? sortedZ[0],
    localBounds,
    worldBounds: computeWorldBoundsFromLocalBox(localBounds, createModelTransformMatrix(modelInstance))
  };
}

function buildDynamicCollider(
  modelInstance: ModelInstance,
  asset: ModelAssetRecord,
  loadedAsset: LoadedModelAsset | undefined
): GeneratedModelCompoundCollider {
  if (loadedAsset === undefined) {
    throw new ModelColliderGenerationError(
      "missing-model-collider-geometry",
      `Model instance ${modelInstance.id} cannot build dynamic collision until asset geometry has loaded.`
    );
  }

  const triangleClusters = collectMeshTriangleClusters(loadedAsset.template);

  if (triangleClusters.length === 0) {
    throw new ModelColliderGenerationError(
      "missing-model-collider-geometry",
      `Model instance ${modelInstance.id} cannot use dynamic collision because the asset has no mesh triangles.`
    );
  }

  const pieces = triangleClusters
    .flatMap((cluster) => collectConvexHullPointClouds(cluster.triangles))
    .map((points, index) => ({
      id: `${modelInstance.id}-piece-${index + 1}`,
      points,
      localBounds: computeBoundsFromFloat32Points(points)
    }));

  if (pieces.length === 0) {
    throw new ModelColliderGenerationError(
      "unsupported-dynamic-model-collider",
      `Model instance ${modelInstance.id} could not derive any convex pieces for dynamic collision.`
    );
  }

  const localBounds = computeBoundsFromPoints(
    pieces.flatMap((piece) => {
      const points: Vector3[] = [];

      for (let pointIndex = 0; pointIndex < piece.points.length; pointIndex += 3) {
        points.push(new Vector3(piece.points[pointIndex], piece.points[pointIndex + 1], piece.points[pointIndex + 2]));
      }

      return points;
    })
  );

  return {
    source: "modelInstance",
    instanceId: modelInstance.id,
    assetId: asset.id,
    mode: "dynamic",
    kind: "compound",
    visible: modelInstance.collision.visible,
    transform: createModelTransform(modelInstance),
    pieces,
    decomposition: "spatial-bisect",
    runtimeBehavior: "fixedQueryOnly",
    localBounds,
    worldBounds: computeWorldBoundsFromLocalBox(localBounds, createModelTransformMatrix(modelInstance))
  };
}

export function buildGeneratedModelCollider(
  modelInstance: ModelInstance,
  asset: ModelAssetRecord,
  loadedAsset?: LoadedModelAsset
): GeneratedModelCollider | null {
  switch (modelInstance.collision.mode) {
    case "none":
      return null;
    case "simple":
      return buildSimpleBoxCollider(modelInstance, asset);
    case "static":
      return buildTriMeshCollider(modelInstance, asset, loadedAsset);
    case "terrain":
      return buildTerrainCollider(modelInstance, asset, loadedAsset);
    case "dynamic":
      return buildDynamicCollider(modelInstance, asset, loadedAsset);
  }
}
