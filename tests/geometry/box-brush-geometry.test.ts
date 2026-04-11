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

  it("builds normalized face-space UVs for whitebox bevel shading", () => {
    const brush = createBoxBrush({
      size: {
        x: 6,
        y: 4,
        z: 8
      }
    });
    const derivedMesh = buildBoxBrushDerivedMeshData(brush);
    const faceUvAttribute = derivedMesh.geometry.getAttribute("faceUv");
    const values = Array.from(faceUvAttribute.array);

    expect(faceUvAttribute.itemSize).toBe(2);
    expect(values.length).toBeGreaterThan(0);
    expect(values.every((value) => Number.isFinite(value))).toBe(true);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
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

  it("subdivides the rendered top face for displaced water without changing authored collider geometry", () => {
    const flatWaterBrush = createBoxBrush({
      volume: {
        mode: "water",
        water: {
          colorHex: "#4da6d9",
          surfaceOpacity: 0.55,
          waveStrength: 0.35,
          foamContactLimit: 6,
          surfaceDisplacementEnabled: false
        }
      }
    });
    const displacedWaterBrush = createBoxBrush({
      volume: {
        mode: "water",
        water: {
          colorHex: "#4da6d9",
          surfaceOpacity: 0.55,
          waveStrength: 0.35,
          foamContactLimit: 6,
          surfaceDisplacementEnabled: true
        }
      }
    });

    const flatDerivedMesh = buildBoxBrushDerivedMeshData(flatWaterBrush);
    const displacedDerivedMesh = buildBoxBrushDerivedMeshData(displacedWaterBrush);

    expect(displacedDerivedMesh.geometry.getAttribute("position").count).toBeGreaterThan(
      flatDerivedMesh.geometry.getAttribute("position").count
    );
    expect(Array.from(displacedDerivedMesh.colliderVertices)).toEqual(Array.from(flatDerivedMesh.colliderVertices));
    expect(Array.from(displacedDerivedMesh.colliderIndices)).toEqual(Array.from(flatDerivedMesh.colliderIndices));
  });
});
