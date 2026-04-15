import { describe, expect, it } from "vitest";

import {
  createConeBrush,
  createRadialPrismBrush,
  createTorusBrush,
  createWedgeBrush,
  deriveBrushSizeFromGeometry
} from "../../src/document/brushes";
import { buildBoxBrushDerivedMeshData, validateBoxBrushGeometry } from "../../src/geometry/box-brush-mesh";
import {
  getBrushEdgeIds,
  getBrushFaceIds,
  getBrushVertexIds
} from "../../src/geometry/whitebox-topology";

describe("whitebox primitives", () => {
  it("builds deterministic wedge topology and finite derived mesh data", () => {
    const brush = createWedgeBrush({
      id: "brush-wedge-test",
      size: {
        x: 4,
        y: 2,
        z: 6
      }
    });
    const derivedMesh = buildBoxBrushDerivedMeshData(brush);

    expect(brush.rotationDegrees).toEqual({
      x: 0,
      y: 0,
      z: 180
    });
    expect(getBrushFaceIds(brush)).toEqual([
      "bottom",
      "back",
      "slope",
      "left",
      "right"
    ]);
    expect(getBrushEdgeIds(brush)).toEqual([
      "bottomBack",
      "bottomFront",
      "bottomLeft",
      "bottomRight",
      "topBack",
      "leftBack",
      "rightBack",
      "leftSlope",
      "rightSlope"
    ]);
    expect(getBrushVertexIds(brush)).toEqual([
      "negX_negY_negZ",
      "posX_negY_negZ",
      "negX_negY_posZ",
      "posX_negY_posZ",
      "negX_posY_negZ",
      "posX_posY_negZ"
    ]);
    expect(validateBoxBrushGeometry(brush)).toEqual([]);
    expect(derivedMesh.faceIdsInOrder).toEqual(getBrushFaceIds(brush));
    expect(Array.from(derivedMesh.colliderVertices).every(Number.isFinite)).toBe(
      true
    );
    expect(Array.from(derivedMesh.colliderIndices).every(Number.isFinite)).toBe(
      true
    );
    expect(deriveBrushSizeFromGeometry(brush.geometry)).toEqual(brush.size);
  });

  it("builds deterministic cylinder topology and finite collider buffers", () => {
    const brush = createRadialPrismBrush({
      id: "brush-cylinder-test",
      sideCount: 12,
      size: {
        x: 4,
        y: 3,
        z: 4
      }
    });
    const derivedMesh = buildBoxBrushDerivedMeshData(brush);

    expect(getBrushFaceIds(brush)).toEqual([
      "top",
      "bottom",
      ...Array.from({ length: 12 }, (_, index) => `side-${index}`)
    ]);
    expect(getBrushEdgeIds(brush)).toHaveLength(36);
    expect(getBrushVertexIds(brush)).toHaveLength(24);
    expect(validateBoxBrushGeometry(brush)).toEqual([]);
    expect(derivedMesh.faceIdsInOrder).toEqual(getBrushFaceIds(brush));
    expect(
      derivedMesh.faceSurfaces.find((surface) => surface.faceId === "top")?.normal
    ).toEqual({
      x: 0,
      y: 1,
      z: 0
    });
    expect(
      derivedMesh.faceSurfaces.find((surface) => surface.faceId === "bottom")?.normal
    ).toEqual({
      x: 0,
      y: -1,
      z: 0
    });
    expect(Array.from(derivedMesh.colliderVertices).every(Number.isFinite)).toBe(
      true
    );
    expect(Array.from(derivedMesh.colliderIndices).every(Number.isFinite)).toBe(
      true
    );
    expect(deriveBrushSizeFromGeometry(brush.geometry)).toEqual(brush.size);
  });

  it("builds deterministic cone topology and finite collider buffers", () => {
    const brush = createConeBrush({
      id: "brush-cone-test",
      sideCount: 12,
      size: {
        x: 4,
        y: 3,
        z: 4
      }
    });
    const derivedMesh = buildBoxBrushDerivedMeshData(brush);

    expect(getBrushFaceIds(brush)).toEqual([
      "bottom",
      ...Array.from({ length: 12 }, (_, index) => `side-${index}`)
    ]);
    expect(getBrushEdgeIds(brush)).toHaveLength(24);
    expect(getBrushVertexIds(brush)).toHaveLength(13);
    expect(validateBoxBrushGeometry(brush)).toEqual([]);
    expect(derivedMesh.faceIdsInOrder).toEqual(getBrushFaceIds(brush));
    expect(
      derivedMesh.faceSurfaces.find((surface) => surface.faceId === "bottom")?.normal
    ).toEqual({
      x: 0,
      y: -1,
      z: 0
    });
    expect(Array.from(derivedMesh.colliderVertices).every(Number.isFinite)).toBe(
      true
    );
    expect(Array.from(derivedMesh.colliderIndices).every(Number.isFinite)).toBe(
      true
    );
    expect(deriveBrushSizeFromGeometry(brush.geometry)).toEqual(brush.size);
  });

  it("builds deterministic torus topology and finite collider buffers", () => {
    const brush = createTorusBrush({
      id: "brush-torus-test",
      majorSegmentCount: 16,
      tubeSegmentCount: 8
    });
    const derivedMesh = buildBoxBrushDerivedMeshData(brush);

    expect(getBrushFaceIds(brush)).toHaveLength(128);
    expect(getBrushEdgeIds(brush)).toHaveLength(256);
    expect(getBrushVertexIds(brush)).toHaveLength(128);
    expect(validateBoxBrushGeometry(brush)).toEqual([]);
    expect(derivedMesh.faceIdsInOrder).toEqual(getBrushFaceIds(brush));
    expect(Array.from(derivedMesh.colliderVertices).every(Number.isFinite)).toBe(
      true
    );
    expect(Array.from(derivedMesh.colliderIndices).every(Number.isFinite)).toBe(
      true
    );
    expect(deriveBrushSizeFromGeometry(brush.geometry)).toEqual(brush.size);
  });
});
