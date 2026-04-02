import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { validateSceneDocument } from "../../src/document/scene-document-validation";
import { createModelInstance } from "../../src/assets/model-instances";
import { createProjectAssetStorageKey, type AudioAssetRecord, type ModelAssetRecord } from "../../src/assets/project-assets";
import {
  createInteractableEntity,
  createPlayerStartEntity,
  createSoundEmitterEntity,
  createTeleportTargetEntity,
  createTriggerVolumeEntity
} from "../../src/entities/entity-instances";
import {
  createPlayAnimationInteractionLink,
  createPlaySoundInteractionLink,
  createTeleportPlayerInteractionLink,
  createToggleVisibilityInteractionLink,
  createStopSoundInteractionLink
} from "../../src/interactions/interaction-links";

describe("interaction link validation", () => {
  it("accepts valid Trigger Volume and Interactable links", () => {
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const interactable = createInteractableEntity({
      id: "entity-interactable-main",
      prompt: "Use Console"
    });
    const teleportTarget = createTeleportTargetEntity({
      id: "entity-teleport-main"
    });
    const audioAsset = {
      id: "asset-audio-main",
      kind: "audio" as const,
      sourceName: "lobby-loop.ogg",
      mimeType: "audio/ogg",
      storageKey: createProjectAssetStorageKey("asset-audio-main"),
      byteLength: 4096,
      metadata: {
        kind: "audio" as const,
        durationSeconds: 4,
        channelCount: 2,
        sampleRateHz: 48000,
        warnings: []
      }
    } satisfies AudioAssetRecord;
    const soundEmitter = createSoundEmitterEntity({
      id: "entity-sound-main",
      audioAssetId: audioAsset.id
    });
    const brush = createBoxBrush({
      id: "brush-door"
    });
    const document = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      },
      entities: {
        [triggerVolume.id]: triggerVolume,
        [interactable.id]: interactable,
        [teleportTarget.id]: teleportTarget,
        [soundEmitter.id]: soundEmitter
      },
      assets: {
        [audioAsset.id]: audioAsset
      },
      interactionLinks: {
        "link-teleport": createTeleportPlayerInteractionLink({
          id: "link-teleport",
          sourceEntityId: triggerVolume.id,
          trigger: "enter",
          targetEntityId: teleportTarget.id
        }),
        "link-visibility": createToggleVisibilityInteractionLink({
          id: "link-visibility",
          sourceEntityId: triggerVolume.id,
          trigger: "exit",
          targetBrushId: brush.id,
          visible: false
        }),
        "link-click-teleport": createTeleportPlayerInteractionLink({
          id: "link-click-teleport",
          sourceEntityId: interactable.id,
          trigger: "click",
          targetEntityId: teleportTarget.id
        }),
        "link-play-sound": createPlaySoundInteractionLink({
          id: "link-play-sound",
          sourceEntityId: interactable.id,
          trigger: "click",
          targetSoundEmitterId: soundEmitter.id
        }),
        "link-stop-sound": createStopSoundInteractionLink({
          id: "link-stop-sound",
          sourceEntityId: triggerVolume.id,
          trigger: "exit",
          targetSoundEmitterId: soundEmitter.id
        })
      }
    };

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual([]);
  });

  it("detects sound playback links that target a sound emitter without an audio asset", () => {
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const soundEmitter = createSoundEmitterEntity({
      id: "entity-sound-main"
    });

    const validation = validateSceneDocument({
      ...createEmptySceneDocument(),
      entities: {
        [triggerVolume.id]: triggerVolume,
        [soundEmitter.id]: soundEmitter
      },
      interactionLinks: {
        "link-play-sound": createPlaySoundInteractionLink({
          id: "link-play-sound",
          sourceEntityId: triggerVolume.id,
          trigger: "enter",
          targetSoundEmitterId: soundEmitter.id
        })
      }
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-sound-emitter-audio-asset",
          path: "interactionLinks.link-play-sound.action.targetSoundEmitterId"
        })
      ])
    );
  });

  it("detects invalid interaction link source and target references", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-main"
    });
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const interactable = createInteractableEntity({
      id: "entity-interactable-main"
    });
    const document = {
      ...createEmptySceneDocument(),
      entities: {
        [playerStart.id]: playerStart,
        [triggerVolume.id]: triggerVolume,
        [interactable.id]: interactable
      },
      interactionLinks: {
        "link-invalid-source": createTeleportPlayerInteractionLink({
          id: "link-invalid-source",
          sourceEntityId: playerStart.id,
          trigger: "enter",
          targetEntityId: "entity-missing-teleport-target"
        }),
        "link-invalid-visibility": createToggleVisibilityInteractionLink({
          id: "link-invalid-visibility",
          sourceEntityId: triggerVolume.id,
          trigger: "exit",
          targetBrushId: "brush-missing"
        }),
        "link-invalid-click-trigger": createTeleportPlayerInteractionLink({
          id: "link-invalid-click-trigger",
          sourceEntityId: interactable.id,
          trigger: "enter",
          targetEntityId: "entity-missing-teleport-target"
        })
      }
    };

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-interaction-source-kind",
          path: "interactionLinks.link-invalid-source.sourceEntityId"
        }),
        expect.objectContaining({
          code: "missing-teleport-target-entity",
          path: "interactionLinks.link-invalid-source.action.targetEntityId"
        }),
        expect.objectContaining({
          code: "missing-visibility-target-brush",
          path: "interactionLinks.link-invalid-visibility.action.targetBrushId"
        }),
        expect.objectContaining({
          code: "unsupported-interaction-trigger",
          path: "interactionLinks.link-invalid-click-trigger.trigger"
        }),
        expect.objectContaining({
          code: "missing-teleport-target-entity",
          path: "interactionLinks.link-invalid-click-trigger.action.targetEntityId"
        })
      ])
    );
  });

  it("detects playAnimation links that reference a missing clip on the target model asset", () => {
    const modelAsset = {
      id: "asset-model-animated",
      kind: "model",
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
        animationNames: ["Idle", "Run"],
        boundingBox: null,
        warnings: []
      }
    } satisfies ModelAssetRecord;
    const modelInstance = createModelInstance({
      id: "model-instance-animated",
      assetId: modelAsset.id
    });
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });

    const document = {
      ...createEmptySceneDocument(),
      assets: {
        [modelAsset.id]: modelAsset
      },
      modelInstances: {
        [modelInstance.id]: modelInstance
      },
      entities: {
        [triggerVolume.id]: triggerVolume
      },
      interactionLinks: {
        "link-play-missing-clip": createPlayAnimationInteractionLink({
          id: "link-play-missing-clip",
          sourceEntityId: triggerVolume.id,
          trigger: "enter",
          targetModelInstanceId: modelInstance.id,
          clipName: "Walk"
        })
      }
    };

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-play-animation-clip",
          path: "interactionLinks.link-play-missing-clip.action.clipName"
        })
      ])
    );
  });
});
