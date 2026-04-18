import { BufferAttribute, BufferGeometry } from "three";

import type { Vec3 } from "../core/vector";
import {
  getTerrainHeightAtSample,
  type Terrain
} from "../document/terrains";

export type TerrainCellDiagonal = "forward" | "backward";

export interface TerrainCellTriangulation {
  cellX: number;
  cellZ: number;
  diagonal: TerrainCellDiagonal;
}

export interface DerivedTerrainMeshData {
  geometry: BufferGeometry;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  cellTriangulation: TerrainCellTriangulation[];
  localBounds: {
    min: Vec3;
    max: Vec3;
  };
}

function createEmptyLocalBounds(): { min: Vec3; max: Vec3 } {
  return {
    min: {
      x: Number.POSITIVE_INFINITY,
      y: Number.POSITIVE_INFINITY,
      z: Number.POSITIVE_INFINITY
    },
    max: {
      x: Number.NEGATIVE_INFINITY,
      y: Number.NEGATIVE_INFINITY,
      z: Number.NEGATIVE_INFINITY
    }
  };
}

function chooseCellDiagonal(
  topLeft: number,
  topRight: number,
  bottomLeft: number,
  bottomRight: number
): TerrainCellDiagonal {
  return Math.abs(topLeft - bottomRight) <= Math.abs(topRight - bottomLeft)
    ? "forward"
    : "backward";
}

function pushCellIndices(
  indices: number[],
  cellTriangulation: TerrainCellTriangulation[],
  cellX: number,
  cellZ: number,
  diagonal: TerrainCellDiagonal,
  topLeft: number,
  topRight: number,
  bottomLeft: number,
  bottomRight: number
) {
  cellTriangulation.push({
    cellX,
    cellZ,
    diagonal
  });

  if (diagonal === "forward") {
    indices.push(topLeft, bottomLeft, bottomRight);
    indices.push(topLeft, bottomRight, topRight);
    return;
  }

  indices.push(topLeft, bottomLeft, topRight);
  indices.push(topRight, bottomLeft, bottomRight);
}

export function buildTerrainDerivedMeshData(
  terrain: Terrain
): DerivedTerrainMeshData {
  const vertexCount = terrain.sampleCountX * terrain.sampleCountZ;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const localBounds = createEmptyLocalBounds();
  let vertexOffset = 0;
  let uvOffset = 0;

  for (let sampleZ = 0; sampleZ < terrain.sampleCountZ; sampleZ += 1) {
    for (let sampleX = 0; sampleX < terrain.sampleCountX; sampleX += 1) {
      const localX = sampleX * terrain.cellSize;
      const localY = getTerrainHeightAtSample(terrain, sampleX, sampleZ);
      const localZ = sampleZ * terrain.cellSize;
      positions[vertexOffset] = localX;
      positions[vertexOffset + 1] = localY;
      positions[vertexOffset + 2] = localZ;
      vertexOffset += 3;

      localBounds.min.x = Math.min(localBounds.min.x, localX);
      localBounds.min.y = Math.min(localBounds.min.y, localY);
      localBounds.min.z = Math.min(localBounds.min.z, localZ);
      localBounds.max.x = Math.max(localBounds.max.x, localX);
      localBounds.max.y = Math.max(localBounds.max.y, localY);
      localBounds.max.z = Math.max(localBounds.max.z, localZ);

      uvs[uvOffset] = terrain.position.x + localX;
      uvs[uvOffset + 1] = terrain.position.z + localZ;
      uvOffset += 2;
    }
  }

  const indexValues: number[] = [];
  const cellTriangulation: TerrainCellTriangulation[] = [];

  for (let cellZ = 0; cellZ < terrain.sampleCountZ - 1; cellZ += 1) {
    for (let cellX = 0; cellX < terrain.sampleCountX - 1; cellX += 1) {
      const topLeft = cellZ * terrain.sampleCountX + cellX;
      const topRight = topLeft + 1;
      const bottomLeft = (cellZ + 1) * terrain.sampleCountX + cellX;
      const bottomRight = bottomLeft + 1;
      const diagonal = chooseCellDiagonal(
        getTerrainHeightAtSample(terrain, cellX, cellZ),
        getTerrainHeightAtSample(terrain, cellX + 1, cellZ),
        getTerrainHeightAtSample(terrain, cellX, cellZ + 1),
        getTerrainHeightAtSample(terrain, cellX + 1, cellZ + 1)
      );

      pushCellIndices(
        indexValues,
        cellTriangulation,
        cellX,
        cellZ,
        diagonal,
        topLeft,
        topRight,
        bottomLeft,
        bottomRight
      );
    }
  }

  const indices = new Uint32Array(indexValues);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  const normalAttribute = geometry.getAttribute("normal");
  const normals = new Float32Array(normalAttribute.array.length);
  normals.set(normalAttribute.array as ArrayLike<number>);

  return {
    geometry,
    positions,
    normals,
    uvs,
    indices,
    cellTriangulation,
    localBounds
  };
}
