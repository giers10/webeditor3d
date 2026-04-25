import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createActiveSceneControlTargetRef,
  createActivateCameraRigOverrideControlEffect,
  createActorControlTargetRef,
  createCameraRigControlTargetRef,
  createClearCameraRigOverrideControlEffect,
  createFollowActorPathControlEffect,
  createLightControlTargetRef,
  createModelInstanceControlTargetRef,
  createPlayActorAnimationControlEffect,
  createPlayModelAnimationControlEffect,
  createProjectGlobalControlTargetRef,
  createPlaySoundControlEffect,
  createSetActorPresenceControlEffect,
  createSetProjectTimePausedControlEffect,
  type ControlEffect,
  createSetAmbientLightColorControlEffect,
  createSetAmbientLightIntensityControlEffect,
  createSetLightEnabledControlEffect,
  createSetLightColorControlEffect,
  createSetLightIntensityControlEffect,
  createSetModelInstanceVisibleControlEffect,
  createSetSoundVolumeControlEffect,
  createSetSunLightColorControlEffect,
  createSetSunLightIntensityControlEffect,
  createSoundEmitterControlTargetRef,
  createStopModelAnimationControlEffect,
  createStopSoundControlEffect
} from "../../src/controls/control-surface";
import { createBoxBrush } from "../../src/document/brushes";
import { createScenePath } from "../../src/document/paths";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import {
  createCameraRigEntity,
  createCameraRigEntityTargetRef,
  createCameraRigPlayerTargetRef,
  createCameraRigWorldPointTargetRef,
  createInteractableEntity,
  createNpcEntity,
  createPointLightEntity,
  createPlayerStartEntity,
  createSoundEmitterEntity,
  createTriggerVolumeEntity
} from "../../src/entities/entity-instances";
import {
  createControlInteractionLink,
  type InteractionLink
} from "../../src/interactions/interaction-links";
import { createProjectScheduleRoutine } from "../../src/scheduler/project-scheduler";
import { createProjectSequence } from "../../src/sequencer/project-sequences";
import {
  createProjectAssetStorageKey,
  type AudioAssetRecord,
  type ModelAssetRecord
} from "../../src/assets/project-assets";
import { createModelInstance } from "../../src/assets/model-instances";
import { RapierCollisionWorld } from "../../src/runtime-three/rapier-collision-world";
import {
  RuntimeHost,
  resolveRuntimeTargetVisualPlacement,
  type RuntimeDialogueState,
  type RuntimePauseState,
  type RuntimeSceneLoadState
} from "../../src/runtime-three/runtime-host";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";
import { AnimationClip, BoxGeometry, PerspectiveCamera, Vector3, type AnimationMixer } from "three";
import { createFixtureLoadedModelAssetFromGeometry } from "../helpers/model-collider-fixtures";

function createDeferred<T>() {
  let resolve: ((value: T) => void) | null = null;
  let reject: ((error: unknown) => void) | null = null;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    resolve(value: T) {
      resolve?.(value);
    },
    reject(error: unknown) {
      reject?.(error);
    }
  };
}

function resolveYawPitchRadians(direction: Vector3) {
  return {
    yawRadians: Math.atan2(direction.x, direction.z),
    pitchRadians: Math.asin(Math.max(-1, Math.min(1, direction.y)))
  };
}

function captureCameraPose(camera: PerspectiveCamera) {
  const position = camera.position.clone();
  const lookTarget = position.clone().add(camera.getWorldDirection(new Vector3()));

  return {
    position,
    lookTarget
  };
}

function resolveShortestAngleDeltaDegrees(fromDegrees: number, toDegrees: number) {
  return ((toDegrees - fromDegrees + 540) % 360) - 180;
}

describe("RuntimeHost", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delays controller activation until collision setup reports the scene as ready", async () => {
    const runtimeScene = buildRuntimeSceneFromDocument(
      createEmptySceneDocument()
    );
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const collisionWorld = {
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld;
    const deferredCollisionWorld = createDeferred<RapierCollisionWorld>();
    vi.spyOn(RapierCollisionWorld, "create").mockReturnValue(
      deferredCollisionWorld.promise
    );

    const runtimeMessages: Array<string | null> = [];
    const sceneLoadStates: RuntimeSceneLoadState[] = [];
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.setRuntimeMessageHandler((message) => {
      runtimeMessages.push(message);
    });
    host.setSceneLoadStateHandler((state) => {
      sceneLoadStates.push(state);
    });

    host.loadScene(runtimeScene);
    host.setNavigationMode("thirdPerson");

    expect(sceneLoadStates).toEqual([
      {
        status: "loading",
        message: null
      }
    ]);
    expect(runtimeMessages).toEqual([null]);

    deferredCollisionWorld.resolve(collisionWorld);

    await waitFor(() => {
      expect(sceneLoadStates).toContainEqual({
        status: "ready",
        message: null
      });
      expect(runtimeMessages).toContain(
        "Third Person active. Drag to orbit the camera, use the right stick for gamepad camera look, move with your authored bindings, and scroll to zoom."
      );
    });

    host.dispose();
    expect(collisionWorld.dispose).toHaveBeenCalledTimes(1);
  });

  it("starts default-active rigs in place and blends rig-to-rig overrides", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const defaultRig = createCameraRigEntity({
      id: "entity-camera-rig-default",
      position: {
        x: 0,
        y: 5,
        z: 10
      },
      priority: 10,
      defaultActive: true,
      target: createCameraRigWorldPointTargetRef({
        x: 0,
        y: 1,
        z: 0
      }),
      transitionMode: "blend",
      transitionDurationSeconds: 0.75
    });
    const overrideRig = createCameraRigEntity({
      id: "entity-camera-rig-override",
      position: {
        x: 10,
        y: 4,
        z: -6
      },
      priority: 0,
      defaultActive: false,
      target: createCameraRigWorldPointTargetRef({
        x: 2,
        y: 2,
        z: -1
      }),
      transitionMode: "blend",
      transitionDurationSeconds: 0.5
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Camera Rig Priority Scene" }),
      entities: {
        [defaultRig.id]: defaultRig,
        [overrideRig.id]: overrideRig
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      sceneReady: boolean;
      camera: PerspectiveCamera;
      activeRuntimeCameraRig: { entityId: string } | null;
      cameraTransitionState: { elapsedSeconds: number } | null;
      applyActiveCameraRig(dt: number): { entityId: string } | null;
    };

    hostInternals.sceneReady = true;
    hostInternals.camera.position.set(-12, 3, 14);
    hostInternals.camera.lookAt(0, 1.6, 0);

    expect(hostInternals.applyActiveCameraRig(0.1)?.entityId).toBe(defaultRig.id);
    expect(hostInternals.camera.position).toMatchObject(defaultRig.position);
    expect(hostInternals.cameraTransitionState).toBeNull();

    host.setActiveCameraRigOverride(overrideRig.id);

    expect(hostInternals.applyActiveCameraRig(0.25)?.entityId).toBe(
      overrideRig.id
    );
    expect(hostInternals.activeRuntimeCameraRig?.entityId).toBe(overrideRig.id);
    expect(hostInternals.camera.position.x).toBeCloseTo(5, 4);
    expect(hostInternals.camera.position.y).toBeCloseTo(4.5, 4);
    expect(hostInternals.camera.position.z).toBeCloseTo(2, 4);

    hostInternals.applyActiveCameraRig(0.25);

    expect(hostInternals.camera.position).toMatchObject(overrideRig.position);

    host.dispose();
  });

  it("blends from gameplay camera into an active rig override", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const cameraRig = createCameraRigEntity({
      id: "entity-camera-rig-gameplay-entry",
      defaultActive: false,
      position: {
        x: 8,
        y: 4,
        z: -6
      },
      target: createCameraRigWorldPointTargetRef({
        x: 0,
        y: 1.5,
        z: 0
      }),
      transitionMode: "blend",
      transitionDurationSeconds: 0.5
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Camera Rig Gameplay Entry Scene" }),
      entities: {
        [cameraRig.id]: cameraRig
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      sceneReady: boolean;
      camera: PerspectiveCamera;
      cameraTransitionState: { elapsedSeconds: number } | null;
      applyActiveCameraRig(dt: number): { entityId: string } | null;
    };

    hostInternals.sceneReady = true;
    hostInternals.applyActiveCameraRig(0);
    hostInternals.camera.position.set(0, 2, 12);
    hostInternals.camera.lookAt(0, 1.5, 0);

    host.setActiveCameraRigOverride(cameraRig.id);

    expect(hostInternals.applyActiveCameraRig(0.25)?.entityId).toBe(cameraRig.id);
    expect(hostInternals.cameraTransitionState).not.toBeNull();
    expect(hostInternals.camera.position.x).toBeCloseTo(4, 4);
    expect(hostInternals.camera.position.y).toBeCloseTo(3, 4);
    expect(hostInternals.camera.position.z).toBeCloseTo(3, 4);

    hostInternals.applyActiveCameraRig(0.25);

    expect(hostInternals.camera.position).toMatchObject(cameraRig.position);

    host.dispose();
  });

  it("blends from a rig back to the gameplay camera", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const cameraRig = createCameraRigEntity({
      id: "entity-camera-rig-gameplay-exit",
      defaultActive: false,
      position: {
        x: 8,
        y: 4,
        z: -6
      },
      target: createCameraRigWorldPointTargetRef({
        x: 0,
        y: 1.5,
        z: 0
      }),
      transitionMode: "blend",
      transitionDurationSeconds: 0.5
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Camera Rig Gameplay Exit Scene" }),
      entities: {
        [cameraRig.id]: cameraRig
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      sceneReady: boolean;
      camera: PerspectiveCamera;
      cameraTransitionState: { elapsedSeconds: number } | null;
      applyActiveCameraRig(
        dt: number,
        previousCameraPose?: {
          position: Vector3;
          lookTarget: Vector3;
        }
      ): { entityId: string } | null;
    };

    hostInternals.sceneReady = true;
    hostInternals.applyActiveCameraRig(0);
    hostInternals.camera.position.set(0, 2, 12);
    hostInternals.camera.lookAt(0, 1.5, 0);
    host.setActiveCameraRigOverride(cameraRig.id);
    hostInternals.applyActiveCameraRig(0.5);

    const previousRigPose = captureCameraPose(hostInternals.camera);

    host.setActiveCameraRigOverride(null);
    hostInternals.camera.position.set(-6, 3, 8);
    hostInternals.camera.lookAt(0, 1.5, 0);

    expect(hostInternals.applyActiveCameraRig(0.25, previousRigPose)).toBeNull();
    expect(hostInternals.cameraTransitionState).not.toBeNull();
    expect(hostInternals.camera.position.x).toBeCloseTo(1, 4);
    expect(hostInternals.camera.position.y).toBeCloseTo(3.5, 4);
    expect(hostInternals.camera.position.z).toBeCloseTo(1, 4);

    hostInternals.camera.position.set(-6, 3, 8);
    hostInternals.camera.lookAt(0, 1.5, 0);
    hostInternals.applyActiveCameraRig(0.25, previousRigPose);

    expect(hostInternals.camera.position).toMatchObject({
      x: -6,
      y: 3,
      z: 8
    });

    host.dispose();
  });

  it("activates the dialogue attention camera and pauses runtime when dialogue opens", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-dialogue-camera",
      position: {
        x: 0,
        y: 0,
        z: 0
      }
    });
    const npc = createNpcEntity({
      id: "entity-npc-dialogue-camera",
      position: {
        x: 2,
        y: 0,
        z: 2
      },
      dialogues: [
        {
          id: "dialogue-attention",
          title: "Attention",
          lines: [
            {
              id: "dialogue-attention-line-1",
              text: "Look this way."
            }
          ]
        }
      ],
      defaultDialogueId: "dialogue-attention"
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Dialogue Attention Scene" }),
      entities: {
        [playerStart.id]: playerStart,
        [npc.id]: npc
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      sceneReady: boolean;
      camera: PerspectiveCamera;
      currentPauseState: RuntimePauseState;
      activeCameraSourceKey: string | null;
      activeRuntimeCameraRig: { entityId: string } | null;
      cameraTransitionState: { elapsedSeconds: number } | null;
      applyActiveCameraRig(
        dt: number,
        previousCameraPose?: {
          position: Vector3;
          lookTarget: Vector3;
        }
      ): { entityId: string } | null;
      createInteractionDispatcher(): {
        startNpcDialogue(
          npcEntityId: string,
          dialogueId: string | null,
          source?: {
            kind: "interactionLink" | "npc" | "direct";
            sourceEntityId: string | null;
            linkId: string | null;
            trigger: "enter" | "exit" | "click" | null;
          }
        ): void;
      };
    };
    const dispatcher = hostInternals.createInteractionDispatcher();

    hostInternals.sceneReady = true;
    hostInternals.camera.position.set(0, 2.6, 6);
    hostInternals.camera.lookAt(0, 1.6, 0);
    hostInternals.applyActiveCameraRig(0, captureCameraPose(hostInternals.camera));

    dispatcher.startNpcDialogue(npc.id, null, {
      kind: "npc",
      sourceEntityId: npc.id,
      linkId: null,
      trigger: "click"
    });

    const gameplayPose = captureCameraPose(hostInternals.camera);
    hostInternals.applyActiveCameraRig(0.175, gameplayPose);

    expect(hostInternals.currentPauseState).toEqual({
      paused: true,
      source: "dialogue"
    });
    expect(hostInternals.activeCameraSourceKey).toBe(`dialogue:${npc.id}`);
    expect(hostInternals.activeRuntimeCameraRig).toBeNull();
    expect(hostInternals.cameraTransitionState).not.toBeNull();
    expect(hostInternals.camera.position.z).toBeLessThan(6);

    hostInternals.applyActiveCameraRig(0.175, gameplayPose);

    const cameraForward = hostInternals.camera.getWorldDirection(new Vector3());
    const playerFocusDirection = new Vector3(
      -hostInternals.camera.position.x,
      1.312 - hostInternals.camera.position.y,
      -hostInternals.camera.position.z
    ).normalize();
    const npcFocusDirection = new Vector3(
      2 - hostInternals.camera.position.x,
      1.408 - hostInternals.camera.position.y,
      2 - hostInternals.camera.position.z
    ).normalize();

    expect(cameraForward.dot(playerFocusDirection)).toBeGreaterThan(0.6);
    expect(cameraForward.dot(npcFocusDirection)).toBeGreaterThan(0.6);

    host.dispose();
  });

  it("resolves dialogue attention camera collision from the conversation midpoint", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const resolveThirdPersonCameraCollision = vi.fn(
      (
        pivot: { x: number; y: number; z: number },
        desiredCameraPosition: { x: number; y: number; z: number },
        _radius: number
      ) => ({
        x: pivot.x + (desiredCameraPosition.x - pivot.x) * 0.55,
        y: pivot.y + (desiredCameraPosition.y - pivot.y) * 0.55,
        z: pivot.z + (desiredCameraPosition.z - pivot.z) * 0.55
      })
    );
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision
    } as unknown as RapierCollisionWorld);

    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-dialogue-collision",
      position: {
        x: 0,
        y: 0,
        z: 0
      }
    });
    const npc = createNpcEntity({
      id: "entity-npc-dialogue-collision",
      position: {
        x: 2,
        y: 0,
        z: 2
      },
      dialogues: [
        {
          id: "dialogue-collision",
          title: "Collision",
          lines: [
            {
              id: "dialogue-collision-line-1",
              text: "Avoid the wall."
            }
          ]
        }
      ],
      defaultDialogueId: "dialogue-collision"
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Dialogue Collision Scene" }),
      entities: {
        [playerStart.id]: playerStart,
        [npc.id]: npc
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      sceneReady: boolean;
      camera: PerspectiveCamera;
      collisionWorld: RapierCollisionWorld | null;
      applyActiveCameraRig(
        dt: number,
        previousCameraPose?: {
          position: Vector3;
          lookTarget: Vector3;
        }
      ): { entityId: string } | null;
      createInteractionDispatcher(): {
        startNpcDialogue(
          npcEntityId: string,
          dialogueId: string | null,
          source?: {
            kind: "interactionLink" | "npc" | "direct";
            sourceEntityId: string | null;
            linkId: string | null;
            trigger: "enter" | "exit" | "click" | null;
          }
        ): void;
      };
    };
    const dispatcher = hostInternals.createInteractionDispatcher();

    hostInternals.sceneReady = true;
    hostInternals.collisionWorld = {
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision
    } as unknown as RapierCollisionWorld;
    hostInternals.camera.position.set(0, 2.6, 6);
    hostInternals.camera.lookAt(0, 1.6, 0);

    dispatcher.startNpcDialogue(npc.id, null, {
      kind: "npc",
      sourceEntityId: npc.id,
      linkId: null,
      trigger: "click"
    });

    const gameplayPose = captureCameraPose(hostInternals.camera);
    hostInternals.applyActiveCameraRig(0.175, gameplayPose);

    expect(resolveThirdPersonCameraCollision).toHaveBeenCalled();
    const lastCollisionCall = resolveThirdPersonCameraCollision.mock.calls.at(-1);

    expect(lastCollisionCall).toBeDefined();

    const [pivot, desiredCameraPosition, radius] = lastCollisionCall as [
      { x: number; y: number; z: number },
      { x: number; y: number; z: number },
      number
    ];
    expect(pivot).toMatchObject({
      x: 1,
      z: 1
    });
    expect(pivot?.y).toBeCloseTo(1.36, 5);
    expect(radius).toBe(0.2);
    expect(hostInternals.camera.position).toMatchObject({
      x: pivot.x + (desiredCameraPosition.x - pivot.x) * 0.55,
      y: pivot.y + (desiredCameraPosition.y - pivot.y) * 0.55,
      z: pivot.z + (desiredCameraPosition.z - pivot.z) * 0.55
    });

    host.dispose();
  });

  it("stages dialogue participants with minimum spacing and restores npc yaw after dialogue", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const canOccupyPlayerShape = vi.fn(() => true);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      canOccupyPlayerShape,
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-dialogue-spacing",
      position: {
        x: 1.9,
        y: 0,
        z: 2
      },
      yawDegrees: 0
    });
    const npc = createNpcEntity({
      id: "entity-npc-dialogue-spacing",
      position: {
        x: 2,
        y: 0,
        z: 2
      },
      yawDegrees: 0,
      dialogues: [
        {
          id: "dialogue-spacing",
          title: "Spacing",
          lines: [
            {
              id: "dialogue-spacing-line-1",
              text: "Take a step back."
            }
          ]
        }
      ],
      defaultDialogueId: "dialogue-spacing"
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Dialogue Spacing Scene" }),
      entities: {
        [playerStart.id]: playerStart,
        [npc.id]: npc
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      sceneReady: boolean;
      camera: PerspectiveCamera;
      collisionWorld: RapierCollisionWorld | null;
      activeCameraSourceKey: string | null;
      currentPlayerControllerTelemetry:
        | {
            feetPosition: { x: number; y: number; z: number };
            yawDegrees: number;
          }
        | null;
      dialogueParticipantState: { npcEntityId: string } | null;
      runtimeScene: ReturnType<typeof buildRuntimeSceneFromDocument> | null;
      activateDesiredNavigationController(): void;
      updateRuntimeDialogueParticipants(dt: number): void;
      applyActiveCameraRig(
        dt: number,
        previousCameraPose?: {
          position: Vector3;
          lookTarget: Vector3;
        }
      ): { entityId: string } | null;
      createInteractionDispatcher(): {
        startNpcDialogue(
          npcEntityId: string,
          dialogueId: string | null,
          source?: {
            kind: "interactionLink" | "npc" | "direct";
            sourceEntityId: string | null;
            linkId: string | null;
            trigger: "enter" | "exit" | "click" | null;
          }
        ): void;
      };
    };
    const dispatcher = hostInternals.createInteractionDispatcher();

    hostInternals.sceneReady = true;
    hostInternals.collisionWorld = {
      dispose: vi.fn(),
      canOccupyPlayerShape,
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld;
    hostInternals.activateDesiredNavigationController();

    expect(hostInternals.currentPlayerControllerTelemetry?.feetPosition).toEqual(
      playerStart.position
    );

    dispatcher.startNpcDialogue(npc.id, null, {
      kind: "npc",
      sourceEntityId: npc.id,
      linkId: null,
      trigger: "click"
    });

    expect(hostInternals.dialogueParticipantState?.npcEntityId).toBe(npc.id);

    hostInternals.updateRuntimeDialogueParticipants(0.05);
    hostInternals.updateRuntimeDialogueParticipants(0.05);
    hostInternals.applyActiveCameraRig(
      0.1,
      captureCameraPose(hostInternals.camera)
    );

    const playerTelemetry = hostInternals.currentPlayerControllerTelemetry;
    const runtimeNpc =
      hostInternals.runtimeScene?.entities.npcs.find(
        (candidate) => candidate.entityId === npc.id
      ) ?? null;

    expect(canOccupyPlayerShape).toHaveBeenCalled();
    expect(playerTelemetry).not.toBeNull();
    expect(runtimeNpc).not.toBeNull();

    const playerFeetPosition = playerTelemetry?.feetPosition ?? {
      x: 0,
      y: 0,
      z: 0
    };
    const playerDistanceFromNpc = Math.hypot(
      playerFeetPosition.x - npc.position.x,
      playerFeetPosition.z - npc.position.z
    );
    const playerTargetYawDegrees =
      (Math.atan2(npc.position.x - playerFeetPosition.x, npc.position.z - playerFeetPosition.z) *
        180) /
      Math.PI;

    expect(playerDistanceFromNpc).toBeGreaterThan(0.1);
    expect(playerDistanceFromNpc).toBeLessThan(1.09);
    expect(hostInternals.activeCameraSourceKey).toBe("gameplay");
    expect(
      Math.abs(
        resolveShortestAngleDeltaDegrees(
          playerTelemetry?.yawDegrees ?? 0,
          playerTargetYawDegrees
        )
      )
    ).toBeLessThan(35);
    expect(
      Math.abs(
        resolveShortestAngleDeltaDegrees(runtimeNpc?.yawDegrees ?? 0, 0)
      )
    ).toBeGreaterThan(10);

    hostInternals.updateRuntimeDialogueParticipants(0.1);
    hostInternals.updateRuntimeDialogueParticipants(0.1);
    hostInternals.applyActiveCameraRig(
      0.1,
      captureCameraPose(hostInternals.camera)
    );

    const stagedPlayerTelemetry = hostInternals.currentPlayerControllerTelemetry;
    const stagedPlayerDistanceFromNpc = Math.hypot(
      (stagedPlayerTelemetry?.feetPosition.x ?? 0) - npc.position.x,
      (stagedPlayerTelemetry?.feetPosition.z ?? 0) - npc.position.z
    );

    expect(stagedPlayerDistanceFromNpc).toBeGreaterThanOrEqual(1.09);
    expect(hostInternals.activeCameraSourceKey).toBe(`dialogue:${npc.id}`);

    host.closeRuntimeDialogue();
    hostInternals.updateRuntimeDialogueParticipants(0.05);

    expect(runtimeNpc?.yawDegrees).not.toBeCloseTo(0, 3);

    for (let step = 0; step < 10; step += 1) {
      hostInternals.updateRuntimeDialogueParticipants(0.05);
    }

    expect(Math.abs(runtimeNpc?.yawDegrees ?? Number.POSITIVE_INFINITY)).toBeLessThan(1);
    expect(hostInternals.dialogueParticipantState).toBeNull();

    host.dispose();
  });

  it("keeps explicit camera rig overrides above dialogue attention", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const npc = createNpcEntity({
      id: "entity-npc-dialogue-rig-priority",
      position: {
        x: 2,
        y: 0,
        z: 2
      },
      dialogues: [
        {
          id: "dialogue-priority",
          title: "Priority",
          lines: [
            {
              id: "dialogue-priority-line-1",
              text: "Rig wins."
            }
          ]
        }
      ],
      defaultDialogueId: "dialogue-priority"
    });
    const rig = createCameraRigEntity({
      id: "entity-camera-rig-dialogue-override",
      position: {
        x: 8,
        y: 4,
        z: -6
      },
      target: createCameraRigEntityTargetRef(npc.id),
      transitionMode: "cut"
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Dialogue Rig Priority Scene" }),
      entities: {
        [npc.id]: npc,
        [rig.id]: rig
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      sceneReady: boolean;
      camera: PerspectiveCamera;
      currentPauseState: RuntimePauseState;
      activeCameraSourceKey: string | null;
      activeRuntimeCameraRig: { entityId: string } | null;
      applyActiveCameraRig(
        dt: number,
        previousCameraPose?: {
          position: Vector3;
          lookTarget: Vector3;
        }
      ): { entityId: string } | null;
      createInteractionDispatcher(): {
        startNpcDialogue(
          npcEntityId: string,
          dialogueId: string | null,
          source?: {
            kind: "interactionLink" | "npc" | "direct";
            sourceEntityId: string | null;
            linkId: string | null;
            trigger: "enter" | "exit" | "click" | null;
          }
        ): void;
      };
    };
    const dispatcher = hostInternals.createInteractionDispatcher();

    hostInternals.sceneReady = true;
    dispatcher.startNpcDialogue(npc.id, null, {
      kind: "npc",
      sourceEntityId: npc.id,
      linkId: null,
      trigger: "click"
    });
    host.setActiveCameraRigOverride(rig.id);

    expect(hostInternals.applyActiveCameraRig(0)?.entityId).toBe(rig.id);
    expect(hostInternals.currentPauseState).toEqual({
      paused: true,
      source: "dialogue"
    });
    expect(hostInternals.activeCameraSourceKey).toBe(`rig:${rig.id}`);
    expect(hostInternals.activeRuntimeCameraRig?.entityId).toBe(rig.id);
    expect(hostInternals.camera.position).toMatchObject(rig.position);

    host.dispose();
  });

  it("blends back to gameplay camera when dialogue closes", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-dialogue-exit",
      position: {
        x: 0,
        y: 0,
        z: 0
      }
    });
    const npc = createNpcEntity({
      id: "entity-npc-dialogue-exit",
      position: {
        x: 2,
        y: 0,
        z: 2
      },
      dialogues: [
        {
          id: "dialogue-exit",
          title: "Exit",
          lines: [
            {
              id: "dialogue-exit-line-1",
              text: "Back to play."
            }
          ]
        }
      ],
      defaultDialogueId: "dialogue-exit"
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Dialogue Exit Scene" }),
      entities: {
        [playerStart.id]: playerStart,
        [npc.id]: npc
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      sceneReady: boolean;
      camera: PerspectiveCamera;
      currentPauseState: RuntimePauseState;
      activeCameraSourceKey: string | null;
      cameraTransitionState: { elapsedSeconds: number } | null;
      applyActiveCameraRig(
        dt: number,
        previousCameraPose?: {
          position: Vector3;
          lookTarget: Vector3;
        }
      ): { entityId: string } | null;
      createInteractionDispatcher(): {
        startNpcDialogue(
          npcEntityId: string,
          dialogueId: string | null,
          source?: {
            kind: "interactionLink" | "npc" | "direct";
            sourceEntityId: string | null;
            linkId: string | null;
            trigger: "enter" | "exit" | "click" | null;
          }
        ): void;
      };
    };
    const dispatcher = hostInternals.createInteractionDispatcher();

    hostInternals.sceneReady = true;
    hostInternals.camera.position.set(0, 2.6, 6);
    hostInternals.camera.lookAt(0, 1.6, 0);
    dispatcher.startNpcDialogue(npc.id, null, {
      kind: "npc",
      sourceEntityId: npc.id,
      linkId: null,
      trigger: "click"
    });
    hostInternals.applyActiveCameraRig(0.35, captureCameraPose(hostInternals.camera));
    const dialoguePose = captureCameraPose(hostInternals.camera);

    host.closeRuntimeDialogue();
    hostInternals.camera.position.set(0, 2.6, 6);
    hostInternals.camera.lookAt(0, 1.6, 0);

    expect(hostInternals.applyActiveCameraRig(0.175, dialoguePose)).toBeNull();
    expect(hostInternals.currentPauseState).toEqual({
      paused: false,
      source: null
    });
    expect(hostInternals.activeCameraSourceKey).toBe("gameplay");
    expect(hostInternals.cameraTransitionState).not.toBeNull();
    expect(hostInternals.camera.position.z).toBeGreaterThan(
      dialoguePose.position.z
    );
    expect(hostInternals.camera.position.z).toBeLessThan(6);

    hostInternals.camera.position.set(0, 2.6, 6);
    hostInternals.camera.lookAt(0, 1.6, 0);
    hostInternals.applyActiveCameraRig(0.175, dialoguePose);

    expect(hostInternals.camera.position).toMatchObject({
      x: 0,
      y: 2.6,
      z: 6
    });

    host.dispose();
  });

  it("locks a fixed camera rig to its target and clamps authored look-around input", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-camera-rig",
      position: {
        x: 1,
        y: 0,
        z: -2
      }
    });
    const cameraRig = createCameraRigEntity({
      id: "entity-camera-rig-lookaround",
      position: {
        x: -4,
        y: 3,
        z: -8
      },
      target: createCameraRigPlayerTargetRef(),
      targetOffset: {
        x: 0,
        y: 1.6,
        z: 0
      },
      transitionMode: "cut",
      lookAround: {
        enabled: true,
        yawLimitDegrees: 10,
        pitchLimitDegrees: 5,
        recenterSpeed: 12
      }
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Camera Rig Look Scene" }),
      entities: {
        [playerStart.id]: playerStart,
        [cameraRig.id]: cameraRig
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      sceneReady: boolean;
      camera: PerspectiveCamera;
      applyActiveCameraRig(dt: number): { entityId: string } | null;
      handleRuntimePointerDown(event: {
        button: number;
        clientX: number;
        clientY: number;
        preventDefault(): void;
        stopImmediatePropagation(): void;
      }): void;
      handleRuntimePointerMove(event: {
        clientX: number;
        clientY: number;
        preventDefault(): void;
        stopImmediatePropagation(): void;
      }): void;
      handleRuntimePointerUp(event: {
        stopImmediatePropagation(): void;
      }): void;
    };

    hostInternals.sceneReady = true;

    expect(hostInternals.applyActiveCameraRig(0)?.entityId).toBe(cameraRig.id);

    const expectedBaseDirection = new Vector3(
      playerStart.position.x - cameraRig.position.x,
      playerStart.position.y + 1.6 - cameraRig.position.y,
      playerStart.position.z - cameraRig.position.z
    ).normalize();
    const baseDirection = hostInternals.camera.getWorldDirection(new Vector3());

    expect(baseDirection.angleTo(expectedBaseDirection)).toBeLessThan(1e-4);

    hostInternals.handleRuntimePointerDown({
      button: 0,
      clientX: 0,
      clientY: 0,
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    });
    hostInternals.handleRuntimePointerMove({
      clientX: -10000,
      clientY: 10000,
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    });
    hostInternals.applyActiveCameraRig(0);

    const lookedDirection = hostInternals.camera.getWorldDirection(new Vector3());
    const baseAngles = resolveYawPitchRadians(expectedBaseDirection);
    const lookedAngles = resolveYawPitchRadians(lookedDirection);

    expect(
      ((lookedAngles.yawRadians - baseAngles.yawRadians) * 180) / Math.PI
    ).toBeCloseTo(10, 1);
    expect(
      ((lookedAngles.pitchRadians - baseAngles.pitchRadians) * 180) / Math.PI
    ).toBeCloseTo(-5, 1);

    hostInternals.handleRuntimePointerUp({
      stopImmediatePropagation: vi.fn()
    });
    hostInternals.applyActiveCameraRig(0.5);

    const recenteredAngles = resolveYawPitchRadians(
      hostInternals.camera.getWorldDirection(new Vector3())
    );

    expect(
      Math.abs(recenteredAngles.yawRadians - baseAngles.yawRadians)
    ).toBeLessThan(Math.abs(lookedAngles.yawRadians - baseAngles.yawRadians));
    expect(
      Math.abs(recenteredAngles.pitchRadians - baseAngles.pitchRadians)
    ).toBeLessThan(
      Math.abs(lookedAngles.pitchRadians - baseAngles.pitchRadians)
    );

    host.dispose();
  });

  it("routes camera rig control effects through the runtime override path", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const defaultRig = createCameraRigEntity({
      id: "entity-camera-rig-default-control",
      position: {
        x: 0,
        y: 3,
        z: 6
      },
      defaultActive: true,
      target: createCameraRigWorldPointTargetRef({
        x: 0,
        y: 1.5,
        z: 0
      })
    });
    const overrideRig = createCameraRigEntity({
      id: "entity-camera-rig-override-control",
      position: {
        x: 10,
        y: 5,
        z: -4
      },
      defaultActive: false,
      target: createCameraRigWorldPointTargetRef({
        x: 1,
        y: 2,
        z: 0
      })
    });
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-camera-control"
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Camera Control Runtime Scene" }),
      entities: {
        [defaultRig.id]: defaultRig,
        [overrideRig.id]: overrideRig,
        [triggerVolume.id]: triggerVolume
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const activateEffect = createActivateCameraRigOverrideControlEffect({
      target: createCameraRigControlTargetRef(overrideRig.id)
    });
    const clearEffect = createClearCameraRigOverrideControlEffect({
      target: createCameraRigControlTargetRef(overrideRig.id)
    });
    const activateLink = createControlInteractionLink({
      id: "link-camera-activate",
      sourceEntityId: triggerVolume.id,
      effect: activateEffect
    });
    const clearLink = createControlInteractionLink({
      id: "link-camera-clear",
      sourceEntityId: triggerVolume.id,
      effect: clearEffect
    });
    const hostInternals = host as unknown as {
      sceneReady: boolean;
      activeCameraRigOverrideEntityId: string | null;
      activeRuntimeCameraRig: { entityId: string } | null;
      applyActiveCameraRig(dt: number): { entityId: string } | null;
      createInteractionDispatcher(): {
        dispatchControlEffect(
          effect: ControlEffect,
          link: InteractionLink
        ): void;
      };
    };
    const dispatcher = hostInternals.createInteractionDispatcher();

    hostInternals.sceneReady = true;
    expect(hostInternals.applyActiveCameraRig(0)?.entityId).toBe(defaultRig.id);

    dispatcher.dispatchControlEffect(activateEffect, activateLink);

    expect(hostInternals.activeCameraRigOverrideEntityId).toBe(overrideRig.id);
    expect(hostInternals.applyActiveCameraRig(0)?.entityId).toBe(overrideRig.id);
    expect(runtimeScene.control.resolved.discrete).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "cameraRigOverride",
          entityId: overrideRig.id,
          source: {
            kind: "interactionLink",
            linkId: activateLink.id
          }
        })
      ])
    );

    dispatcher.dispatchControlEffect(clearEffect, clearLink);

    expect(hostInternals.activeCameraRigOverrideEntityId).toBeNull();
    expect(hostInternals.applyActiveCameraRig(0)?.entityId).toBe(defaultRig.id);
    expect(runtimeScene.control.resolved.discrete).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "cameraRigOverride",
          entityId: null,
          source: {
            kind: "interactionLink",
            linkId: clearLink.id
          }
        })
      ])
    );

    host.dispose();
  });

  it("resolves rail camera rigs from the target's nearest path progress and preserves look-around", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const target = createInteractableEntity({
      id: "entity-camera-rail-target",
      position: {
        x: 3,
        y: 1,
        z: 2
      },
      prompt: "Anchor"
    });
    const path = createScenePath({
      id: "path-camera-rail-runtime",
      points: [
        {
          id: "point-a",
          position: {
            x: 0,
            y: 3,
            z: 0
          }
        },
        {
          id: "point-b",
          position: {
            x: 10,
            y: 3,
            z: 0
          }
        }
      ]
    });
    const cameraRig = createCameraRigEntity({
      id: "entity-camera-rig-rail-runtime",
      rigType: "rail",
      pathId: path.id,
      target: createCameraRigEntityTargetRef(target.id),
      targetOffset: {
        x: 0,
        y: 1.5,
        z: 0
      },
      transitionMode: "cut",
      lookAround: {
        enabled: true,
        yawLimitDegrees: 12,
        pitchLimitDegrees: 6,
        recenterSpeed: 10
      }
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Rail Camera Rig Runtime Scene" }),
      paths: {
        [path.id]: path
      },
      entities: {
        [target.id]: target,
        [cameraRig.id]: cameraRig
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      sceneReady: boolean;
      camera: PerspectiveCamera;
      runtimeScene: typeof runtimeScene;
      applyActiveCameraRig(dt: number): { entityId: string } | null;
      handleRuntimePointerDown(event: {
        button: number;
        clientX: number;
        clientY: number;
        preventDefault(): void;
        stopImmediatePropagation(): void;
      }): void;
      handleRuntimePointerMove(event: {
        clientX: number;
        clientY: number;
        preventDefault(): void;
        stopImmediatePropagation(): void;
      }): void;
      handleRuntimePointerUp(event: {
        stopImmediatePropagation(): void;
      }): void;
    };

    hostInternals.sceneReady = true;

    expect(hostInternals.applyActiveCameraRig(0)?.entityId).toBe(cameraRig.id);
    expect(hostInternals.camera.position).toMatchObject({
      x: 3,
      y: 3,
      z: 0
    });

    const initialDirection = hostInternals.camera.getWorldDirection(
      new Vector3()
    );

    hostInternals.handleRuntimePointerDown({
      button: 0,
      clientX: 0,
      clientY: 0,
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    });
    hostInternals.handleRuntimePointerMove({
      clientX: -1000,
      clientY: 0,
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    });
    hostInternals.applyActiveCameraRig(0);

    expect(hostInternals.camera.position).toMatchObject({
      x: 3,
      y: 3,
      z: 0
    });
    expect(
      hostInternals.camera
        .getWorldDirection(new Vector3())
        .angleTo(initialDirection)
    ).toBeGreaterThan(0.05);

    hostInternals.handleRuntimePointerUp({
      stopImmediatePropagation: vi.fn()
    });
    hostInternals.runtimeScene.entities.interactables[0]!.position = {
      x: 8,
      y: 1,
      z: 2
    };
    hostInternals.applyActiveCameraRig(0);

    expect(hostInternals.camera.position).toMatchObject({
      x: 8,
      y: 3,
      z: 0
    });

    host.dispose();
  });

  it("maps rail camera rig progress between authored world points", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const target = createInteractableEntity({
      id: "entity-camera-mapped-rail-target",
      position: {
        x: 2,
        y: 1,
        z: 2
      },
      prompt: "Anchor"
    });
    const path = createScenePath({
      id: "path-camera-mapped-rail-runtime",
      points: [
        {
          id: "point-a",
          position: {
            x: 0,
            y: 3,
            z: 0
          }
        },
        {
          id: "point-b",
          position: {
            x: 10,
            y: 3,
            z: 0
          }
        }
      ]
    });
    const cameraRig = createCameraRigEntity({
      id: "entity-camera-rig-mapped-rail-runtime",
      rigType: "rail",
      pathId: path.id,
      railPlacementMode: "mapTargetBetweenPoints",
      trackStartPoint: {
        x: 0,
        y: 1,
        z: 2
      },
      trackEndPoint: {
        x: 10,
        y: 1,
        z: 2
      },
      railStartProgress: 0.25,
      railEndProgress: 0.75,
      target: createCameraRigEntityTargetRef(target.id),
      transitionMode: "cut"
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Mapped Rail Camera Rig Runtime Scene" }),
      paths: {
        [path.id]: path
      },
      entities: {
        [target.id]: target,
        [cameraRig.id]: cameraRig
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      sceneReady: boolean;
      camera: PerspectiveCamera;
      runtimeScene: typeof runtimeScene;
      applyActiveCameraRig(dt: number): { entityId: string } | null;
    };

    hostInternals.sceneReady = true;

    expect(hostInternals.applyActiveCameraRig(0)?.entityId).toBe(cameraRig.id);
    expect(hostInternals.camera.position).toMatchObject({
      x: 3.5,
      y: 3,
      z: 0
    });

    hostInternals.runtimeScene.entities.interactables[0]!.position = {
      x: 10,
      y: 1,
      z: 2
    };
    hostInternals.applyActiveCameraRig(0);

    expect(hostInternals.camera.position).toMatchObject({
      x: 7.5,
      y: 3,
      z: 0
    });

    host.dispose();
  });

  it("applies typed light control effects through the runtime dispatcher", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const pointLight = createPointLightEntity({
      id: "entity-point-light-main",
      intensity: 1.25
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument(),
      entities: {
        [pointLight.id]: pointLight
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const disableEffect = createSetLightEnabledControlEffect({
      target: createLightControlTargetRef("pointLight", pointLight.id),
      enabled: false
    });
    const intensityEffect = createSetLightIntensityControlEffect({
      target: createLightControlTargetRef("pointLight", pointLight.id),
      intensity: 3.5
    });
    const disableLink = createControlInteractionLink({
      id: "link-light-disable",
      sourceEntityId: "entity-trigger-main",
      effect: disableEffect
    });
    const intensityLink = createControlInteractionLink({
      id: "link-light-intensity",
      sourceEntityId: "entity-trigger-main",
      effect: intensityEffect
    });
    const hostInternals = host as unknown as {
      createInteractionDispatcher(): {
        dispatchControlEffect(
          effect: ControlEffect,
          link: InteractionLink
        ): void;
      };
      localLightObjects: Map<
        string,
        {
          group: { visible: boolean };
          light: { intensity: number };
        }
      >;
    };
    const dispatcher = hostInternals.createInteractionDispatcher();
    const renderObjects = hostInternals.localLightObjects.get(pointLight.id);

    expect(renderObjects).toBeDefined();
    expect(renderObjects?.group.visible).toBe(true);
    expect(renderObjects?.light.intensity).toBe(1.25);

    dispatcher.dispatchControlEffect(disableEffect, disableLink);
    dispatcher.dispatchControlEffect(intensityEffect, intensityLink);

    expect(renderObjects?.group.visible).toBe(false);
    expect(renderObjects?.light.intensity).toBe(3.5);
    expect(runtimeScene.control.resolved.discrete).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "lightEnabled",
          value: false,
          source: {
            kind: "interactionLink",
            linkId: disableLink.id
          }
        })
      ])
    );
    expect(runtimeScene.control.resolved.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "lightIntensity",
          value: 3.5,
          source: {
            kind: "interactionLink",
            linkId: intensityLink.id
          }
        })
      ])
    );

    host.dispose();
  });

  it("creates derived runtime point lights for authored light volumes", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const lightBrush = createBoxBrush({
      id: "brush-runtime-light-volume",
      size: {
        x: 6,
        y: 5,
        z: 3
      },
      volume: {
        mode: "light",
        light: {
          colorHex: "#ffe0b6",
          intensity: 2,
          padding: 0.4,
          falloff: "smoothstep"
        }
      }
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument(),
      brushes: {
        [lightBrush.id]: lightBrush
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });

    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      lightVolumeObjects: Map<
        string,
        {
          group: { visible: boolean };
          lights: Array<{ intensity: number; distance: number; castShadow: boolean }>;
        }
      >;
    };
    const renderObjects = hostInternals.lightVolumeObjects.get(lightBrush.id);

    expect(runtimeScene.volumes.light).toHaveLength(1);
    expect(runtimeScene.volumes.light[0]?.lights).toHaveLength(4);
    expect(renderObjects).toBeDefined();
    expect(renderObjects?.group.visible).toBe(true);
    expect(renderObjects?.lights).toHaveLength(4);
    expect(
      renderObjects?.lights.every(
        (light) => light.intensity > 0 && light.distance > 0 && light.castShadow === false
      )
    ).toBe(true);

    host.dispose();
  });

  it("applies project time pause control effects through the runtime dispatcher", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const runtimeScene = buildRuntimeSceneFromDocument(
      createEmptySceneDocument()
    );
    const host = new RuntimeHost({
      enableRendering: false
    });
    const pauseStates: RuntimePauseState[] = [];
    host.setRuntimePauseStateHandler((state) => {
      pauseStates.push(state);
    });
    host.loadScene(runtimeScene);

    const pauseEffect = createSetProjectTimePausedControlEffect({
      target: createProjectGlobalControlTargetRef(),
      paused: true
    });
    const resumeEffect = createSetProjectTimePausedControlEffect({
      target: createProjectGlobalControlTargetRef(),
      paused: false
    });
    const pauseLink = createControlInteractionLink({
      id: "link-pause-time",
      sourceEntityId: "entity-trigger-main",
      effect: pauseEffect
    });
    const resumeLink = createControlInteractionLink({
      id: "link-resume-time",
      sourceEntityId: "entity-trigger-main",
      effect: resumeEffect
    });
    const hostInternals = host as unknown as {
      createInteractionDispatcher(): {
        dispatchControlEffect(
          effect: ControlEffect,
          link: InteractionLink
        ): void;
      };
    };
    const dispatcher = hostInternals.createInteractionDispatcher();

    dispatcher.dispatchControlEffect(pauseEffect, pauseLink);

    expect(pauseStates).toContainEqual({
      paused: true,
      source: "control"
    });
    expect(runtimeScene.control.resolved.discrete).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "projectTimePaused",
          target: {
            kind: "global",
            scope: "project"
          },
          value: true,
          source: {
            kind: "interactionLink",
            linkId: pauseLink.id
          }
        })
      ])
    );

    dispatcher.dispatchControlEffect(resumeEffect, resumeLink);

    expect(pauseStates).toContainEqual({
      paused: false,
      source: null
    });

    host.dispose();
  });

  it("opens, advances, and closes NPC dialogues through the runtime host", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const document = createEmptySceneDocument();
    const npc = createNpcEntity({
      id: "entity-npc-operator",
      dialogues: [
        {
          id: "dialogue-warning",
          title: "Generator Warning",
          lines: [
            {
              id: "dialogue-line-warning-1",
              text: "The generator is unstable."
            },
            {
              id: "dialogue-line-warning-2",
              text: "A low hum fills the room."
            }
          ]
        }
      ],
      defaultDialogueId: "dialogue-warning"
    });
    document.entities[npc.id] = npc;

    const runtimeScene = buildRuntimeSceneFromDocument(document);
    const host = new RuntimeHost({
      enableRendering: false
    });
    const dialogueStates: Array<RuntimeDialogueState | null> = [];
    host.setRuntimeDialogueHandler((dialogue) => {
      dialogueStates.push(dialogue);
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      createInteractionDispatcher(): {
        startNpcDialogue(
          npcEntityId: string,
          dialogueId: string | null,
          source?: {
            kind: "interactionLink" | "npc" | "direct";
            sourceEntityId: string | null;
            linkId: string | null;
            trigger: "enter" | "exit" | "click" | null;
          }
        ): void;
      };
    };
    const dispatcher = hostInternals.createInteractionDispatcher();

    dispatcher.startNpcDialogue(npc.id, "dialogue-warning", {
      kind: "npc",
      sourceEntityId: npc.id,
      linkId: null,
      trigger: "click"
    });
    host.advanceRuntimeDialogue();
    host.advanceRuntimeDialogue();

    expect(dialogueStates).toEqual([
      expect.objectContaining({
        dialogueId: "dialogue-warning",
        npcEntityId: npc.id,
        lineIndex: 0,
        speakerName: npc.actorId,
        text: "The generator is unstable.",
        source: {
          kind: "npc",
          sourceEntityId: npc.id,
          linkId: null,
          trigger: "click"
        }
      }),
      expect.objectContaining({
        dialogueId: "dialogue-warning",
        npcEntityId: npc.id,
        lineIndex: 1,
        speakerName: npc.actorId,
        text: "A low hum fills the room.",
        source: {
          kind: "npc",
          sourceEntityId: npc.id,
          linkId: null,
          trigger: "click"
        }
      }),
      null
    ]);

    host.dispose();
  });

  it("keeps dialogue pause active for runtime progression while camera blends and dialogue advance still work", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    vi.spyOn(performance, "now").mockReturnValue(1100);

    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-dialogue-pause",
      position: {
        x: 0,
        y: 0,
        z: 0
      }
    });
    const npc = createNpcEntity({
      id: "entity-npc-dialogue-pause",
      position: {
        x: 2,
        y: 0,
        z: 2
      },
      dialogues: [
        {
          id: "dialogue-pause",
          title: "Pause",
          lines: [
            {
              id: "dialogue-pause-line-1",
              text: "Time should stop."
            },
            {
              id: "dialogue-pause-line-2",
              text: "But dialogue should keep going."
            }
          ]
        }
      ],
      defaultDialogueId: "dialogue-pause"
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument({ name: "Dialogue Pause Scene" }),
      entities: {
        [playerStart.id]: playerStart,
        [npc.id]: npc
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      sceneReady: boolean;
      camera: PerspectiveCamera;
      currentClockState: {
        timeOfDayHours: number;
        dayCount: number;
        dayLengthMinutes: number;
      } | null;
      currentDialogue: RuntimeDialogueState | null;
      currentPauseState: RuntimePauseState;
      activeCameraSourceKey: string | null;
      cameraTransitionState: { elapsedSeconds: number } | null;
      previousFrameTime: number;
      applyActiveCameraRig(
        dt: number,
        previousCameraPose?: {
          position: Vector3;
          lookTarget: Vector3;
        }
      ): { entityId: string } | null;
      render(): void;
      createInteractionDispatcher(): {
        startNpcDialogue(
          npcEntityId: string,
          dialogueId: string | null,
          source?: {
            kind: "interactionLink" | "npc" | "direct";
            sourceEntityId: string | null;
            linkId: string | null;
            trigger: "enter" | "exit" | "click" | null;
          }
        ): void;
      };
    };
    const dispatcher = hostInternals.createInteractionDispatcher();

    hostInternals.sceneReady = true;
    hostInternals.previousFrameTime = 1000;
    hostInternals.camera.position.set(0, 2.6, 6);
    hostInternals.camera.lookAt(0, 1.6, 0);
    hostInternals.applyActiveCameraRig(0, captureCameraPose(hostInternals.camera));
    const clockBefore = {
      ...hostInternals.currentClockState!
    };

    dispatcher.startNpcDialogue(npc.id, null, {
      kind: "npc",
      sourceEntityId: npc.id,
      linkId: null,
      trigger: "click"
    });
    hostInternals.render();

    expect(hostInternals.currentPauseState).toEqual({
      paused: true,
      source: "dialogue"
    });
    expect(hostInternals.activeCameraSourceKey).toBe(`dialogue:${npc.id}`);
    expect(hostInternals.cameraTransitionState?.elapsedSeconds).toBeGreaterThan(0);
    expect(hostInternals.currentClockState).toEqual(clockBefore);

    host.advanceRuntimeDialogue();

    expect(hostInternals.currentDialogue?.lineIndex).toBe(1);
    expect(hostInternals.currentDialogue?.text).toBe(
      "But dialogue should keep going."
    );

    host.dispose();
  });

  it("publishes late dialogue handlers, ignores repeated same-NPC dialogue starts, and replaces with a different NPC dialogue", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const document = createEmptySceneDocument();
    const npcA = createNpcEntity({
      id: "entity-npc-a",
      dialogues: [
        {
          id: "dialogue-a",
          title: "A",
          lines: [
            {
              id: "dialogue-line-a-1",
              text: "First dialogue."
            }
          ]
        }
      ],
      defaultDialogueId: "dialogue-a"
    });
    const npcB = createNpcEntity({
      id: "entity-npc-b",
      dialogues: [
        {
          id: "dialogue-b",
          title: "B",
          lines: [
            {
              id: "dialogue-line-b-1",
              text: "Second dialogue."
            }
          ]
        }
      ],
      defaultDialogueId: "dialogue-b"
    });
    document.entities[npcA.id] = npcA;
    document.entities[npcB.id] = npcB;

    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(buildRuntimeSceneFromDocument(document));

    const hostInternals = host as unknown as {
      createInteractionDispatcher(): {
        startNpcDialogue(
          npcEntityId: string,
          dialogueId: string | null,
          source?: {
            kind: "interactionLink" | "npc" | "direct";
            sourceEntityId: string | null;
            linkId: string | null;
            trigger: "enter" | "exit" | "click" | null;
          }
        ): void;
      };
    };
    const dispatcher = hostInternals.createInteractionDispatcher();

    dispatcher.startNpcDialogue(npcA.id, "dialogue-a", {
      kind: "npc",
      sourceEntityId: npcA.id,
      linkId: null,
      trigger: "click"
    });

    const dialogueStates: Array<RuntimeDialogueState | null> = [];
    host.setRuntimeDialogueHandler((dialogue) => {
      dialogueStates.push(dialogue);
    });

    dispatcher.startNpcDialogue(npcA.id, "dialogue-a", {
      kind: "npc",
      sourceEntityId: npcA.id,
      linkId: null,
      trigger: "click"
    });
    dispatcher.startNpcDialogue(npcB.id, "dialogue-b", {
      kind: "npc",
      sourceEntityId: npcB.id,
      linkId: null,
      trigger: "click"
    });

    expect(dialogueStates).toEqual([
      expect.objectContaining({
        dialogueId: "dialogue-a",
        npcEntityId: npcA.id,
        text: "First dialogue.",
        source: {
          kind: "npc",
          sourceEntityId: npcA.id,
          linkId: null,
          trigger: "click"
        }
      }),
      expect.objectContaining({
        dialogueId: "dialogue-b",
        npcEntityId: npcB.id,
        text: "Second dialogue.",
        source: {
          kind: "npc",
          sourceEntityId: npcB.id,
          linkId: null,
          trigger: "click"
        }
      })
    ]);

    host.dispose();
  });


  it("applies expanded typed control effects for model, sound, and scene lighting", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const pointLight = createPointLightEntity({
      id: "entity-point-light-main",
      colorHex: "#ff8800",
      intensity: 1.25
    });
    const soundEmitter = createSoundEmitterEntity({
      id: "entity-sound-main",
      audioAssetId: "asset-audio-main",
      volume: 0.8
    });
    const modelAsset = {
      id: "asset-model-animated",
      kind: "model" as const,
      sourceName: "animated.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-animated"),
      byteLength: 1024,
      metadata: {
        kind: "model" as const,
        format: "glb" as const,
        sceneName: null,
        nodeCount: 1,
        meshCount: 1,
        materialNames: [],
        textureNames: [],
        animationNames: ["Idle"],
        boundingBox: null,
        warnings: []
      }
    } satisfies ModelAssetRecord;
    const audioAsset = {
      id: "asset-audio-main",
      kind: "audio" as const,
      sourceName: "loop.ogg",
      mimeType: "audio/ogg",
      storageKey: createProjectAssetStorageKey("asset-audio-main"),
      byteLength: 512,
      metadata: {
        kind: "audio" as const,
        durationSeconds: 2,
        channelCount: 2,
        sampleRateHz: 48000,
        warnings: []
      }
    } satisfies AudioAssetRecord;
    const modelInstance = createModelInstance({
      id: "model-instance-animated",
      assetId: modelAsset.id
    });
    const runtimeScene = buildRuntimeSceneFromDocument({
      ...createEmptySceneDocument(),
      assets: {
        [modelAsset.id]: modelAsset,
        [audioAsset.id]: audioAsset
      },
      modelInstances: {
        [modelInstance.id]: modelInstance
      },
      entities: {
        [triggerVolume.id]: triggerVolume,
        [pointLight.id]: pointLight,
        [soundEmitter.id]: soundEmitter
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      createInteractionDispatcher(): {
        dispatchControlEffect(
          effect: ControlEffect,
          link: InteractionLink
        ): void;
      };
      localLightObjects: Map<
        string,
        {
          group: { visible: boolean };
          light: { intensity: number; color: { getHexString(): string } };
        }
      >;
      modelRenderObjects: Map<string, { visible: boolean }>;
      ambientLight: {
        intensity: number;
        color: { getHexString(): string };
      };
      sunLight: {
        intensity: number;
        color: { getHexString(): string };
      };
      audioSystem: {
        hasSoundEmitter(soundEmitterId: string): boolean;
        playSound(soundEmitterId: string, link: InteractionLink | null): void;
        stopSound(soundEmitterId: string): void;
        setSoundEmitterVolume(soundEmitterId: string, volume: number): void;
      };
      animationMixers: Map<string, AnimationMixer>;
      applyPlayAnimationAction(
        instanceId: string,
        clipName: string,
        loop: boolean | undefined
      ): void;
      applyStopAnimationAction(instanceId: string): void;
    };

    const dispatcher = hostInternals.createInteractionDispatcher();
    const lightRenderObjects = hostInternals.localLightObjects.get(pointLight.id);
    const modelRenderGroup = hostInternals.modelRenderObjects.get(
      modelInstance.id
    );
    const initialAmbientIntensity = hostInternals.ambientLight.intensity;
    const initialAmbientColor = hostInternals.ambientLight.color.getHexString();
    const initialSunIntensity = hostInternals.sunLight.intensity;
    const initialSunColor = hostInternals.sunLight.color.getHexString();

    const hasSoundEmitterSpy = vi
      .spyOn(hostInternals.audioSystem, "hasSoundEmitter")
      .mockReturnValue(true);
    const playSoundSpy = vi
      .spyOn(hostInternals.audioSystem, "playSound")
      .mockImplementation(() => undefined);
    const stopSoundSpy = vi
      .spyOn(hostInternals.audioSystem, "stopSound")
      .mockImplementation(() => undefined);
    const setSoundEmitterVolumeSpy = vi
      .spyOn(hostInternals.audioSystem, "setSoundEmitterVolume")
      .mockImplementation(() => undefined);
    hostInternals.animationMixers.set(
      modelInstance.id,
      {
        stopAllAction: vi.fn()
      } as unknown as AnimationMixer
    );
    const playAnimationSpy = vi
      .spyOn(hostInternals, "applyPlayAnimationAction")
      .mockImplementation(() => undefined);
    const stopAnimationSpy = vi
      .spyOn(hostInternals, "applyStopAnimationAction")
      .mockImplementation(() => undefined);

    const hideModelEffect = createSetModelInstanceVisibleControlEffect({
      target: createModelInstanceControlTargetRef(modelInstance.id),
      visible: false
    });
    const playAnimationEffect = createPlayModelAnimationControlEffect({
      target: createModelInstanceControlTargetRef(modelInstance.id),
      clipName: "Idle",
      loop: false
    });
    const stopAnimationEffect = createStopModelAnimationControlEffect({
      target: createModelInstanceControlTargetRef(modelInstance.id)
    });
    const playSoundEffect = createPlaySoundControlEffect({
      target: createSoundEmitterControlTargetRef(soundEmitter.id)
    });
    const stopSoundEffect = createStopSoundControlEffect({
      target: createSoundEmitterControlTargetRef(soundEmitter.id)
    });
    const setSoundVolumeEffect = createSetSoundVolumeControlEffect({
      target: createSoundEmitterControlTargetRef(soundEmitter.id),
      volume: 0.2
    });
    const lightColorEffect = createSetLightColorControlEffect({
      target: createLightControlTargetRef("pointLight", pointLight.id),
      colorHex: "#00ffaa"
    });
    const ambientIntensityEffect = createSetAmbientLightIntensityControlEffect({
      target: createActiveSceneControlTargetRef(),
      intensity: 0.6
    });
    const ambientColorEffect = createSetAmbientLightColorControlEffect({
      target: createActiveSceneControlTargetRef(),
      colorHex: "#112233"
    });
    const sunIntensityEffect = createSetSunLightIntensityControlEffect({
      target: createActiveSceneControlTargetRef(),
      intensity: 0.75
    });
    const sunColorEffect = createSetSunLightColorControlEffect({
      target: createActiveSceneControlTargetRef(),
      colorHex: "#ffeeaa"
    });

    const links = {
      hideModel: createControlInteractionLink({
        id: "link-hide-model",
        sourceEntityId: triggerVolume.id,
        effect: hideModelEffect
      }),
      playAnimation: createControlInteractionLink({
        id: "link-play-animation",
        sourceEntityId: triggerVolume.id,
        effect: playAnimationEffect
      }),
      stopAnimation: createControlInteractionLink({
        id: "link-stop-animation",
        sourceEntityId: triggerVolume.id,
        effect: stopAnimationEffect
      }),
      playSound: createControlInteractionLink({
        id: "link-play-sound",
        sourceEntityId: triggerVolume.id,
        effect: playSoundEffect
      }),
      stopSound: createControlInteractionLink({
        id: "link-stop-sound",
        sourceEntityId: triggerVolume.id,
        effect: stopSoundEffect
      }),
      setSoundVolume: createControlInteractionLink({
        id: "link-set-sound-volume",
        sourceEntityId: triggerVolume.id,
        effect: setSoundVolumeEffect
      }),
      lightColor: createControlInteractionLink({
        id: "link-light-color",
        sourceEntityId: triggerVolume.id,
        effect: lightColorEffect
      }),
      ambientIntensity: createControlInteractionLink({
        id: "link-ambient-intensity",
        sourceEntityId: triggerVolume.id,
        effect: ambientIntensityEffect
      }),
      ambientColor: createControlInteractionLink({
        id: "link-ambient-color",
        sourceEntityId: triggerVolume.id,
        effect: ambientColorEffect
      }),
      sunIntensity: createControlInteractionLink({
        id: "link-sun-intensity",
        sourceEntityId: triggerVolume.id,
        effect: sunIntensityEffect
      }),
      sunColor: createControlInteractionLink({
        id: "link-sun-color",
        sourceEntityId: triggerVolume.id,
        effect: sunColorEffect
      })
    };

    dispatcher.dispatchControlEffect(hideModelEffect, links.hideModel);
    dispatcher.dispatchControlEffect(playAnimationEffect, links.playAnimation);
    dispatcher.dispatchControlEffect(stopAnimationEffect, links.stopAnimation);
    dispatcher.dispatchControlEffect(playSoundEffect, links.playSound);
    dispatcher.dispatchControlEffect(stopSoundEffect, links.stopSound);
    dispatcher.dispatchControlEffect(setSoundVolumeEffect, links.setSoundVolume);
    dispatcher.dispatchControlEffect(lightColorEffect, links.lightColor);
    dispatcher.dispatchControlEffect(
      ambientIntensityEffect,
      links.ambientIntensity
    );
    dispatcher.dispatchControlEffect(ambientColorEffect, links.ambientColor);
    dispatcher.dispatchControlEffect(sunIntensityEffect, links.sunIntensity);
    dispatcher.dispatchControlEffect(sunColorEffect, links.sunColor);

    expect(modelRenderGroup?.visible).toBe(false);
    expect(runtimeScene.modelInstances[0]).toEqual(
      expect.objectContaining({
        visible: false,
        animationClipName: undefined,
        animationAutoplay: false
      })
    );
    expect(playAnimationSpy).toHaveBeenCalledWith(
      modelInstance.id,
      "Idle",
      false
    );
    expect(stopAnimationSpy).toHaveBeenCalledWith(modelInstance.id);
    expect(hasSoundEmitterSpy).toHaveBeenCalledWith(soundEmitter.id);
    expect(playSoundSpy).toHaveBeenCalledWith(soundEmitter.id, links.playSound);
    expect(stopSoundSpy).toHaveBeenCalledWith(soundEmitter.id);
    expect(setSoundEmitterVolumeSpy).toHaveBeenCalledWith(soundEmitter.id, 0.2);
    expect(runtimeScene.entities.soundEmitters[0]).toEqual(
      expect.objectContaining({
        autoplay: false,
        volume: 0.2
      })
    );
    expect(lightRenderObjects?.light.color.getHexString()).toBe("00ffaa");
    expect(runtimeScene.localLights.pointLights[0]).toEqual(
      expect.objectContaining({
        colorHex: "#00ffaa"
      })
    );
    expect(hostInternals.ambientLight.intensity).not.toBeCloseTo(
      initialAmbientIntensity
    );
    expect(hostInternals.ambientLight.color.getHexString()).not.toBe(
      initialAmbientColor
    );
    expect(hostInternals.sunLight.intensity).not.toBeCloseTo(initialSunIntensity);
    expect(hostInternals.sunLight.color.getHexString()).not.toBe(initialSunColor);
    expect(runtimeScene.world.ambientLight).toEqual(
      expect.objectContaining({
        intensity: 0.6,
        colorHex: "#112233"
      })
    );
    expect(runtimeScene.world.sunLight).toEqual(
      expect.objectContaining({
        intensity: 0.75,
        colorHex: "#ffeeaa"
      })
    );
    expect(runtimeScene.control.resolved.discrete).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "modelVisibility",
          value: false
        }),
        expect.objectContaining({
          type: "modelAnimationPlayback",
          clipName: null
        }),
        expect.objectContaining({
          type: "soundPlayback",
          value: false
        }),
        expect.objectContaining({
          type: "lightColor",
          value: "#00ffaa"
        }),
        expect.objectContaining({
          type: "ambientLightColor",
          value: "#112233"
        }),
        expect.objectContaining({
          type: "sunLightColor",
          value: "#ffeeaa"
        })
      ])
    );
    expect(runtimeScene.control.resolved.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "soundVolume",
          value: 0.2
        }),
        expect.objectContaining({
          type: "ambientLightIntensity",
          value: 0.6
        }),
        expect.objectContaining({
          type: "sunLightIntensity",
          value: 0.75
        })
      ])
    );

    host.dispose();
  });

  it("re-resolves NPC activity from the project scheduler when the runtime clock advances", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const npc = createNpcEntity({
      id: "entity-npc-night-guard",
      actorId: "actor-night-guard"
    });
    const document = createEmptySceneDocument();
    document.entities[npc.id] = npc;
    document.scheduler.routines["routine-night-guard"] =
      createProjectScheduleRoutine({
        id: "routine-night-guard",
        title: "Night Shift",
        target: createActorControlTargetRef(npc.actorId),
        startHour: 20,
        endHour: 4,
        effect: createSetActorPresenceControlEffect({
          target: createActorControlTargetRef(npc.actorId),
          active: true
        })
      });

    const runtimeScene = buildRuntimeSceneFromDocument(document);
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      currentClockState: {
        timeOfDayHours: number;
        dayCount: number;
        dayLengthMinutes: number;
      } | null;
      sceneReady: boolean;
      runtimeScene: typeof runtimeScene | null;
      syncRuntimeScheduleToCurrentClock(): void;
    };

    expect(runtimeScene.entities.npcs).toEqual([
      expect.objectContaining({
        entityId: npc.id,
        activeRoutineTitle: null
      })
    ]);

    hostInternals.sceneReady = true;
    hostInternals.currentClockState = {
      timeOfDayHours: 21,
      dayCount: 0,
      dayLengthMinutes: 24
    };
    hostInternals.syncRuntimeScheduleToCurrentClock();

    expect(hostInternals.runtimeScene?.entities.npcs).toEqual([
      expect.objectContaining({
        entityId: npc.id,
        actorId: npc.actorId,
        activeRoutineTitle: "Night Shift"
      })
    ]);

    hostInternals.currentClockState = {
      timeOfDayHours: 6,
      dayCount: 1,
      dayLengthMinutes: 24
    };
    hostInternals.syncRuntimeScheduleToCurrentClock();

    expect(hostInternals.runtimeScene?.entities.npcs).toEqual([
      expect.objectContaining({
        entityId: npc.id,
        activeRoutineTitle: null
      })
    ]);
    expect(hostInternals.runtimeScene?.npcDefinitions[0]).toEqual(
      expect.objectContaining({
        entityId: npc.id,
        active: true,
        activeRoutineTitle: null
      })
    );

    host.dispose();
  });

  it("re-resolves NPC animation and follow-path pose from the project scheduler", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const actorTarget = createActorControlTargetRef("actor-patroller");
    const { asset, loadedAsset } = createFixtureLoadedModelAssetFromGeometry(
      "asset-npc-patroller",
      new BoxGeometry(0.8, 1.8, 0.6)
    );
    asset.metadata.animationNames = ["Walk"];
    loadedAsset.animations = [new AnimationClip("Walk", 1, [])];
    const npc = createNpcEntity({
      id: "entity-npc-patroller",
      actorId: actorTarget.actorId,
      modelAssetId: asset.id,
      yawDegrees: 15
    });
    const path = createScenePath({
      id: "path-patrol",
      points: [
        {
          id: "path-point-start",
          position: {
            x: 0,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-point-end",
          position: {
            x: 8,
            y: 0,
            z: 0
          }
        }
      ]
    });
    const document = createEmptySceneDocument();
    document.assets[asset.id] = asset;
    document.entities[npc.id] = npc;
    document.paths[path.id] = path;
    document.scheduler.routines["routine-patrol"] = createProjectScheduleRoutine({
      id: "routine-patrol",
      title: "Patrolling",
      target: actorTarget,
      startHour: 9,
      endHour: 13,
      effects: [
        createSetActorPresenceControlEffect({
          target: actorTarget,
          active: true
        }),
        createPlayActorAnimationControlEffect({
          target: actorTarget,
          clipName: "Walk",
          loop: true
        }),
        createFollowActorPathControlEffect({
          target: actorTarget,
          pathId: path.id,
          speed: 2,
          loop: false,
          progressMode: "deriveFromTime"
        })
      ]
    });

    const runtimeScene = buildRuntimeSceneFromDocument(document, {
      runtimeClock: {
        timeOfDayHours: 6,
        dayCount: 0,
        dayLengthMinutes: 24
      },
      loadedModelAssets: {
        [asset.id]: loadedAsset
      }
    });
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.updateAssets(
      document.assets,
      {
        [asset.id]: loadedAsset
      },
      {},
      {}
    );
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      currentClockState: {
        timeOfDayHours: number;
        dayCount: number;
        dayLengthMinutes: number;
      } | null;
      sceneReady: boolean;
      runtimeScene: typeof runtimeScene | null;
      modelRenderObjects: Map<
        string,
        {
          visible: boolean;
          position: { x: number; y: number; z: number };
          rotation: { y: number };
        }
      >;
      applyPlayAnimationAction(
        instanceId: string,
        clipName: string,
        loop: boolean | undefined
      ): void;
      syncRuntimeScheduleToCurrentClock(): void;
    };
    const playAnimationSpy = vi
      .spyOn(hostInternals, "applyPlayAnimationAction")
      .mockImplementation(() => undefined);

    hostInternals.sceneReady = true;
    hostInternals.currentClockState = {
      timeOfDayHours: 11,
      dayCount: 0,
      dayLengthMinutes: 24
    };
    hostInternals.syncRuntimeScheduleToCurrentClock();

    expect(playAnimationSpy).toHaveBeenCalledWith(npc.id, "Walk", true);
    expect(hostInternals.runtimeScene?.entities.npcs).toEqual([
      expect.objectContaining({
        entityId: npc.id,
        activeRoutineTitle: "Patrolling",
        animationClipName: "Walk",
        position: {
          x: 4,
          y: 0,
          z: 0
        }
      })
    ]);
    expect(hostInternals.runtimeScene?.npcDefinitions[0]).toEqual(
      expect.objectContaining({
        entityId: npc.id,
        animationClipName: "Walk",
        yawDegrees: 90,
        resolvedPath: expect.objectContaining({
          pathId: path.id,
          progress: 0.5
        })
      })
    );
    expect(hostInternals.modelRenderObjects.get(npc.id)).toEqual(
      expect.objectContaining({
        visible: true,
        position: expect.objectContaining({
          x: 4,
          y: 0,
          z: 0
        }),
        rotation: expect.objectContaining({
          y: Math.PI / 2
        })
      })
    );

    hostInternals.currentClockState = {
      timeOfDayHours: 14,
      dayCount: 0,
      dayLengthMinutes: 24
    };
    hostInternals.syncRuntimeScheduleToCurrentClock();

    expect(hostInternals.runtimeScene?.entities.npcs).toEqual([
      expect.objectContaining({
        entityId: npc.id,
        activeRoutineTitle: null,
        animationClipName: null,
        position: {
          x: 8,
          y: 0,
          z: 0
        },
        resolvedPath: expect.objectContaining({
          pathId: path.id,
          progress: 1
        })
      })
    ]);
    expect(hostInternals.runtimeScene?.npcDefinitions[0]).toEqual(
      expect.objectContaining({
        entityId: npc.id,
        active: true,
        activeRoutineTitle: null,
        animationClipName: null,
        yawDegrees: 90,
        position: {
          x: 8,
          y: 0,
          z: 0
        },
        resolvedPath: expect.objectContaining({
          pathId: path.id,
          progress: 1,
          yawDegrees: 90
        })
      })
    );

    host.dispose();
  });

  it("applies scheduler-controlled light effects and restores authored defaults when the routine ends", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const pointLight = createPointLightEntity({
      id: "entity-point-light-night-lamp",
      intensity: 1.25
    });
    const document = createEmptySceneDocument();
    document.entities[pointLight.id] = pointLight;
    document.scheduler.routines["routine-night-lamp"] =
      createProjectScheduleRoutine({
        id: "routine-night-lamp",
        title: "Night Lamp",
        target: createLightControlTargetRef("pointLight", pointLight.id),
        startHour: 20,
        endHour: 4,
        effect: createSetLightIntensityControlEffect({
          target: createLightControlTargetRef("pointLight", pointLight.id),
          intensity: 3.5
        })
      });

    const runtimeScene = buildRuntimeSceneFromDocument(document);
    const host = new RuntimeHost({
      enableRendering: false
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      currentClockState: {
        timeOfDayHours: number;
        dayCount: number;
        dayLengthMinutes: number;
      } | null;
      sceneReady: boolean;
      runtimeScene: typeof runtimeScene | null;
      localLightObjects: Map<
        string,
        {
          light: { intensity: number };
        }
      >;
      syncRuntimeScheduleToCurrentClock(): void;
    };

    hostInternals.sceneReady = true;
    hostInternals.currentClockState = {
      timeOfDayHours: 21,
      dayCount: 0,
      dayLengthMinutes: 24
    };
    hostInternals.syncRuntimeScheduleToCurrentClock();

    expect(
      hostInternals.localLightObjects.get(pointLight.id)?.light.intensity
    ).toBe(3.5);
    expect(hostInternals.runtimeScene?.control.resolved.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "lightIntensity",
          value: 3.5,
          source: {
            kind: "scheduler",
            scheduleId: "routine-night-lamp"
          }
        })
      ])
    );

    hostInternals.currentClockState = {
      timeOfDayHours: 6,
      dayCount: 1,
      dayLengthMinutes: 24
    };
    hostInternals.syncRuntimeScheduleToCurrentClock();

    expect(
      hostInternals.localLightObjects.get(pointLight.id)?.light.intensity
    ).toBe(1.25);
    expect(hostInternals.runtimeScene?.control.resolved.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "lightIntensity",
          value: 1.25,
          source: {
            kind: "default"
          }
        })
      ])
    );

    host.dispose();
  });

  it("fires scheduler impulse sequences only once until the runtime session is reset", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(RapierCollisionWorld, "create").mockResolvedValue({
      dispose: vi.fn(),
      resolveThirdPersonCameraCollision: vi.fn(
        (_pivot, desiredCameraPosition) => desiredCameraPosition
      )
    } as unknown as RapierCollisionWorld);

    const document = createEmptySceneDocument();
    document.sequences.sequences["sequence-scene-transition"] =
      createProjectSequence({
        id: "sequence-scene-transition",
        title: "Scene Transition",
        effects: [
          {
            stepClass: "impulse",
            type: "startSceneTransition",
            targetSceneId: "scene-house",
            targetEntryEntityId: "entry-house"
          }
        ]
      });
    document.scheduler.routines["routine-scene-transition"] =
      createProjectScheduleRoutine({
        id: "routine-scene-transition",
        title: "Scene Transition Window",
        target: createProjectGlobalControlTargetRef(),
        sequenceId: "sequence-scene-transition",
        startHour: 8,
        endHour: 12,
        priority: 0,
        effects: []
      });

    const runtimeScene = buildRuntimeSceneFromDocument(document);
    const host = new RuntimeHost({
      enableRendering: false
    });
    const transitions: Array<{
      sourceEntityId: string | null;
      targetSceneId: string;
      targetEntryEntityId: string;
    }> = [];
    host.setSceneTransitionHandler((request) => {
      transitions.push(request);
    });
    host.loadScene(runtimeScene);

    const hostInternals = host as unknown as {
      currentClockState: {
        timeOfDayHours: number;
        dayCount: number;
        dayLengthMinutes: number;
      } | null;
      sceneReady: boolean;
      syncRuntimeScheduleToCurrentClock(): void;
    };

    hostInternals.sceneReady = true;
    hostInternals.currentClockState = {
      timeOfDayHours: 9,
      dayCount: 0,
      dayLengthMinutes: 24
    };
    hostInternals.syncRuntimeScheduleToCurrentClock();

    hostInternals.currentClockState = {
      timeOfDayHours: 10,
      dayCount: 0,
      dayLengthMinutes: 24
    };
    hostInternals.syncRuntimeScheduleToCurrentClock();

    host.loadScene(runtimeScene);
    hostInternals.currentClockState = {
      timeOfDayHours: 10.5,
      dayCount: 0,
      dayLengthMinutes: 24
    };
    hostInternals.syncRuntimeScheduleToCurrentClock();

    hostInternals.currentClockState = {
      timeOfDayHours: 9,
      dayCount: 1,
      dayLengthMinutes: 24
    };
    hostInternals.syncRuntimeScheduleToCurrentClock();

    expect(transitions).toEqual([
      {
        sourceEntityId: null,
        targetSceneId: "scene-house",
        targetEntryEntityId: "entry-house"
      }
    ]);

    host.dispose();
  });

  it("activates the proposed runtime target and cycles visible target candidates", () => {
    const host = new RuntimeHost({
      enableRendering: false
    });
    const hostInternals = host as unknown as {
      runtimeScene: unknown;
      sceneReady: boolean;
      activeController: unknown;
      thirdPersonController: unknown;
      runtimeTargetCandidates: Array<{
        kind: "npc" | "interactable";
        entityId: string;
      }>;
      proposedRuntimeTarget: {
        kind: "npc" | "interactable";
        entityId: string;
      } | null;
      activeRuntimeTargetReference: {
        kind: "npc" | "interactable";
        entityId: string;
      } | null;
      activateOrCycleRuntimeTarget(): void;
      clearActiveRuntimeTarget(): void;
    };
    const firstTarget = {
      kind: "npc" as const,
      entityId: "npc-one",
      prompt: "Talk",
      position: { x: 0, y: 0, z: 2 },
      center: { x: 0, y: 1, z: 2 },
      distance: 0,
      range: 2,
      viewDot: 1,
      score: 3
    };
    const secondTarget = {
      ...firstTarget,
      kind: "interactable" as const,
      entityId: "switch-two",
      prompt: "Use",
      score: 2.5
    };

    hostInternals.runtimeScene = {} as never;
    hostInternals.sceneReady = true;
    hostInternals.activeController = hostInternals.thirdPersonController;
    hostInternals.runtimeTargetCandidates = [firstTarget, secondTarget];
    hostInternals.proposedRuntimeTarget = firstTarget;

    hostInternals.activateOrCycleRuntimeTarget();

    expect(hostInternals.activeRuntimeTargetReference).toEqual({
      kind: "npc",
      entityId: "npc-one"
    });

    hostInternals.activateOrCycleRuntimeTarget();

    expect(hostInternals.activeRuntimeTargetReference).toEqual({
      kind: "interactable",
      entityId: "switch-two"
    });

    hostInternals.clearActiveRuntimeTarget();

    expect(hostInternals.activeRuntimeTargetReference).toBeNull();
    host.dispose();
  });

  it("places targeting visuals above the target focus at readable scale", () => {
    const placement = resolveRuntimeTargetVisualPlacement({
      center: { x: 1, y: 1.1, z: -2 },
      range: 1.5
    });

    expect(placement.luxPosition).toMatchObject({
      x: 1,
      z: -2
    });
    expect(placement.luxPosition.y).toBeGreaterThan(1.8);
    expect(placement.activeMarkerPosition.y).toBeGreaterThan(
      placement.luxPosition.y
    );
    expect(placement.activeMarkerScale).toBeGreaterThan(1);
  });

  it("uses Lux-only proposal feedback and consumes Escape when clearing an active target", () => {
    const host = new RuntimeHost({
      enableRendering: false
    });
    const hostInternals = host as unknown as {
      runtimeScene: unknown;
      sceneReady: boolean;
      activeController: unknown;
      thirdPersonController: unknown;
      proposedRuntimeTarget: {
        kind: "npc" | "interactable";
        entityId: string;
        center: { x: number; y: number; z: number };
      } | null;
      activeRuntimeTargetReference: {
        kind: "npc" | "interactable";
        entityId: string;
      } | null;
      resolveThirdPersonTargetAssist(): unknown;
      handleRuntimeKeyDown(event: KeyboardEvent): void;
    };
    const escapeEvent = {
      code: "Escape",
      defaultPrevented: false,
      repeat: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      target: null,
      preventDefault: vi.fn(),
      stopImmediatePropagation: vi.fn()
    } as unknown as KeyboardEvent;

    hostInternals.runtimeScene = {
      playerInputBindings: {
        keyboard: {
          pauseTime: "KeyP"
        }
      },
      entities: {
        cameraRigs: [],
        interactables: [],
        npcs: []
      },
      interactionLinks: []
    } as never;
    hostInternals.sceneReady = true;
    hostInternals.activeController = hostInternals.thirdPersonController;
    hostInternals.proposedRuntimeTarget = {
      kind: "npc",
      entityId: "npc-proposed",
      center: { x: 0, y: 1, z: 3 }
    };

    expect(hostInternals.resolveThirdPersonTargetAssist()).toBeNull();

    hostInternals.activeRuntimeTargetReference = {
      kind: "npc",
      entityId: "npc-active"
    };
    hostInternals.handleRuntimeKeyDown(escapeEvent);

    expect(hostInternals.activeRuntimeTargetReference).toBeNull();
    expect(escapeEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(escapeEvent.stopImmediatePropagation).toHaveBeenCalledTimes(1);
    host.dispose();
  });

  it("switches an active target toward the user's horizontal camera look intent", () => {
    const host = new RuntimeHost({
      enableRendering: false
    });
    const hostInternals = host as unknown as {
      runtimeScene: unknown;
      activeController: unknown;
      thirdPersonController: unknown;
      currentPlayerControllerTelemetry: unknown;
      runtimeTargetCandidates: Array<{
        kind: "npc";
        entityId: string;
        center: { x: number; y: number; z: number };
        score: number;
      }>;
      activeRuntimeTargetReference: {
        kind: "npc";
        entityId: string;
      } | null;
      camera: PerspectiveCamera;
      updateActiveRuntimeTargetLockState(): void;
    };

    hostInternals.runtimeScene = {
      entities: {
        npcs: [
          {
            entityId: "npc-active",
            visible: true,
            position: { x: 0, y: 0, z: 5 },
            collider: { mode: "capsule", radius: 0.35, height: 1.8, eyeHeight: 1.6 },
            name: "Active",
            defaultDialogueId: null,
            dialogues: []
          },
          {
            entityId: "npc-right",
            visible: true,
            position: { x: 2, y: 0, z: 5 },
            collider: { mode: "capsule", radius: 0.35, height: 1.8, eyeHeight: 1.6 },
            name: "Right",
            defaultDialogueId: null,
            dialogues: []
          }
        ],
        interactables: [],
        cameraRigs: []
      },
      interactionLinks: [
        { id: "link-active", sourceEntityId: "npc-active", trigger: "click", action: { type: "runSequence", sequenceId: "noop" } },
        { id: "link-right", sourceEntityId: "npc-right", trigger: "click", action: { type: "runSequence", sequenceId: "noop" } }
      ]
    } as never;
    hostInternals.activeController = hostInternals.thirdPersonController;
    hostInternals.currentPlayerControllerTelemetry = {
      eyePosition: { x: 0, y: 1.6, z: 0 }
    };
    hostInternals.runtimeTargetCandidates = [
      {
        kind: "npc",
        entityId: "npc-active",
        center: { x: 0, y: 0.9, z: 5 },
        score: 3
      },
      {
        kind: "npc",
        entityId: "npc-right",
        center: { x: 2, y: 0.9, z: 5 },
        score: 2.5
      }
    ];
    hostInternals.activeRuntimeTargetReference = {
      kind: "npc",
      entityId: "npc-active"
    };

    hostInternals.camera.position.set(0, 1.6, 0);
    hostInternals.camera.lookAt(2, 1.6, 5);
    hostInternals.updateActiveRuntimeTargetLockState();

    expect(hostInternals.activeRuntimeTargetReference).toEqual({
      kind: "npc",
      entityId: "npc-right"
    });
    host.dispose();
  });

  it("clears an active target after a large horizontal camera turn when another target is available", () => {
    const host = new RuntimeHost({
      enableRendering: false
    });
    const hostInternals = host as unknown as {
      runtimeScene: unknown;
      activeController: unknown;
      thirdPersonController: unknown;
      currentPlayerControllerTelemetry: unknown;
      runtimeTargetCandidates: Array<{
        kind: "npc";
        entityId: string;
        center: { x: number; y: number; z: number };
        score: number;
      }>;
      activeRuntimeTargetReference: {
        kind: "npc";
        entityId: string;
      } | null;
      camera: PerspectiveCamera;
      updateActiveRuntimeTargetLockState(): void;
    };

    hostInternals.runtimeScene = {
      entities: {
        npcs: [
          {
            entityId: "npc-active",
            visible: true,
            position: { x: 0, y: 0, z: 5 },
            collider: { mode: "capsule", radius: 0.35, height: 1.8, eyeHeight: 1.6 },
            name: "Active",
            defaultDialogueId: null,
            dialogues: []
          }
        ],
        interactables: [],
        cameraRigs: []
      },
      interactionLinks: [
        { id: "link-active", sourceEntityId: "npc-active", trigger: "click", action: { type: "runSequence", sequenceId: "noop" } }
      ]
    } as never;
    hostInternals.activeController = hostInternals.thirdPersonController;
    hostInternals.currentPlayerControllerTelemetry = {
      eyePosition: { x: 0, y: 1.6, z: 0 }
    };
    hostInternals.runtimeTargetCandidates = [
      {
        kind: "npc",
        entityId: "npc-active",
        center: { x: 0, y: 0.9, z: 5 },
        score: 3
      },
      {
        kind: "npc",
        entityId: "npc-other",
        center: { x: -2, y: 0.9, z: 5 },
        score: 2.5
      }
    ];
    hostInternals.activeRuntimeTargetReference = {
      kind: "npc",
      entityId: "npc-active"
    };

    hostInternals.camera.position.set(0, 1.6, 0);
    hostInternals.camera.lookAt(10, 1.6, 3);
    hostInternals.updateActiveRuntimeTargetLockState();

    expect(hostInternals.activeRuntimeTargetReference).toBeNull();
    host.dispose();
  });

  it("clears an active target when the player moves too far away", () => {
    const host = new RuntimeHost({
      enableRendering: false
    });
    const hostInternals = host as unknown as {
      runtimeScene: unknown;
      activeController: unknown;
      thirdPersonController: unknown;
      currentPlayerControllerTelemetry: unknown;
      activeRuntimeTargetReference: {
        kind: "npc";
        entityId: string;
      } | null;
      updateActiveRuntimeTargetLockState(): void;
    };

    hostInternals.runtimeScene = {
      entities: {
        npcs: [
          {
            entityId: "npc-far",
            visible: true,
            position: { x: 0, y: 0, z: 40 },
            collider: { mode: "capsule", radius: 0.35, height: 1.8, eyeHeight: 1.6 },
            name: "Far",
            defaultDialogueId: null,
            dialogues: []
          }
        ],
        interactables: [],
        cameraRigs: []
      },
      interactionLinks: [
        { id: "link-far", sourceEntityId: "npc-far", trigger: "click", action: { type: "runSequence", sequenceId: "noop" } }
      ]
    } as never;
    hostInternals.activeController = hostInternals.thirdPersonController;
    hostInternals.currentPlayerControllerTelemetry = {
      eyePosition: { x: 0, y: 1.6, z: 0 }
    };
    hostInternals.activeRuntimeTargetReference = {
      kind: "npc",
      entityId: "npc-far"
    };

    hostInternals.updateActiveRuntimeTargetLockState();

    expect(hostInternals.activeRuntimeTargetReference).toBeNull();
    host.dispose();
  });

  it("clears runtime targeting when switching into first-person mode", () => {
    const host = new RuntimeHost({
      enableRendering: false
    });
    const hostInternals = host as unknown as {
      activeRuntimeTargetReference: {
        kind: "npc" | "interactable";
        entityId: string;
      } | null;
      proposedRuntimeTarget: unknown;
      runtimeTargetCandidates: unknown[];
    };

    hostInternals.activeRuntimeTargetReference = {
      kind: "npc",
      entityId: "npc-one"
    };
    hostInternals.proposedRuntimeTarget = {
      kind: "npc",
      entityId: "npc-one"
    };
    hostInternals.runtimeTargetCandidates = [{}];

    host.setNavigationMode("firstPerson");

    expect(hostInternals.activeRuntimeTargetReference).toBeNull();
    expect(hostInternals.proposedRuntimeTarget).toBeNull();
    expect(hostInternals.runtimeTargetCandidates).toEqual([]);
    host.dispose();
  });

  it("invalidates an active runtime target when it is no longer targetable", () => {
    const host = new RuntimeHost({
      enableRendering: false
    });
    const hostInternals = host as unknown as {
      runtimeScene: unknown;
      sceneReady: boolean;
      activeController: unknown;
      thirdPersonController: unknown;
      currentPlayerControllerTelemetry: unknown;
      activeRuntimeTargetReference: {
        kind: "npc" | "interactable";
        entityId: string;
      } | null;
      camera: PerspectiveCamera;
      refreshRuntimeTargetingState(): void;
    };

    hostInternals.runtimeScene = {
      entities: {
        interactables: [
          {
            entityId: "switch-one",
            position: { x: 0, y: 1, z: 2 },
            radius: 3,
            prompt: "Use",
            interactionEnabled: false
          }
        ],
        npcs: [],
        playerStarts: [],
        sceneEntries: [],
        cameraRigs: [],
        soundEmitters: [],
        triggerVolumes: [],
        teleportTargets: []
      },
      interactionLinks: [
        {
          id: "link-switch-one",
          sourceEntityId: "switch-one",
          trigger: "click",
          action: {
            type: "runSequence",
            sequenceId: "noop"
          }
        }
      ]
    } as never;
    hostInternals.sceneReady = true;
    hostInternals.activeController = hostInternals.thirdPersonController;
    hostInternals.currentPlayerControllerTelemetry = {
      eyePosition: { x: 0, y: 1.6, z: 0 }
    };
    hostInternals.activeRuntimeTargetReference = {
      kind: "interactable",
      entityId: "switch-one"
    };
    hostInternals.camera.position.set(0, 1.6, -2);
    hostInternals.camera.lookAt(0, 1, 2);

    hostInternals.refreshRuntimeTargetingState();

    expect(hostInternals.activeRuntimeTargetReference).toBeNull();
    host.dispose();
  });

  it("does not provide gameplay target camera assist while a camera rig is active", () => {
    const host = new RuntimeHost({
      enableRendering: false
    });
    const hostInternals = host as unknown as {
      runtimeScene: unknown;
      activeController: unknown;
      thirdPersonController: unknown;
      activeRuntimeTargetReference: {
        kind: "npc" | "interactable";
        entityId: string;
      } | null;
      resolveThirdPersonTargetAssist(): unknown;
    };

    hostInternals.runtimeScene = {
      entities: {
        cameraRigs: [
          {
            entityId: "camera-rig-default",
            defaultActive: true,
            priority: 1
          }
        ],
        interactables: [],
        npcs: [],
        playerStarts: [],
        sceneEntries: [],
        soundEmitters: [],
        triggerVolumes: [],
        teleportTargets: []
      },
      interactionLinks: []
    } as never;
    hostInternals.activeController = hostInternals.thirdPersonController;
    hostInternals.activeRuntimeTargetReference = {
      kind: "interactable",
      entityId: "switch-one"
    };

    expect(hostInternals.resolveThirdPersonTargetAssist()).toBeNull();
    host.dispose();
  });
});
