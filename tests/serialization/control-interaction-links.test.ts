import { describe, expect, it } from "vitest";

import {
  createLightControlTargetRef,
  createSetLightEnabledControlEffect
} from "../../src/controls/control-surface";
import { createEmptySceneDocument, NPC_PRESENCE_SCENE_DOCUMENT_VERSION, SCENE_DOCUMENT_VERSION } from "../../src/document/scene-document";
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
  type AudioAssetRecord
} from "../../src/assets/project-assets";
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
});
