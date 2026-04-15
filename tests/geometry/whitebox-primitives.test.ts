import { describe, expect, it } from "vitest";

import {
  createRadialPrismBrush,
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
    expect(Array.from(derivedMesh.colliderVertices).every(Number.isFinite)).toBe(
      true
    );
    expect(Array.from(derivedMesh.colliderIndices).every(Number.isFinite)).toBe(
      true
    );
    expect(deriveBrushSizeFromGeometry(brush.geometry)).toEqual(brush.size);
  });
});
