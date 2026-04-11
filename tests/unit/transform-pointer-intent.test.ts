import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import { resolveTransformPointerDownIntent } from "../../src/viewport-three/transform-pointer-intent";
import type { TransformSessionState } from "../../src/core/transform-session";

function createActiveBrushTransformSession(): TransformSessionState {
  const brush = createBoxBrush({
    id: "brush-transform-pointer-intent",
    center: {
      x: 0,
      y: 1,
      z: 0
    }
  });

  return {
    kind: "active",
    id: "transform-session-pointer-intent",
    source: "keyboard",
    sourcePanelId: "topLeft",
    operation: "scale",
    axisConstraint: null,
    axisConstraintSpace: "world",
    target: {
      kind: "brush",
      brushId: brush.id,
      initialCenter: brush.center,
      initialRotationDegrees: brush.rotationDegrees,
      initialSize: brush.size,
      initialGeometry: brush.geometry
    },
    preview: {
      kind: "brush",
      center: brush.center,
      rotationDegrees: brush.rotationDegrees,
      size: {
        x: brush.size.x * 1.5,
        y: brush.size.y,
        z: brush.size.z
      },
      geometry: brush.geometry
    }
  };
}

describe("resolveTransformPointerDownIntent", () => {
  it("commits an active transform before allowing gizmo interaction in the same panel", () => {
    expect(
      resolveTransformPointerDownIntent(
        createActiveBrushTransformSession(),
        "topLeft"
      )
    ).toEqual({
      commitActiveTransform: true,
      allowGizmoInteraction: false
    });
  });

  it("blocks pointer handling in other panels while a different panel owns the active transform", () => {
    expect(
      resolveTransformPointerDownIntent(
        createActiveBrushTransformSession(),
        "topRight"
      )
    ).toEqual({
      commitActiveTransform: false,
      allowGizmoInteraction: false
    });
  });

  it("allows gizmo interaction when no transform session is active", () => {
    expect(resolveTransformPointerDownIntent({ kind: "none" }, "topLeft")).toEqual({
      commitActiveTransform: false,
      allowGizmoInteraction: true
    });
  });
});
