import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import { getBoxBrushBounds, getBoxBrushCornerPositions } from "../../src/geometry/box-brush";
import { buildBoxBrushDerivedMeshData, validateBoxBrushGeometry } from "../../src/geometry/box-brush-mesh";

describe("box brush geometry", () => {
  it("builds finite bounds and eight corner positions from canonical box data", () => {
    const brush = createBoxBrush({
      center: {
        x: 2,
        y: 4,
        z: -3
      },
      size: {
        x: 6,
        y: 2,
        z: 4
      }
    });

    expect(getBoxBrushBounds(brush)).toEqual({
      min: {
        x: -1,
        y: 3,
        z: -5
      },
      max: {
        x: 5,
        y: 5,
        z: -1
      }
    });

    const corners = getBoxBrushCornerPositions(brush);

    expect(corners).toHaveLength(8);
    expect(new Set(corners.map((corner) => `${corner.x}:${corner.y}:${corner.z}`)).size).toBe(8);
    expect(corners.every((corner) => Number.isFinite(corner.x) && Number.isFinite(corner.y) && Number.isFinite(corner.z))).toBe(true);
  });

  it("derives rotated world bounds from authored box rotation without changing stable corner count", () => {
    const brush = createBoxBrush({
      center: {
        x: 0,
        y: 1,
        z: 0
      },
      rotationDegrees: {
        x: 0,
        y: 45,
        z: 0
      },
      size: {
        x: 2,
        y: 2,
        z: 4
      }
    });

    const bounds = getBoxBrushBounds(brush);
    const corners = getBoxBrushCornerPositions(brush);

    expect(bounds.min.x).toBeCloseTo(-2.1213203436);
    expect(bounds.max.x).toBeCloseTo(2.1213203436);
    expect(bounds.min.z).toBeCloseTo(-2.1213203436);
    expect(bounds.max.z).toBeCloseTo(2.1213203436);
    expect(corners).toHaveLength(8);
    expect(new Set(corners.map((corner) => `${corner.x}:${corner.y}:${corner.z}`)).size).toBe(8);
  });

  it("triangulates non-planar quad faces deterministically from authored whitebox geometry", () => {
    const brush = createBoxBrush();
    brush.geometry.vertices.posX_posY_posZ.z += 0.75;
    brush.size = {
      x: 2,
      y: 2,
      z: 2.75
    };

    const diagnostics = validateBoxBrushGeometry(brush);
    const derivedMesh = buildBoxBrushDerivedMeshData(brush);
    const triangles = derivedMesh.faceSurfaces.flatMap((surface) => surface.triangles);

    expect(diagnostics).toEqual([]);
    expect(derivedMesh.faceSurfaces).toHaveLength(6);
    expect(triangles).toHaveLength(12);
    expect(Array.from(derivedMesh.colliderIndices)).toHaveLength(36);
  });

  it("reports degenerate authored whitebox faces clearly", () => {
    const brush = createBoxBrush();
    const collapsedVertex = { x: 1, y: 1, z: 1 };
    brush.geometry.vertices.negX_posY_posZ = collapsedVertex;
    brush.geometry.vertices.posX_posY_posZ = collapsedVertex;
    brush.geometry.vertices.posX_posY_negZ = collapsedVertex;
    brush.geometry.vertices.negX_posY_negZ = collapsedVertex;

    expect(validateBoxBrushGeometry(brush)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "degenerate-box-face",
          faceId: "posY"
        })
      ])
    );
  });
});
