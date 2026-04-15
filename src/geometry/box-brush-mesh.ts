import { BufferAttribute, BufferGeometry } from "three";

import type { Vec2, Vec3 } from "../core/vector";
import type {
  Brush,
  BoxEdgeId,
  BoxFaceId,
  BoxVertexId,
  FaceUvState,
  WhiteboxEdgeId,
  WhiteboxFaceId,
  WhiteboxVertexId
} from "../document/brushes";
import { transformProjectedFaceUv } from "./box-face-uvs";
import { getBrushFaceBasis, getBrushFaceNormal, getBrushLocalVertexPosition } from "./whitebox-brush";
import {
  getBoxBrushEdgeVertexIds as getTopologyBoxBrushEdgeVertexIds,
  getBoxBrushFaceVertexIds as getTopologyBoxBrushFaceVertexIds,
  getBrushEdgeIds,
  getBrushEdgeVertexIds,
  getBrushFaceIds,
  getBrushFaceVertexIds,
  getBrushVertexIds
} from "./whitebox-topology";

const WATER_TOP_FACE_RENDER_SEGMENTS = 12;

export interface BoxBrushGeometryDiagnostic {
  code: string;
  message: string;
  faceId?: WhiteboxFaceId;
}

export interface DerivedBoxBrushFaceSurface {
  faceId: WhiteboxFaceId;
  vertexIds: readonly WhiteboxVertexId[];
  triangles: Array<readonly [number, number, number]>;
  normal: Vec3;
}

export interface DerivedBoxBrushMeshData {
  geometry: BufferGeometry;
  faceIdsInOrder: WhiteboxFaceId[];
  faceSurfaces: DerivedBoxBrushFaceSurface[];
  edgeSegments: Array<{ edgeId: WhiteboxEdgeId; start: Vec3; end: Vec3 }>;
  colliderVertices: Float32Array;
  colliderIndices: Uint32Array;
  localBounds: { min: Vec3; max: Vec3 };
}

function cloneVec3(vector: Vec3): Vec3 {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function dotVec3(left: Vec3, right: Vec3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function getVectorLength(vector: Vec3): number {
  return Math.sqrt(dotVec3(vector, vector));
}

function normalizeVec3(vector: Vec3): Vec3 {
  const length = getVectorLength(vector);

  if (length <= 1e-8) {
    return { x: 0, y: 0, z: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function chooseProjectionAxes(normal: Vec3): [keyof Vec3, keyof Vec3] {
  const absoluteNormal = {
    x: Math.abs(normal.x),
    y: Math.abs(normal.y),
    z: Math.abs(normal.z)
  };

  if (absoluteNormal.x >= absoluteNormal.y && absoluteNormal.x >= absoluteNormal.z) {
    return ["y", "z"];
  }

  if (absoluteNormal.y >= absoluteNormal.z) {
    return ["x", "z"];
  }

  return ["x", "y"];
}

function projectVerticesTo2d(vertices: Vec3[], normal: Vec3): Vec2[] {
  const [uAxis, vAxis] = chooseProjectionAxes(normal);
  return vertices.map((vertex) => ({
    x: vertex[uAxis],
    y: vertex[vAxis]
  }));
}

function computeSignedArea(points: Vec2[]): number {
  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }

  return area * 0.5;
}

function isPointInTriangle(
  point: Vec2,
  triangle: [Vec2, Vec2, Vec2],
  orientation: number
): boolean {
  const [a, b, c] = triangle;
  const edges = [
    (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x),
    (c.x - b.x) * (point.y - b.y) - (c.y - b.y) * (point.x - b.x),
    (a.x - c.x) * (point.y - c.y) - (a.y - c.y) * (point.x - c.x)
  ];

  return orientation > 0
    ? edges.every((value) => value >= -1e-8)
    : edges.every((value) => value <= 1e-8);
}

function triangulateFace(vertices: Vec3[]): Array<readonly [number, number, number]> {
  if (vertices.length < 3) {
    throw new Error("Face must contain at least three vertices.");
  }

  if (vertices.length === 3) {
    return [[0, 1, 2]];
  }

  const normal = computeNewellNormal(vertices);
  const projected = projectVerticesTo2d(vertices, normal);
  const orientation = computeSignedArea(projected);

  if (Math.abs(orientation) <= 1e-8) {
    throw new Error("Face projection is degenerate.");
  }

  const remaining = vertices.map((_, index) => index);
  const triangles: Array<readonly [number, number, number]> = [];

  while (remaining.length > 3) {
    let earFound = false;

    for (let offset = 0; offset < remaining.length; offset += 1) {
      const previousIndex =
        remaining[(offset + remaining.length - 1) % remaining.length];
      const currentIndex = remaining[offset];
      const nextIndex = remaining[(offset + 1) % remaining.length];
      const previousPoint = projected[previousIndex];
      const currentPoint = projected[currentIndex];
      const nextPoint = projected[nextIndex];
      const cross =
        (currentPoint.x - previousPoint.x) * (nextPoint.y - previousPoint.y) -
        (currentPoint.y - previousPoint.y) * (nextPoint.x - previousPoint.x);

      if ((orientation > 0 && cross <= 1e-8) || (orientation < 0 && cross >= -1e-8)) {
        continue;
      }

      const candidateTriangle: [Vec2, Vec2, Vec2] = [
        previousPoint,
        currentPoint,
        nextPoint
      ];
      const containsOtherPoint = remaining.some((candidateIndex) => {
        if (
          candidateIndex === previousIndex ||
          candidateIndex === currentIndex ||
          candidateIndex === nextIndex
        ) {
          return false;
        }

        return isPointInTriangle(
          projected[candidateIndex],
          candidateTriangle,
          orientation
        );
      });

      if (containsOtherPoint) {
        continue;
      }

      triangles.push([previousIndex, currentIndex, nextIndex]);
      remaining.splice(offset, 1);
      earFound = true;
      break;
    }

    if (!earFound) {
      throw new Error("Face triangulation could not find a stable ear.");
    }
  }

  triangles.push([remaining[0], remaining[1], remaining[2]]);
  return triangles;
}

function computeNewellNormal(vertices: Vec3[]): Vec3 {
  let normal = { x: 0, y: 0, z: 0 };

  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    normal.x += (current.y - next.y) * (current.z + next.z);
    normal.y += (current.z - next.z) * (current.x + next.x);
    normal.z += (current.x - next.x) * (current.y + next.y);
  }

  return normalizeVec3(normal);
}

function projectBoxLocalVertexToFaceUv(
  vertexPosition: Vec3,
  faceId: BoxFaceId,
  faceBounds: { min: Vec3; max: Vec3 }
): Vec2 {
  switch (faceId) {
    case "posX":
      return {
        x: faceBounds.max.z - vertexPosition.z,
        y: vertexPosition.y - faceBounds.min.y
      };
    case "negX":
      return {
        x: vertexPosition.z - faceBounds.min.z,
        y: vertexPosition.y - faceBounds.min.y
      };
    case "posY":
      return {
        x: vertexPosition.x - faceBounds.min.x,
        y: faceBounds.max.z - vertexPosition.z
      };
    case "negY":
      return {
        x: vertexPosition.x - faceBounds.min.x,
        y: vertexPosition.z - faceBounds.min.z
      };
    case "posZ":
      return {
        x: vertexPosition.x - faceBounds.min.x,
        y: vertexPosition.y - faceBounds.min.y
      };
    case "negZ":
      return {
        x: faceBounds.max.x - vertexPosition.x,
        y: vertexPosition.y - faceBounds.min.y
      };
  }
}

function computeFaceBounds(vertices: Vec3[]): { min: Vec3; max: Vec3 } {
  const firstVertex = vertices[0];
  const min = { ...firstVertex };
  const max = { ...firstVertex };

  for (const vertex of vertices.slice(1)) {
    min.x = Math.min(min.x, vertex.x);
    min.y = Math.min(min.y, vertex.y);
    min.z = Math.min(min.z, vertex.z);
    max.x = Math.max(max.x, vertex.x);
    max.y = Math.max(max.y, vertex.y);
    max.z = Math.max(max.z, vertex.z);
  }

  return { min, max };
}

function getGenericFaceUvProjection(
  brush: Brush,
  faceId: WhiteboxFaceId,
  vertexPosition: Vec3
): Vec2 {
  const basis = getBrushFaceBasis(brush, faceId);
  const relative = {
    x: vertexPosition.x - basis.origin.x,
    y: vertexPosition.y - basis.origin.y,
    z: vertexPosition.z - basis.origin.z
  };

  return {
    x: dotVec3(relative, basis.uAxis),
    y: dotVec3(relative, basis.vAxis)
  };
}

function getFaceUvProjection(
  brush: Brush,
  faceId: WhiteboxFaceId,
  vertexPosition: Vec3,
  faceBounds: { min: Vec3; max: Vec3 }
): Vec2 {
  if (brush.kind === "box") {
    return projectBoxLocalVertexToFaceUv(vertexPosition, faceId as BoxFaceId, faceBounds);
  }

  return getGenericFaceUvProjection(brush, faceId, vertexPosition);
}

function computeProjectedFaceBounds(projectedUvs: Vec2[]): { min: Vec2; max: Vec2 } {
  const firstUv = projectedUvs[0];
  const min = { ...firstUv };
  const max = { ...firstUv };

  for (const projectedUv of projectedUvs.slice(1)) {
    min.x = Math.min(min.x, projectedUv.x);
    min.y = Math.min(min.y, projectedUv.y);
    max.x = Math.max(max.x, projectedUv.x);
    max.y = Math.max(max.y, projectedUv.y);
  }

  return {
    min,
    max
  };
}

function pushRenderedFaceVertex(
  positions: number[],
  normals: number[],
  uvs: number[],
  faceUvs: number[],
  indices: number[],
  vertex: Vec3,
  normal: Vec3,
  projectedUv: Vec2,
  projectedBounds: { min: Vec2; max: Vec2 },
  uvSize: Vec2,
  uvState: FaceUvState
) {
  const baseUv = {
    x: projectedUv.x - projectedBounds.min.x,
    y: projectedUv.y - projectedBounds.min.y
  };
  const transformedUv = transformProjectedFaceUv(baseUv, uvSize, uvState);

  positions.push(vertex.x, vertex.y, vertex.z);
  normals.push(normal.x, normal.y, normal.z);
  uvs.push(transformedUv.x, transformedUv.y);
  faceUvs.push(
    uvSize.x <= 1e-8 ? 0.5 : baseUv.x / uvSize.x,
    uvSize.y <= 1e-8 ? 0.5 : baseUv.y / uvSize.y
  );
  indices.push(indices.length);
}

export function getBoxBrushFaceVertexIds(faceId: BoxFaceId): readonly [
  BoxVertexId,
  BoxVertexId,
  BoxVertexId,
  BoxVertexId
] {
  return getTopologyBoxBrushFaceVertexIds(faceId);
}

export function getBoxBrushEdgeVertexIds(edgeId: BoxEdgeId): readonly [
  BoxVertexId,
  BoxVertexId
] {
  return getTopologyBoxBrushEdgeVertexIds(edgeId);
}

export function getBoxBrushLocalVertexPosition(
  brush: Brush,
  vertexId: WhiteboxVertexId
): Vec3 {
  return getBrushLocalVertexPosition(brush, vertexId);
}

export function buildBoxBrushDerivedMeshData(brush: Brush): DerivedBoxBrushMeshData {
  const diagnostics = validateBoxBrushGeometry(brush);

  if (diagnostics.length > 0) {
    throw new Error(diagnostics[0].message);
  }

  const faceIds = getBrushFaceIds(brush);
  const edgeIds = getBrushEdgeIds(brush);
  const vertexIds = getBrushVertexIds(brush);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const faceUvs: number[] = [];
  const indices: number[] = [];
  const colliderVertices: number[] = [];
  const colliderIndices: number[] = [];
  const faceSurfaces: DerivedBoxBrushFaceSurface[] = [];
  const groups: Array<{ start: number; count: number; materialIndex: number }> = [];
  const vertexIndexMap = new Map<WhiteboxVertexId, number>();

  for (const vertexId of vertexIds) {
    const vertex = brush.geometry.vertices[vertexId];
    vertexIndexMap.set(vertexId, colliderVertices.length / 3);
    colliderVertices.push(vertex.x, vertex.y, vertex.z);
  }

  for (const [materialIndex, faceId] of faceIds.entries()) {
    const faceVertexIds = getBrushFaceVertexIds(brush, faceId);
    const faceVertices = faceVertexIds.map((vertexId) =>
      getBrushLocalVertexPosition(brush, vertexId)
    );
    const triangles = triangulateFace(faceVertices);
    const normal = getBrushFaceNormal(brush, faceId);
    const faceBounds = computeFaceBounds(faceVertices);
    const projectedUvs = faceVertices.map((vertex) =>
      getFaceUvProjection(brush, faceId, vertex, faceBounds)
    );
    const projectedBounds = computeProjectedFaceBounds(projectedUvs);
    const uvSize = {
      x: projectedBounds.max.x - projectedBounds.min.x,
      y: projectedBounds.max.y - projectedBounds.min.y
    };
    const uvState = brush.faces[faceId].uv as FaceUvState;
    const indexStart = indices.length;

    faceSurfaces.push({
      faceId,
      vertexIds: faceVertexIds,
      triangles,
      normal
    });

    const useSubdividedWaterTopFace =
      brush.kind === "box" &&
      brush.volume.mode === "water" &&
      faceId === "posY" &&
      brush.volume.water.surfaceDisplacementEnabled &&
      faceVertices.length === 4;

    if (useSubdividedWaterTopFace) {
      const faceCorners = faceVertices as [Vec3, Vec3, Vec3, Vec3];
      const projectedCornerUvs = projectedUvs as [Vec2, Vec2, Vec2, Vec2];

      for (let row = 0; row < WATER_TOP_FACE_RENDER_SEGMENTS; row += 1) {
        const v0 = row / WATER_TOP_FACE_RENDER_SEGMENTS;
        const v1 = (row + 1) / WATER_TOP_FACE_RENDER_SEGMENTS;

        for (let column = 0; column < WATER_TOP_FACE_RENDER_SEGMENTS; column += 1) {
          const u0 = column / WATER_TOP_FACE_RENDER_SEGMENTS;
          const u1 = (column + 1) / WATER_TOP_FACE_RENDER_SEGMENTS;
          const quadVertices: [Vec3, Vec3, Vec3, Vec3] = [
            interpolateQuadSurfaceVertex(faceCorners, u0, v0),
            interpolateQuadSurfaceVertex(faceCorners, u1, v0),
            interpolateQuadSurfaceVertex(faceCorners, u1, v1),
            interpolateQuadSurfaceVertex(faceCorners, u0, v1)
          ];
          const quadProjectedUvs: [Vec2, Vec2, Vec2, Vec2] = [
            interpolateQuadSurfaceUv(projectedCornerUvs, u0, v0),
            interpolateQuadSurfaceUv(projectedCornerUvs, u1, v0),
            interpolateQuadSurfaceUv(projectedCornerUvs, u1, v1),
            interpolateQuadSurfaceUv(projectedCornerUvs, u0, v1)
          ];

          for (const [vertex, projectedUv] of [
            [quadVertices[0], quadProjectedUvs[0]],
            [quadVertices[1], quadProjectedUvs[1]],
            [quadVertices[2], quadProjectedUvs[2]],
            [quadVertices[0], quadProjectedUvs[0]],
            [quadVertices[2], quadProjectedUvs[2]],
            [quadVertices[3], quadProjectedUvs[3]]
          ] as const) {
            pushRenderedFaceVertex(
              positions,
              normals,
              uvs,
              faceUvs,
              indices,
              vertex,
              normal,
              projectedUv,
              projectedBounds,
              uvSize,
              uvState
            );
          }
        }
      }
    } else {
      for (const triangle of triangles) {
        for (const vertexOffset of triangle) {
          pushRenderedFaceVertex(
            positions,
            normals,
            uvs,
            faceUvs,
            indices,
            faceVertices[vertexOffset],
            normal,
            projectedUvs[vertexOffset],
            projectedBounds,
            uvSize,
            uvState
          );
        }
      }
    }

    groups.push({
      start: indexStart,
      count: indices.length - indexStart,
      materialIndex
    });

    for (const triangle of triangles) {
      colliderIndices.push(
        vertexIndexMap.get(faceVertexIds[triangle[0]]) ?? 0,
        vertexIndexMap.get(faceVertexIds[triangle[1]]) ?? 0,
        vertexIndexMap.get(faceVertexIds[triangle[2]]) ?? 0
      );
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setAttribute("faceUv", new BufferAttribute(new Float32Array(faceUvs), 2));
  geometry.setIndex(indices);

  for (const group of groups) {
    geometry.addGroup(group.start, group.count, group.materialIndex);
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const firstVertex = brush.geometry.vertices[vertexIds[0]];
  const localBounds = {
    min: cloneVec3(firstVertex),
    max: cloneVec3(firstVertex)
  };

  for (const vertexId of vertexIds) {
    const vertex = brush.geometry.vertices[vertexId];
    localBounds.min.x = Math.min(localBounds.min.x, vertex.x);
    localBounds.min.y = Math.min(localBounds.min.y, vertex.y);
    localBounds.min.z = Math.min(localBounds.min.z, vertex.z);
    localBounds.max.x = Math.max(localBounds.max.x, vertex.x);
    localBounds.max.y = Math.max(localBounds.max.y, vertex.y);
    localBounds.max.z = Math.max(localBounds.max.z, vertex.z);
  }

  return {
    geometry,
    faceIdsInOrder: faceIds,
    faceSurfaces,
    edgeSegments: edgeIds.map((edgeId) => {
      const [startId, endId] = getBrushEdgeVertexIds(brush, edgeId);
      return {
        edgeId,
        start: getBrushLocalVertexPosition(brush, startId),
        end: getBrushLocalVertexPosition(brush, endId)
      };
    }),
    colliderVertices: new Float32Array(colliderVertices),
    colliderIndices: new Uint32Array(colliderIndices),
    localBounds
  };
}

function lerpNumber(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function lerpVec3(start: Vec3, end: Vec3, amount: number): Vec3 {
  return {
    x: lerpNumber(start.x, end.x, amount),
    y: lerpNumber(start.y, end.y, amount),
    z: lerpNumber(start.z, end.z, amount)
  };
}

function lerpVec2(start: Vec2, end: Vec2, amount: number): Vec2 {
  return {
    x: lerpNumber(start.x, end.x, amount),
    y: lerpNumber(start.y, end.y, amount)
  };
}

function interpolateQuadSurfaceVertex(
  corners: readonly [Vec3, Vec3, Vec3, Vec3],
  u: number,
  v: number
): Vec3 {
  const topEdge = lerpVec3(corners[0], corners[1], u);
  const bottomEdge = lerpVec3(corners[3], corners[2], u);

  return lerpVec3(topEdge, bottomEdge, v);
}

function interpolateQuadSurfaceUv(
  corners: readonly [Vec2, Vec2, Vec2, Vec2],
  u: number,
  v: number
): Vec2 {
  const topEdge = lerpVec2(corners[0], corners[1], u);
  const bottomEdge = lerpVec2(corners[3], corners[2], u);

  return lerpVec2(topEdge, bottomEdge, v);
}

export function validateBoxBrushGeometry(brush: Brush): BoxBrushGeometryDiagnostic[] {
  const diagnostics: BoxBrushGeometryDiagnostic[] = [];

  for (const vertexId of getBrushVertexIds(brush)) {
    const vertex = brush.geometry.vertices[vertexId];
    if (!Number.isFinite(vertex.x) || !Number.isFinite(vertex.y) || !Number.isFinite(vertex.z)) {
      diagnostics.push({
        code: "invalid-box-geometry-vertex",
        message: `Whitebox vertex ${vertexId} must remain finite.`,
        faceId: undefined
      });
    }
  }

  for (const faceId of getBrushFaceIds(brush)) {
    const faceVertices = getBrushFaceVertexIds(brush, faceId).map(
      (vertexId) => brush.geometry.vertices[vertexId]
    );
    const normal = computeNewellNormal(faceVertices);

    if (getVectorLength(normal) <= 1e-8) {
      diagnostics.push({
        code: "degenerate-box-face",
        message: `Whitebox face ${faceId} is degenerate and cannot be triangulated.`,
        faceId
      });
      continue;
    }

    try {
      triangulateFace(faceVertices);
    } catch (error) {
      diagnostics.push({
        code: "invalid-box-face-triangulation",
        message:
          error instanceof Error
            ? `Whitebox face ${faceId} could not be triangulated: ${error.message}`
            : `Whitebox face ${faceId} could not be triangulated.`,
        faceId
      });
    }
  }

  return diagnostics;
}
