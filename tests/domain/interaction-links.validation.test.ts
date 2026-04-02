import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { validateSceneDocument } from "../../src/document/scene-document-validation";
import { createModelInstance } from "../../src/assets/model-instances";
import { createProjectAssetStorageKey, type ModelAssetRecord } from "../../src/assets/project-assets";
import { createInteractableEntity, createPlayerStartEntity, createTeleportTargetEntity, createTriggerVolumeEntity } from "../../src/entities/entity-instances";
import {
  createPlayAnimationInteractionLink,
  createTeleportPlayerInteractionLink,
  createToggleVisibilityInteractionLink
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
        [teleportTarget.id]: teleportTarget
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
        })
      }
    };

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual([]);
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
