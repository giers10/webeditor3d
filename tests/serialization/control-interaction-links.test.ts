import { describe, expect, it } from "vitest";

import {
  createActiveSceneControlTargetRef,
  createLightControlTargetRef,
  createModelInstanceControlTargetRef,
  createSetAmbientLightColorControlEffect,
  createSetLightEnabledControlEffect,
  createSetModelInstanceVisibleControlEffect,
  createSetSoundVolumeControlEffect,
  createSoundEmitterControlTargetRef
} from "../../src/controls/control-surface";
import {
  createEmptySceneDocument,
  NPC_PRESENCE_SCENE_DOCUMENT_VERSION,
  PROJECT_SCHEDULER_FOUNDATION_SCENE_DOCUMENT_VERSION,
  SCENE_DOCUMENT_VERSION
} from "../../src/document/scene-document";
import { migrateSceneDocument } from "../../src/document/migrate-scene-document";
import {
  createPointLightEntity,
  createSoundEmitterEntity,
  createTriggerVolumeEntity
} from "../../src/entities/entity-instances";
import {
  createControlInteractionLink,
  createPlaySoundInteractionLink
} from "../../src/interactions/interaction-links";
import {
  createProjectAssetStorageKey,
  type AudioAssetRecord,
  type ModelAssetRecord
} from "../../src/assets/project-assets";
import { createModelInstance } from "../../src/assets/model-instances";
import {
  parseSceneDocumentJson,
  serializeSceneDocument
} from "../../src/serialization/scene-document-json";

describe("control interaction link serialization", () => {
  it("round-trips authored control interaction links", () => {
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const pointLight = createPointLightEntity({
      id: "entity-point-light-main"
    });
    const document = {
      ...createEmptySceneDocument(),
      entities: {
        [triggerVolume.id]: triggerVolume,
        [pointLight.id]: pointLight
      },
      interactionLinks: {
        "link-light-off": createControlInteractionLink({
          id: "link-light-off",
          sourceEntityId: triggerVolume.id,
          trigger: "enter",
          effect: createSetLightEnabledControlEffect({
            target: createLightControlTargetRef("pointLight", pointLight.id),
            enabled: false
          })
        })
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(
      document
    );
  });

  it("round-trips expanded control effect families", () => {
    const audioAsset = {
      id: "asset-audio-main",
      kind: "audio" as const,
      sourceName: "loop.ogg",
      mimeType: "audio/ogg",
      storageKey: createProjectAssetStorageKey("asset-audio-main"),
      byteLength: 1024,
      metadata: {
        kind: "audio" as const,
        durationSeconds: 3,
        channelCount: 2,
        sampleRateHz: 48000,
        warnings: []
      }
    } satisfies AudioAssetRecord;
    const modelAsset = {
      id: "asset-model-main",
      kind: "model" as const,
      sourceName: "animated.glb",
      mimeType: "model/gltf-binary",
      storageKey: createProjectAssetStorageKey("asset-model-main"),
      byteLength: 2048,
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
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const pointLight = createPointLightEntity({
      id: "entity-point-light-main"
    });
    const soundEmitter = createSoundEmitterEntity({
      id: "entity-sound-main",
      audioAssetId: audioAsset.id
    });
    const modelInstance = createModelInstance({
      id: "model-instance-main",
      assetId: modelAsset.id
    });
    const document = {
      ...createEmptySceneDocument(),
      assets: {
        [audioAsset.id]: audioAsset,
        [modelAsset.id]: modelAsset
      },
      modelInstances: {
        [modelInstance.id]: modelInstance
      },
      entities: {
        [triggerVolume.id]: triggerVolume,
        [pointLight.id]: pointLight,
        [soundEmitter.id]: soundEmitter
      },
      interactionLinks: {
        "link-hide-model": createControlInteractionLink({
          id: "link-hide-model",
          sourceEntityId: triggerVolume.id,
          effect: createSetModelInstanceVisibleControlEffect({
            target: createModelInstanceControlTargetRef(modelInstance.id),
            visible: false
          })
        }),
        "link-sound-volume": createControlInteractionLink({
          id: "link-sound-volume",
          sourceEntityId: triggerVolume.id,
          effect: createSetSoundVolumeControlEffect({
            target: createSoundEmitterControlTargetRef(soundEmitter.id),
            volume: 0.25
          })
        }),
        "link-ambient-color": createControlInteractionLink({
          id: "link-ambient-color",
          sourceEntityId: triggerVolume.id,
          effect: createSetAmbientLightColorControlEffect({
            target: createActiveSceneControlTargetRef(),
            colorHex: "#112233"
          })
        })
      }
    };

    expect(parseSceneDocumentJson(serializeSceneDocument(document))).toEqual(
      document
    );
  });

  it("migrates v44 documents without changing existing interaction links", () => {
    const audioAsset = {
      id: "asset-audio-main",
      kind: "audio" as const,
      sourceName: "loop.ogg",
      mimeType: "audio/ogg",
      storageKey: createProjectAssetStorageKey("asset-audio-main"),
      byteLength: 1024,
      metadata: {
        kind: "audio" as const,
        durationSeconds: 3,
        channelCount: 2,
        sampleRateHz: 48000,
        warnings: []
      }
    } satisfies AudioAssetRecord;
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const soundEmitter = createSoundEmitterEntity({
      id: "entity-sound-main",
      audioAssetId: audioAsset.id
    });
    const legacyDocument = {
      ...createEmptySceneDocument(),
      version: NPC_PRESENCE_SCENE_DOCUMENT_VERSION,
      assets: {
        [audioAsset.id]: audioAsset
      },
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
    };

    const migratedDocument = migrateSceneDocument(legacyDocument);

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.interactionLinks).toEqual(
      legacyDocument.interactionLinks
    );
  });

  it("migrates v46 control interaction documents without rewriting effects", () => {
    const triggerVolume = createTriggerVolumeEntity({
      id: "entity-trigger-main"
    });
    const pointLight = createPointLightEntity({
      id: "entity-point-light-main"
    });
    const legacyDocument = {
      ...createEmptySceneDocument(),
      version: PROJECT_SCHEDULER_FOUNDATION_SCENE_DOCUMENT_VERSION,
      entities: {
        [triggerVolume.id]: triggerVolume,
        [pointLight.id]: pointLight
      },
      interactionLinks: {
        "link-light-off": createControlInteractionLink({
          id: "link-light-off",
          sourceEntityId: triggerVolume.id,
          trigger: "enter",
          effect: createSetLightEnabledControlEffect({
            target: createLightControlTargetRef("pointLight", pointLight.id),
            enabled: false
          })
        })
      }
    };

    const migratedDocument = migrateSceneDocument(legacyDocument);

    expect(migratedDocument.version).toBe(SCENE_DOCUMENT_VERSION);
    expect(migratedDocument.interactionLinks).toEqual(
      legacyDocument.interactionLinks
    );
  });
});
