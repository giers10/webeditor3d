import { BufferGeometry, Float32BufferAttribute } from "three";

import type { Vec3 } from "../core/vector";
import type { ScenePathRoadEdgeSettings } from "../document/paths";
import type { SplineCorridorJunction } from "../document/spline-corridor-junctions";
import {
  sampleTerrainHeightAtWorldPosition,
  type Terrain
} from "../document/terrains";
import {
  buildSplineCorridorJunctionFootprint,
  isSplineCorridorJunctionFootprintRoadMouthEdge,
  type SplineCorridorJunctionFootprintPoint,
  type SplineCorridorJunctionFootprintPathLike
} from "./spline-corridor-junction-footprint";
import type {
  SplineCorridorRoadEdgeSeam,
  SplineCorridorRoadEdgeSeamMap
} from "../spline-corridor/spline-corridor-clips";

export type SplineCorridorJunctionMeshPathLike =
  SplineCorridorJunctionFootprintPathLike;

export interface SplineCorridorJunctionEdgeMeshData {
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  footprintPointCount: number;
  profileVertexCount: number;
}

interface JunctionEdgeProfilePoint {
  offsetRatio: number;
  heightOffset: number;
}

function sampleHighestTerrainWorldY(
  terrains: readonly Terrain[],
  position: Vec3
): number | null {
  let highestWorldY: number | null = null;

  for (const terrain of terrains) {
    const height = sampleTerrainHeightAtWorldPosition(
      terrain,
      position.x,
      position.z,
      false
    );

    if (height === null) {
      continue;
    }

    const worldY = terrain.position.y + height;

    if (highestWorldY === null || worldY > highestWorldY) {
      highestWorldY = worldY;
    }
  }

  return highestWorldY;
}

function shouldConformToTerrain(options: {
  junction: SplineCorridorJunction;
  paths: readonly SplineCorridorJunctionMeshPathLike[];
}): boolean {
  return options.junction.connections.some((connection) => {
    const path =
      options.paths.find((candidate) => candidate.id === connection.pathId) ??
      null;

    return path?.road.terrainConform ?? false;
  });
}

function buildJunctionEdgeProfile(
  edge: ScenePathRoadEdgeSettings
): JunctionEdgeProfilePoint[] {
  switch (edge.kind) {
    case "curb":
      return [
        { offsetRatio: 0, heightOffset: 0 },
        { offsetRatio: 0, heightOffset: edge.height },
        { offsetRatio: 1, heightOffset: edge.height },
        { offsetRatio: 1, heightOffset: 0 }
      ];
    case "bank":
      return [
        { offsetRatio: 0, heightOffset: 0 },
        { offsetRatio: 1, heightOffset: edge.height },
        { offsetRatio: 1, heightOffset: 0 }
      ];
    case "ditch":
      return [
        { offsetRatio: 0, heightOffset: 0 },
        { offsetRatio: 0.5, heightOffset: -edge.height },
        { offsetRatio: 1, heightOffset: 0 }
      ];
    case "softShoulder":
      return [
        { offsetRatio: 0, heightOffset: 0 },
        { offsetRatio: 1, heightOffset: 0 }
      ];
  }
}

function normalizeXZ(vector: { x: number; z: number }): { x: number; z: number } {
  const length = Math.hypot(vector.x, vector.z);

  if (length <= 1e-8) {
    return {
      x: 1,
      z: 0
    };
  }

  return {
    x: vector.x / length,
    z: vector.z / length
  };
}

function crossXZVector(
  left: { x: number; z: number },
  right: { x: number; z: number }
): number {
  return left.x * right.z - left.z * right.x;
}

function multiplyXZVector(
  vector: { x: number; z: number },
  scalar: number
): { x: number; z: number } {
  return {
    x: vector.x * scalar,
    z: vector.z * scalar
  };
}

function getOutwardSegmentNormal(
  start: SplineCorridorJunctionFootprintPoint,
  end: SplineCorridorJunctionFootprintPoint
): { x: number; z: number } {
  const direction = normalizeXZ({
    x: end.x - start.x,
    z: end.z - start.z
  });

  // Footprints are generated counter-clockwise, so the right-hand normal is outward.
  return {
    x: direction.z,
    z: -direction.x
  };
}

function getPerimeterDistances(
  points: readonly SplineCorridorJunctionFootprintPoint[]
): number[] {
  const distances = [0];

  for (let index = 1; index <= points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index % points.length]!;
    const previousDistance = distances[index - 1]!;

    distances.push(
      previousDistance + Math.hypot(current.x - previous.x, current.z - previous.z)
    );
  }

  return distances;
}

function addJunctionEdgeProfileCap(options: {
  indices: number[];
  rowOffset: number;
  profileVertexCount: number;
  reverse: boolean;
}) {
  if (options.profileVertexCount < 3) {
    return;
  }

  for (let index = 1; index < options.profileVertexCount - 1; index += 1) {
    if (options.reverse) {
      options.indices.push(
        options.rowOffset,
        options.rowOffset + index + 1,
        options.rowOffset + index
      );
      continue;
    }

    options.indices.push(
      options.rowOffset,
      options.rowOffset + index,
      options.rowOffset + index + 1
    );
  }
}

function addProfileStrip(options: {
  indices: number[];
  startRow: number;
  endRow: number;
  profileVertexCount: number;
}) {
  for (
    let profileIndex = 0;
    profileIndex < options.profileVertexCount - 1;
    profileIndex += 1
  ) {
    const current = options.startRow + profileIndex;
    const currentNext = current + 1;
    const next = options.endRow + profileIndex;
    const nextNext = next + 1;

    options.indices.push(current, currentNext, next, next, currentNext, nextNext);
  }
}

function isRoadMouthSegment(
  points: readonly SplineCorridorJunctionFootprintPoint[],
  index: number
): boolean {
  return isSplineCorridorJunctionFootprintRoadMouthEdge(
    points[index]!,
    points[(index + 1) % points.length]!
  );
}

function getConnectionMiterOuterOffset(options: {
  point: SplineCorridorJunctionFootprintPoint;
  segmentStart: SplineCorridorJunctionFootprintPoint;
  segmentDirection: { x: number; z: number };
  segmentNormal: { x: number; z: number };
  edgeWidth: number;
}): { x: number; z: number } {
  if (options.point.connectionOutwardAxis === undefined) {
    return multiplyXZVector(options.segmentNormal, options.edgeWidth);
  }

  const connectionOutwardAxis = normalizeXZ(options.point.connectionOutwardAxis);
  const roadOuterPoint = {
    x: options.point.x + connectionOutwardAxis.x * options.edgeWidth,
    z: options.point.z + connectionOutwardAxis.z * options.edgeWidth
  };
  const roadTangent = {
    x: -connectionOutwardAxis.z,
    z: connectionOutwardAxis.x
  };
  const segmentOuterStart = {
    x: options.segmentStart.x + options.segmentNormal.x * options.edgeWidth,
    z: options.segmentStart.z + options.segmentNormal.z * options.edgeWidth
  };
  const denominator = crossXZVector(options.segmentDirection, roadTangent);

  if (Math.abs(denominator) <= 1e-6) {
    return multiplyXZVector(connectionOutwardAxis, options.edgeWidth);
  }

  const delta = {
    x: roadOuterPoint.x - segmentOuterStart.x,
    z: roadOuterPoint.z - segmentOuterStart.z
  };
  const intersectionDistance = crossXZVector(delta, roadTangent) / denominator;
  const outerPoint = {
    x: segmentOuterStart.x + options.segmentDirection.x * intersectionDistance,
    z: segmentOuterStart.z + options.segmentDirection.z * intersectionDistance
  };

  return {
    x: outerPoint.x - options.point.x,
    z: outerPoint.z - options.point.z
  };
}

function getPathEdgeWidth(options: {
  paths: readonly SplineCorridorJunctionMeshPathLike[];
  point: SplineCorridorJunctionFootprintPoint;
}): number | null {
  if (
    options.point.connectionPathId === undefined ||
    options.point.connectionSide === undefined
  ) {
    return null;
  }

  const path =
    options.paths.find((candidate) => candidate.id === options.point.connectionPathId) ??
    null;

  if (path === null) {
    return null;
  }

  const edge = path.road.edges[options.point.connectionSide];

  return edge.enabled && edge.width > 0 ? edge.width : null;
}

function getMiteredOuterOffset(options: {
  previousNormal: { x: number; z: number };
  nextNormal: { x: number; z: number };
  edgeWidth: number;
}): { x: number; z: number } {
  const miter = normalizeXZ({
    x: options.previousNormal.x + options.nextNormal.x,
    z: options.previousNormal.z + options.nextNormal.z
  });
  const scale = Math.min(
    3,
    Math.max(
      1,
      1 /
        Math.max(
          0.25,
          miter.x * options.nextNormal.x + miter.z * options.nextNormal.z
        )
    )
  );

  return multiplyXZVector(miter, options.edgeWidth * scale);
}

function getBoundaryPointOuterOffset(options: {
  points: readonly SplineCorridorJunctionFootprintPoint[];
  pointIndex: number;
  paths: readonly SplineCorridorJunctionMeshPathLike[];
  edge: ScenePathRoadEdgeSettings;
}): { x: number; z: number } {
  const points = options.points;
  const previousIndex = (options.pointIndex - 1 + points.length) % points.length;
  const nextIndex = (options.pointIndex + 1) % points.length;
  const point = points[options.pointIndex]!;
  const previousPoint = points[previousIndex]!;
  const nextPoint = points[nextIndex]!;
  const previousSegmentIsRoadMouth = isRoadMouthSegment(points, previousIndex);
  const nextSegmentIsRoadMouth = isRoadMouthSegment(points, options.pointIndex);
  const previousNormal = getOutwardSegmentNormal(previousPoint, point);
  const nextNormal = getOutwardSegmentNormal(point, nextPoint);

  if (previousSegmentIsRoadMouth && !nextSegmentIsRoadMouth) {
    return getConnectionMiterOuterOffset({
      point,
      segmentStart: point,
      segmentDirection: normalizeXZ({
        x: nextPoint.x - point.x,
        z: nextPoint.z - point.z
      }),
      segmentNormal: nextNormal,
      edgeWidth:
        getPathEdgeWidth({
          paths: options.paths,
          point
        }) ?? options.edge.width
    });
  }

  if (!previousSegmentIsRoadMouth && nextSegmentIsRoadMouth) {
    return getConnectionMiterOuterOffset({
      point,
      segmentStart: previousPoint,
      segmentDirection: normalizeXZ({
        x: point.x - previousPoint.x,
        z: point.z - previousPoint.z
      }),
      segmentNormal: previousNormal,
      edgeWidth:
        getPathEdgeWidth({
          paths: options.paths,
          point
        }) ?? options.edge.width
    });
  }

  if (previousSegmentIsRoadMouth && nextSegmentIsRoadMouth) {
    return point.connectionOutwardAxis === undefined
      ? multiplyXZVector(nextNormal, options.edge.width)
      : multiplyXZVector(
          normalizeXZ(point.connectionOutwardAxis),
          getPathEdgeWidth({
            paths: options.paths,
            point
          }) ?? options.edge.width
        );
  }

  return getMiteredOuterOffset({
    previousNormal,
    nextNormal,
    edgeWidth: options.edge.width
  });
}

function pushRoadEdgeSeam(options: {
  seamsByPath: SplineCorridorRoadEdgeSeamMap;
  junctionId: string;
  point: SplineCorridorJunctionFootprintPoint;
  outerOffset: { x: number; z: number };
}) {
  if (
    options.point.connectionPathId === undefined ||
    options.point.connectionDistance === undefined ||
    options.point.connectionSide === undefined
  ) {
    return;
  }

  const seam: SplineCorridorRoadEdgeSeam = {
    junctionId: options.junctionId,
    pathId: options.point.connectionPathId,
    side: options.point.connectionSide,
    distance: options.point.connectionDistance,
    outerOffset: options.outerOffset
  };
  const seams = options.seamsByPath.get(seam.pathId) ?? [];

  seams.push(seam);
  options.seamsByPath.set(seam.pathId, seams);
}

export function resolveSplineCorridorJunctionRoadEdgeSeams(options: {
  junctions: readonly SplineCorridorJunction[];
  paths: readonly SplineCorridorJunctionMeshPathLike[];
  terrains?: readonly Terrain[];
}): SplineCorridorRoadEdgeSeamMap {
  const seamsByPath: SplineCorridorRoadEdgeSeamMap = new Map();
  const terrains = options.terrains ?? [];

  for (const junction of options.junctions) {
    if (!junction.enabled || !junction.edge.enabled || junction.edge.width <= 0) {
      continue;
    }

    const footprint = buildSplineCorridorJunctionFootprint({
      junction,
      paths: options.paths,
      terrains
    });

    if (footprint === null || footprint.points.length < 3) {
      continue;
    }

    for (let pointIndex = 0; pointIndex < footprint.points.length; pointIndex += 1) {
      if (isRoadMouthSegment(footprint.points, pointIndex)) {
        continue;
      }

      const currentPoint = footprint.points[pointIndex]!;
      const nextPoint = footprint.points[(pointIndex + 1) % footprint.points.length]!;
      const previousSegmentIndex =
        (pointIndex - 1 + footprint.points.length) % footprint.points.length;
      const nextSegmentIndex = (pointIndex + 1) % footprint.points.length;

      if (isRoadMouthSegment(footprint.points, previousSegmentIndex)) {
        pushRoadEdgeSeam({
          seamsByPath,
          junctionId: junction.id,
          point: currentPoint,
          outerOffset: getBoundaryPointOuterOffset({
            points: footprint.points,
            pointIndex,
            paths: options.paths,
            edge: junction.edge
          })
        });
      }

      if (isRoadMouthSegment(footprint.points, nextSegmentIndex)) {
        pushRoadEdgeSeam({
          seamsByPath,
          junctionId: junction.id,
          point: nextPoint,
          outerOffset: getBoundaryPointOuterOffset({
            points: footprint.points,
            pointIndex: nextSegmentIndex,
            paths: options.paths,
            edge: junction.edge
          })
        });
      }
    }
  }

  return seamsByPath;
}

export function buildSplineCorridorJunctionEdgeMeshData(options: {
  junction: SplineCorridorJunction;
  paths: readonly SplineCorridorJunctionMeshPathLike[];
  edge: ScenePathRoadEdgeSettings;
  terrains?: readonly Terrain[];
}): SplineCorridorJunctionEdgeMeshData | null {
  if (!options.edge.enabled || options.edge.width <= 0) {
    return null;
  }

  const terrains = options.terrains ?? [];
  const footprint = buildSplineCorridorJunctionFootprint({
    junction: options.junction,
    paths: options.paths,
    terrains
  });

  if (footprint === null || footprint.points.length < 3) {
    return null;
  }

  const conformToTerrain = shouldConformToTerrain({
    junction: options.junction,
    paths: options.paths
  });
  const profile = buildJunctionEdgeProfile(options.edge);

  if (profile.length < 2) {
    return null;
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const perimeterDistances = getPerimeterDistances(footprint.points);
  const profileLastIndex = Math.max(1, profile.length - 1);

  function resolveBaseY(
    point: SplineCorridorJunctionFootprintPoint,
    x: number,
    z: number
  ): number {
    const terrainWorldY = conformToTerrain
      ? sampleHighestTerrainWorldY(terrains, {
          x,
          y: point.fallbackY,
          z
        })
      : null;

    return terrainWorldY === null
      ? point.fallbackY
      : terrainWorldY + point.heightOffset;
  }

  function pushProfileRow(optionsForRow: {
    point: SplineCorridorJunctionFootprintPoint;
    outerOffset: { x: number; z: number };
    perimeterDistance: number;
  }): number {
    const rowOffset = positions.length / 3;

    for (let profileIndex = 0; profileIndex < profile.length; profileIndex += 1) {
      const profilePoint = profile[profileIndex]!;
      const x =
        optionsForRow.point.x + optionsForRow.outerOffset.x * profilePoint.offsetRatio;
      const z =
        optionsForRow.point.z + optionsForRow.outerOffset.z * profilePoint.offsetRatio;
      const y =
        resolveBaseY(optionsForRow.point, x, z) + profilePoint.heightOffset;

      positions.push(x, y, z);
      uvs.push(
        optionsForRow.perimeterDistance,
        profileIndex / profileLastIndex
      );
    }

    return rowOffset;
  }

  const rowOffsets = footprint.points.map((point, pointIndex) =>
    pushProfileRow({
      point,
      outerOffset: getBoundaryPointOuterOffset({
        points: footprint.points,
        pointIndex,
        paths: options.paths,
        edge: options.edge
      }),
      perimeterDistance: perimeterDistances[pointIndex]!
    })
  );

  for (let pointIndex = 0; pointIndex < footprint.points.length; pointIndex += 1) {
    if (isRoadMouthSegment(footprint.points, pointIndex)) {
      continue;
    }

    const nextPointIndex = (pointIndex + 1) % footprint.points.length;
    const previousSegmentIndex =
      (pointIndex - 1 + footprint.points.length) % footprint.points.length;
    const nextSegmentIndex = (pointIndex + 1) % footprint.points.length;
    const currentRow = rowOffsets[pointIndex]!;
    const nextRow = rowOffsets[nextPointIndex]!;

    addProfileStrip({
      indices,
      startRow: currentRow,
      endRow: nextRow,
      profileVertexCount: profile.length
    });

    if (isRoadMouthSegment(footprint.points, previousSegmentIndex)) {
      addJunctionEdgeProfileCap({
        indices,
        rowOffset: currentRow,
        profileVertexCount: profile.length,
        reverse: true
      });
    }

    if (isRoadMouthSegment(footprint.points, nextSegmentIndex)) {
      addJunctionEdgeProfileCap({
        indices,
        rowOffset: nextRow,
        profileVertexCount: profile.length,
        reverse: false
      });
    }
  }

  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
    footprintPointCount: footprint.points.length,
    profileVertexCount: profile.length
  };
}

export function buildSplineCorridorJunctionEdgeMeshGeometry(options: {
  junction: SplineCorridorJunction;
  paths: readonly SplineCorridorJunctionMeshPathLike[];
  edge: ScenePathRoadEdgeSettings;
  terrains?: readonly Terrain[];
}): BufferGeometry | null {
  const meshData = buildSplineCorridorJunctionEdgeMeshData(options);

  if (meshData === null) {
    return null;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(meshData.positions, 3)
  );
  geometry.setAttribute("uv", new Float32BufferAttribute(meshData.uvs, 2));
  geometry.setIndex([...meshData.indices]);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function buildSplineCorridorJunctionMeshGeometry(options: {
  junction: SplineCorridorJunction;
  paths: readonly SplineCorridorJunctionMeshPathLike[];
  terrains?: readonly Terrain[];
}): BufferGeometry | null {
  const { junction, paths } = options;
  const terrains = options.terrains ?? [];
  const footprint = buildSplineCorridorJunctionFootprint({
    junction,
    paths,
    terrains
  });

  if (footprint === null) {
    return null;
  }

  const resolvedFootprint = footprint;
  const conformToTerrain = shouldConformToTerrain({ junction, paths });
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  function resolveY(position: Vec3, fallbackY: number, heightOffset: number): number {
    const terrainWorldY = conformToTerrain
      ? sampleHighestTerrainWorldY(terrains, position)
      : null;

    return terrainWorldY === null ? fallbackY : terrainWorldY + heightOffset;
  }

  function pushUv(x: number, z: number) {
    const deltaX = x - resolvedFootprint.center.x;
    const deltaZ = z - resolvedFootprint.center.z;
    uvs.push(
      deltaX * resolvedFootprint.rightAxis.x +
        deltaZ * resolvedFootprint.rightAxis.z,
      deltaX * resolvedFootprint.forwardAxis.x +
        deltaZ * resolvedFootprint.forwardAxis.z
    );
  }

  positions.push(
    resolvedFootprint.center.x,
    resolveY(
      {
        x: resolvedFootprint.center.x,
        y: junction.center.y,
        z: resolvedFootprint.center.z
      },
      resolvedFootprint.center.fallbackY,
      resolvedFootprint.center.heightOffset
    ),
    resolvedFootprint.center.z
  );
  pushUv(resolvedFootprint.center.x, resolvedFootprint.center.z);

  for (const point of resolvedFootprint.points) {
    positions.push(
      point.x,
      resolveY(
        {
          x: point.x,
          y: point.fallbackY,
          z: point.z
        },
        point.fallbackY,
        point.heightOffset
      ),
      point.z
    );
    pushUv(point.x, point.z);
  }

  for (let index = 0; index < resolvedFootprint.points.length; index += 1) {
    const current = index + 1;
    const next =
      index === resolvedFootprint.points.length - 1 ? 1 : current + 1;

    indices.push(0, current, next);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
