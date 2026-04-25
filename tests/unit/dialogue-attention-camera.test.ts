import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";

import { resolveDialogueAttentionCameraSolution } from "../../src/runtime-three/dialogue-attention-camera";

function projectPoint(solution: ReturnType<typeof resolveDialogueAttentionCameraSolution>, point: { x: number; y: number; z: number }) {
  const camera = new PerspectiveCamera(70, 16 / 9, 0.05, 100);
  camera.position.set(
    solution.position.x,
    solution.position.y,
    solution.position.z
  );
  camera.lookAt(solution.lookTarget.x, solution.lookTarget.y, solution.lookTarget.z);
  camera.updateMatrixWorld(true);

  return new Vector3(point.x, point.y, point.z).project(camera);
}

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

  it("keeps a wide conversation inside a safe frame", () => {
    const playerFocusPoint = {
      x: 0,
      y: 1.6,
      z: 0
    };
    const npcFocusPoint = {
      x: 4,
      y: 1.6,
      z: 4
    };
    const solution = resolveDialogueAttentionCameraSolution({
      playerFocusPoint,
      npcFocusPoint,
      referenceCameraPosition: {
        x: 3,
        y: 2.2,
        z: -2
      },
      referenceLookTarget: {
        x: 2,
        y: 1.6,
        z: 2
      },
      cameraVerticalFovRadians: (70 * Math.PI) / 180,
      cameraAspect: 16 / 9
    });
    const samplePoints = [
      playerFocusPoint,
      npcFocusPoint,
      {
        x: playerFocusPoint.x,
        y: playerFocusPoint.y + 0.26,
        z: playerFocusPoint.z
      },
      {
        x: npcFocusPoint.x,
        y: npcFocusPoint.y + 0.26,
        z: npcFocusPoint.z
      },
      {
        x: playerFocusPoint.x,
        y: playerFocusPoint.y - 0.82,
        z: playerFocusPoint.z
      },
      {
        x: npcFocusPoint.x,
        y: npcFocusPoint.y - 0.82,
        z: npcFocusPoint.z
      }
    ].map((point) => projectPoint(solution, point));

    for (const projectedPoint of samplePoints) {
      expect(Math.abs(projectedPoint.x)).toBeLessThan(0.82);
      expect(Math.abs(projectedPoint.y)).toBeLessThan(0.84);
    }
  });

  it("keeps a narrow conversation readable instead of pushing too far away", () => {
    const playerFocusPoint = {
      x: 0,
      y: 1.6,
      z: 0
    };
    const npcFocusPoint = {
      x: 1.1,
      y: 1.6,
      z: 0.9
    };
    const solution = resolveDialogueAttentionCameraSolution({
      playerFocusPoint,
      npcFocusPoint,
      referenceCameraPosition: {
        x: 2.5,
        y: 2.2,
        z: -2
      },
      referenceLookTarget: {
        x: 0.55,
        y: 1.6,
        z: 0.45
      },
      cameraVerticalFovRadians: (70 * Math.PI) / 180,
      cameraAspect: 16 / 9
    });
    const projectedPlayer = projectPoint(solution, playerFocusPoint);
    const projectedNpc = projectPoint(solution, npcFocusPoint);

    expect(Math.abs(projectedNpc.x - projectedPlayer.x)).toBeGreaterThan(0.42);
    expect(Math.abs(projectedPlayer.x)).toBeLessThan(0.75);
    expect(Math.abs(projectedNpc.x)).toBeLessThan(0.75);
  });
});
