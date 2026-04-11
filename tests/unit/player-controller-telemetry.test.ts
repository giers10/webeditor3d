import { describe, expect, it } from "vitest";

import { createEmptySceneDocument } from "../../src/document/scene-document";
import type { RuntimeLocomotionState } from "../../src/runtime-three/navigation-controller";
import {
  createPlayerControllerTelemetry,
  resolveRuntimeMovementTransitionSignals
} from "../../src/runtime-three/player-controller-telemetry";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";

function createLocomotionState(
  overrides: Partial<RuntimeLocomotionState> = {}
): RuntimeLocomotionState {
  return {
    locomotionMode: "grounded",
    airborneKind: null,
    gait: "idle",
    grounded: true,
    crouched: false,
    sprinting: false,
    inputMagnitude: 0,
    requestedPlanarSpeed: 0,
    planarSpeed: 0,
    verticalVelocity: 0,
    contact: {
      collisionCount: 0,
      collidedAxes: {
        x: false,
        y: false,
        z: false
      },
      groundNormal: null,
      groundDistance: null,
      slopeDegrees: null,
      ...overrides.contact
    },
    ...overrides
  };
}

describe("player-controller-telemetry", () => {
  it("derives jump lift-off and wall-contact transitions", () => {
    const previousLocomotionState = createLocomotionState({
      locomotionMode: "grounded",
      grounded: true,
      gait: "walk",
      planarSpeed: 1.4,
      inputMagnitude: 1
    });
    const locomotionState = createLocomotionState({
      locomotionMode: "airborne",
      airborneKind: "jumping",
      grounded: false,
      gait: "walk",
      planarSpeed: 1.6,
      inputMagnitude: 1,
      verticalVelocity: 5.2,
      contact: {
        collisionCount: 1,
        collidedAxes: {
          x: true,
          y: false,
          z: false
        },
        groundNormal: null,
        groundDistance: null,
        slopeDegrees: null
      }
    });

    expect(
      resolveRuntimeMovementTransitionSignals({
        previousLocomotionState,
        previousInWaterVolume: false,
        locomotionState,
        inWaterVolume: false,
        jumpStarted: true,
        headBump: false
      })
    ).toEqual({
      jumpStarted: true,
      leftGround: true,
      startedFalling: false,
      landed: false,
      enteredWater: false,
      exitedWater: false,
      wallContactStarted: true,
      headBump: false
    });
  });

  it("derives falling, water-entry, and head-bump transitions", () => {
    const previousLocomotionState = createLocomotionState({
      locomotionMode: "airborne",
      airborneKind: "jumping",
      grounded: false,
      verticalVelocity: 1.8
    });
    const locomotionState = createLocomotionState({
      locomotionMode: "airborne",
      airborneKind: "falling",
      grounded: false,
      verticalVelocity: -3.4
    });

    expect(
      resolveRuntimeMovementTransitionSignals({
        previousLocomotionState,
        previousInWaterVolume: false,
        locomotionState,
        inWaterVolume: true,
        jumpStarted: false,
        headBump: true
      })
    ).toEqual({
      jumpStarted: false,
      leftGround: false,
      startedFalling: true,
      landed: false,
      enteredWater: true,
      exitedWater: false,
      wallContactStarted: false,
      headBump: true
    });
  });

  it("packages movement hooks for camera, audio, and animation consumers", () => {
    const runtimeScene = buildRuntimeSceneFromDocument(
      createEmptySceneDocument()
    );
    const telemetry = createPlayerControllerTelemetry({
      feetPosition: { x: 1, y: 2, z: 3 },
      eyePosition: { x: 1, y: 3.6, z: 3 },
      grounded: false,
      locomotionState: createLocomotionState({
        locomotionMode: "swimming",
        airborneKind: null,
        grounded: false,
        gait: "walk",
        inputMagnitude: 0.35,
        planarSpeed: 0.6,
        verticalVelocity: 0
      }),
      movement: runtimeScene.playerMovement,
      inWaterVolume: true,
      cameraSubmerged: true,
      inFogVolume: false,
      pointerLocked: false,
      spawn: runtimeScene.spawn,
      previousLocomotionState: createLocomotionState({
        locomotionMode: "grounded",
        grounded: true
      }),
      previousInWaterVolume: false,
      jumpStarted: false,
      headBump: false
    });

    expect(telemetry.signals.enteredWater).toBe(true);
    expect(telemetry.hooks.camera.swimming).toBe(true);
    expect(telemetry.hooks.camera.underwaterAmount).toBe(1);
    expect(telemetry.hooks.audio.underwaterAmount).toBe(1);
    expect(telemetry.hooks.animation.locomotionMode).toBe("swimming");
    expect(telemetry.hooks.animation.moving).toBe(true);
    expect(telemetry.hooks.animation.movementAmount).toBeCloseTo(0.6);
    expect(telemetry.hooks.animation.inWater).toBe(true);
    expect(telemetry.hooks.animation.signals.enteredWater).toBe(true);
  });

  it("treats diving as submerged water locomotion for hook consumers", () => {
    const runtimeScene = buildRuntimeSceneFromDocument(
      createEmptySceneDocument()
    );
    const telemetry = createPlayerControllerTelemetry({
      feetPosition: { x: 0, y: 0.5, z: 0 },
      eyePosition: { x: 0, y: 2, z: 0 },
      grounded: false,
      locomotionState: createLocomotionState({
        locomotionMode: "diving",
        airborneKind: null,
        grounded: false,
        gait: "idle",
        inputMagnitude: 0,
        planarSpeed: 0,
        verticalVelocity: -runtimeScene.playerMovement.moveSpeed
      }),
      movement: runtimeScene.playerMovement,
      inWaterVolume: true,
      cameraSubmerged: true,
      inFogVolume: true,
      pointerLocked: false,
      spawn: runtimeScene.spawn,
      previousLocomotionState: createLocomotionState({
        locomotionMode: "swimming",
        grounded: false
      }),
      previousInWaterVolume: true,
      jumpStarted: false,
      headBump: false
    });

    expect(telemetry.hooks.camera.swimming).toBe(true);
    expect(telemetry.hooks.camera.underwaterAmount).toBe(1);
    expect(telemetry.hooks.animation.locomotionMode).toBe("diving");
  });
});