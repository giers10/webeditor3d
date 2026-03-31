import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";
import { resolveViewportFocusTarget } from "../../src/viewport-three/viewport-focus";

describe("resolveViewportFocusTarget", () => {
  it("frames the selected brush", () => {
    const brush = createBoxBrush({
      id: "brush-room",
      center: {
        x: 3,
        y: 2,
        z: -1
      },
      size: {
        x: 6,
        y: 4,
        z: 2
      }
    });
    const document = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      }
    };

    expect(
      resolveViewportFocusTarget(document, {
        kind: "brushes",
        ids: [brush.id]
      })
    ).toEqual({
      center: {
        x: 3,
        y: 2,
        z: -1
      },
      radius: Math.hypot(6, 4, 2) * 0.5
    });
  });

  it("frames the owning brush when a face is selected", () => {
    const brush = createBoxBrush({
      id: "brush-face-room"
    });
    const document = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      }
    };

    const focusTarget = resolveViewportFocusTarget(document, {
      kind: "brushFace",
      brushId: brush.id,
      faceId: "posZ"
    });

    expect(focusTarget?.center).toEqual(brush.center);
    expect(focusTarget?.radius).toBe(Math.hypot(2, 2, 2) * 0.5);
  });

  it("frames the selected Player Start helper", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-main",
      position: {
        x: 4,
        y: 0,
        z: -2
      },
      yawDegrees: 90
    });
    const document = {
      ...createEmptySceneDocument(),
      entities: {
        [playerStart.id]: playerStart
      }
    };

    const focusTarget = resolveViewportFocusTarget(document, {
      kind: "entities",
      ids: [playerStart.id]
    });

    expect(focusTarget?.center).toEqual({
      x: 4,
      y: 0.3,
      z: -2
    });
    expect(focusTarget?.radius).toBeGreaterThan(0.6);
  });

  it("frames the authored scene when nothing is selected and returns null when the scene is empty", () => {
    const brush = createBoxBrush({
      id: "brush-room"
    });
    const populatedDocument = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      }
    };

    expect(resolveViewportFocusTarget(populatedDocument, { kind: "none" })).toEqual({
      center: {
        x: 0,
        y: 1,
        z: 0
      },
      radius: Math.hypot(2, 2, 2) * 0.5
    });
    expect(resolveViewportFocusTarget(createEmptySceneDocument(), { kind: "none" })).toBeNull();
  });
});
