import { BoxGeometry, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import {
  SURFACE_SNAP_OFFSET,
  applyRigidDeltaToTransformPreview,
  computeSurfaceSnapDelta,
  createBrushSurfaceSnapSupportPoints,
  createModelBoundingBoxSurfaceSnapSupportPoints,
  findSurfaceSnapSupportPoint,
  projectOntoAxis,
  resolveSurfaceSnapHitFromIntersections
} from "../../src/viewport-three/transform-surface-snap";

function createFrontFaceHit(meshes: Mesh | Mesh[], excludedMesh?: Mesh) {
  const rayOrigin = new Vector3(0, 0, 5);
  const rayDirection = new Vector3(0, 0, -1);
  const raycaster = new Raycaster(rayOrigin, rayDirection);
  const objectList = Array.isArray(meshes) ? meshes : [meshes];

  for (const mesh of objectList) {
    mesh.updateMatrixWorld(true);
  }

  return resolveSurfaceSnapHitFromIntersections({
    hits: raycaster.intersectObjects(objectList, true),
    rayDirection: {
      x: rayDirection.x,
      y: rayDirection.y,
      z: rayDirection.z
    },
    isObjectExcluded: (object) => object === excludedMesh
  });
}

describe("transform-surface-snap", () => {
  it("selects the support point with the minimum projection on the hit normal", () => {
    expect(
      findSurfaceSnapSupportPoint(
        [
          { x: 2, y: 0, z: 0 },
          { x: -3, y: 1, z: 0 },
          { x: 0, y: -2, z: 0 }
        ],
        { x: 1, y: 0, z: 0 }
      )
    ).toEqual({
      x: -3,
      y: 1,
      z: 0
    });
  });

  it("returns no snap delta when there is no valid hit", () => {
    expect(
      computeSurfaceSnapDelta({
        supportPoints: [{ x: 0, y: 0, z: 0 }],
        hit: null
      })
    ).toBeNull();
  });

  it("projects the snap delta onto the constrained axis basis", () => {
    const delta = computeSurfaceSnapDelta({
      supportPoints: [{ x: 1, y: 1, z: 0 }],
      hit: {
        object: new Mesh(),
        point: { x: 5, y: 4, z: 0 },
        normal: { x: 0, y: 1, z: 0 }
      },
      axisVector: { x: 1, y: 0, z: 0 }
    });

    expect(delta).toEqual({
      x: 4,
      y: 0,
      z: 0
    });
    expect(
      projectOntoAxis(
        {
          x: 4,
          y: 3 + SURFACE_SNAP_OFFSET,
          z: 0
        },
        { x: 1, y: 0, z: 0 }
      )
    ).toEqual({
      x: 4,
      y: 0,
      z: 0
    });
  });

  it("applies one rigid delta to a batch preview", () => {
    const preview = applyRigidDeltaToTransformPreview(
      {
        kind: "brushes",
        pivot: { x: 1, y: 2, z: 3 },
        items: [
          {
            brushId: "brush-a",
            center: { x: 0, y: 0, z: 0 },
            rotationDegrees: { x: 0, y: 0, z: 0 },
            size: { x: 2, y: 2, z: 2 },
            geometry: createBoxBrush().geometry
          },
          {
            brushId: "brush-b",
            center: { x: 3, y: 4, z: 5 },
            rotationDegrees: { x: 0, y: 0, z: 0 },
            size: { x: 2, y: 2, z: 2 },
            geometry: createBoxBrush().geometry
          }
        ]
      },
      { x: -2, y: 5, z: 1 }
    );

    expect(preview).toMatchObject({
      kind: "brushes",
      pivot: { x: -1, y: 7, z: 4 },
      items: [
        { brushId: "brush-a", center: { x: -2, y: 5, z: 1 } },
        { brushId: "brush-b", center: { x: 1, y: 9, z: 6 } }
      ]
    });
  });

  it("resolves the closest valid front-face hit while excluding the moving selection", () => {
    const excludedMesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial()
    );
    const targetMesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial()
    );
    excludedMesh.position.z = 0;
    targetMesh.position.z = -2;

    const hit = createFrontFaceHit([excludedMesh, targetMesh], excludedMesh);

    expect(hit).not.toBeNull();
    expect(hit?.point.z).toBeCloseTo(-1.5, 5);
    expect(hit?.normal).toEqual({
      x: 0,
      y: 0,
      z: 1
    });
  });

  it("recomputes the same snapped preview from the same base state without accumulation", () => {
    const targetMesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial()
    );
    const hit = createFrontFaceHit(targetMesh);
    const brush = createBoxBrush({
      center: { x: 0, y: 0, z: -3 },
      size: { x: 2, y: 2, z: 2 }
    });
    const basePreview = {
      kind: "brush" as const,
      center: brush.center,
      rotationDegrees: brush.rotationDegrees,
      size: brush.size,
      geometry: brush.geometry
    };
    const snapPreview = () => {
      const delta = computeSurfaceSnapDelta({
        supportPoints: createBrushSurfaceSnapSupportPoints(basePreview),
        hit
      });

      return delta === null
        ? basePreview
        : applyRigidDeltaToTransformPreview(basePreview, delta);
    };

    expect(snapPreview()).toEqual(snapPreview());
  });

  it("lands a whitebox solid on the visible front face even when it starts behind the target", () => {
    const targetMesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial()
    );
    const hit = createFrontFaceHit(targetMesh);
    const brush = createBoxBrush({
      center: { x: 0, y: 0, z: -3 },
      size: { x: 2, y: 2, z: 2 }
    });
    const delta = computeSurfaceSnapDelta({
      supportPoints: createBrushSurfaceSnapSupportPoints(brush),
      hit
    });

    if (delta === null) {
      throw new Error("Expected a valid whitebox surface snap delta.");
    }

    const snappedPreview = applyRigidDeltaToTransformPreview(
      {
        kind: "brush",
        center: brush.center,
        rotationDegrees: brush.rotationDegrees,
        size: brush.size,
        geometry: brush.geometry
      },
      delta
    );

    if (snappedPreview.kind !== "brush" || hit === null) {
      throw new Error("Expected a snapped whitebox preview.");
    }

    const supportPoint = findSurfaceSnapSupportPoint(
      createBrushSurfaceSnapSupportPoints(snappedPreview),
      hit.normal
    );

    expect(supportPoint?.z).toBeCloseTo(hit.point.z + SURFACE_SNAP_OFFSET, 5);
    expect(snappedPreview.center.z).toBeGreaterThan(0);
  });

  it("lands a model instance on the visible front face under the cursor", () => {
    const targetMesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial()
    );
    const hit = createFrontFaceHit(targetMesh);
    const boundingBox = {
      min: { x: -1, y: -0.5, z: -1 },
      max: { x: 1, y: 0.5, z: 1 },
      size: { x: 2, y: 1, z: 2 }
    };
    const basePreview = {
      kind: "modelInstance" as const,
      position: { x: 0, y: 0, z: -4 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    };
    const delta = computeSurfaceSnapDelta({
      supportPoints: createModelBoundingBoxSurfaceSnapSupportPoints({
        position: basePreview.position,
        rotationDegrees: basePreview.rotationDegrees,
        scale: basePreview.scale,
        boundingBox
      }),
      hit
    });

    if (delta === null) {
      throw new Error("Expected a valid model-instance surface snap delta.");
    }

    const snappedPreview = applyRigidDeltaToTransformPreview(basePreview, delta);

    if (snappedPreview.kind !== "modelInstance" || hit === null) {
      throw new Error("Expected a snapped model-instance preview.");
    }

    const supportPoint = findSurfaceSnapSupportPoint(
      createModelBoundingBoxSurfaceSnapSupportPoints({
        position: snappedPreview.position,
        rotationDegrees: snappedPreview.rotationDegrees,
        scale: snappedPreview.scale,
        boundingBox
      }),
      hit.normal
    );

    expect(supportPoint?.z).toBeCloseTo(hit.point.z + SURFACE_SNAP_OFFSET, 5);
  });
});
