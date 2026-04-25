import { describe, expect, it } from "vitest";

import { resolveDialogueAttentionCameraSolution } from "../../src/runtime-three/dialogue-attention-camera";

describe("resolveDialogueAttentionCameraSolution", () => {
  it("chooses a stable shoulder side from the reference camera and biases framing toward the NPC", () => {
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

    expect(solution.sideSign).toBe(1);
    expect(solution.position.y).toBeGreaterThan(2);
    expect(solution.lookTarget.x).toBeGreaterThan(1);
    expect(solution.lookTarget.z).toBeGreaterThan(1);
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
