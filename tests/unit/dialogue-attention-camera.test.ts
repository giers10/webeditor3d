import { describe, expect, it } from "vitest";
import { Vector3 } from "three";

import { resolveDialogueAttentionCameraSolution } from "../../src/runtime-three/dialogue-attention-camera";

describe("resolveDialogueAttentionCameraSolution", () => {
  it("orbits around the conversation midpoint and frames the player and npc on opposite sides", () => {
    const playerFocusPoint = {
      x: 0,
      y: 1.6,
      z: 0
    };
    const npcFocusPoint = {
      x: 2,
      y: 1.7,
      z: 2
    };
    const solution = resolveDialogueAttentionCameraSolution({
      playerFocusPoint,
      npcFocusPoint,
      referenceCameraPosition: {
        x: 4,
        y: 2.2,
        z: -2
      },
      referenceLookTarget: {
        x: 1,
        y: 1.65,
        z: 1
      }
    });
    const forward = new Vector3(
      solution.lookTarget.x - solution.position.x,
      solution.lookTarget.y - solution.position.y,
      solution.lookTarget.z - solution.position.z
    ).normalize();
    const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0)).normalize();
    const playerViewOffset = right.dot(
      new Vector3(
        playerFocusPoint.x - solution.position.x,
        playerFocusPoint.y - solution.position.y,
        playerFocusPoint.z - solution.position.z
      )
    );
    const npcViewOffset = right.dot(
      new Vector3(
        npcFocusPoint.x - solution.position.x,
        npcFocusPoint.y - solution.position.y,
        npcFocusPoint.z - solution.position.z
      )
    );
    const pairDirection = new Vector3(
      npcFocusPoint.x - playerFocusPoint.x,
      0,
      npcFocusPoint.z - playerFocusPoint.z
    ).normalize();
    const horizontalForward = new Vector3(forward.x, 0, forward.z).normalize();

    expect(solution.sideSign).toBe(1);
    expect(solution.pivot).toEqual({
      x: 1,
      y: 1.65,
      z: 1
    });
    expect(solution.position.y).toBeGreaterThan(2);
    expect(playerViewOffset * npcViewOffset).toBeLessThan(0);
    expect(Math.abs(horizontalForward.dot(pairDirection))).toBeGreaterThan(0.2);
    expect(Math.abs(horizontalForward.dot(pairDirection))).toBeLessThan(0.9);
  });

  it("preserves the authored dialogue side sign across solver updates", () => {
    const solution = resolveDialogueAttentionCameraSolution({
      playerFocusPoint: {
        x: 0,
        y: 1.6,
        z: 0
      },
      npcFocusPoint: {
        x: 2,
        y: 1.7,
        z: 2
      },
      referenceCameraPosition: {
        x: -4,
        y: 2.2,
        z: 4
      },
      referenceLookTarget: {
        x: 1,
        y: 1.65,
        z: 1
      },
      previousSideSign: 1
    });

    expect(solution.sideSign).toBe(1);
  });

  it("backs the camera away as the conversation span grows", () => {
    const narrow = resolveDialogueAttentionCameraSolution({
      playerFocusPoint: {
        x: 0,
        y: 1.6,
        z: 0
      },
      npcFocusPoint: {
        x: 1.5,
        y: 1.6,
        z: 1.5
      },
      referenceCameraPosition: {
        x: 3,
        y: 2.2,
        z: -2
      },
      referenceLookTarget: {
        x: 0.75,
        y: 1.6,
        z: 0.75
      }
    });
    const wide = resolveDialogueAttentionCameraSolution({
      playerFocusPoint: {
        x: 0,
        y: 1.6,
        z: 0
      },
      npcFocusPoint: {
        x: 4,
        y: 1.6,
        z: 4
      },
      referenceCameraPosition: {
        x: 3,
        y: 2.2,
        z: -2
      },
      referenceLookTarget: {
        x: 2,
        y: 1.6,
        z: 2
      }
    });

    expect(wide.subjectDistance).toBeGreaterThan(narrow.subjectDistance);
    expect(wide.position.y).toBeGreaterThanOrEqual(narrow.position.y);
    expect(Math.hypot(wide.position.x, wide.position.z)).toBeGreaterThan(
      Math.hypot(narrow.position.x, narrow.position.z)
    );
  });
});
