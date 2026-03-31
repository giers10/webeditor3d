import { BoxGeometry } from "three";
import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import { applyBoxBrushFaceUvsToGeometry, createFitToFaceBoxBrushFaceUvState, transformProjectedFaceUv } from "../../src/geometry/box-face-uvs";

describe("box face UV projection", () => {
  it("fit-to-face produces finite UVs normalized across the target face", () => {
    const brush = createBoxBrush({
      size: {
        x: 4,
        y: 2,
        z: 6
      }
    });

    brush.faces.posZ.uv = createFitToFaceBoxBrushFaceUvState(brush, "posZ");

    const geometry = new BoxGeometry(brush.size.x, brush.size.y, brush.size.z);
    applyBoxBrushFaceUvsToGeometry(geometry, brush);

    const uvAttribute = geometry.getAttribute("uv");
    const indexAttribute = geometry.getIndex();
    const posZGroup = geometry.groups.find((group) => group.materialIndex === 4);

    expect(indexAttribute).not.toBeNull();
    expect(posZGroup).toBeDefined();

    const uniqueVertexIndices = new Set<number>();

    for (let indexOffset = posZGroup!.start; indexOffset < posZGroup!.start + posZGroup!.count; indexOffset += 1) {
      uniqueVertexIndices.add(indexAttribute!.getX(indexOffset));
    }

    const uvValues = Array.from(uniqueVertexIndices, (vertexIndex) => ({
      u: uvAttribute.getX(vertexIndex),
      v: uvAttribute.getY(vertexIndex)
    }));

    expect(uvValues).toHaveLength(4);
    expect(uvValues.every((uv) => Number.isFinite(uv.u) && Number.isFinite(uv.v))).toBe(true);
    expect(Math.min(...uvValues.map((uv) => uv.u))).toBeCloseTo(0);
    expect(Math.max(...uvValues.map((uv) => uv.u))).toBeCloseTo(1);
    expect(Math.min(...uvValues.map((uv) => uv.v))).toBeCloseTo(0);
    expect(Math.max(...uvValues.map((uv) => uv.v))).toBeCloseTo(1);
  });

  it("applies rotation, scale, and offset deterministically to projected UVs", () => {
    const transformedUv = transformProjectedFaceUv(
      {
        x: 4,
        y: 0
      },
      {
        x: 4,
        y: 2
      },
      {
        offset: {
          x: 0.5,
          y: -0.25
        },
        scale: {
          x: 0.5,
          y: 1
        },
        rotationQuarterTurns: 1,
        flipU: true,
        flipV: false
      }
    );

    expect(transformedUv.x).toBeCloseTo(1.5);
    expect(transformedUv.y).toBeCloseTo(1.75);
  });
});
