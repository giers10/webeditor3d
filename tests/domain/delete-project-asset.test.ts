import { describe, expect, it } from "vitest";
import { BoxGeometry } from "three";

import { deleteProjectAssetFromProjectDocument } from "../../src/assets/delete-project-asset";
import { createModelInstance } from "../../src/assets/model-instances";
import {
  createProjectAssetStorageKey,
  type AudioAssetRecord,
  type ImageAssetRecord
} from "../../src/assets/project-assets";
import {
  createEmptyProjectDocument,
  type ProjectDocument
} from "../../src/document/scene-document";
import { createDefaultWorldSettings } from "../../src/document/world-settings";
import {
  createSoundEmitterEntity,
  createTeleportTargetEntity,
  createTriggerVolumeEntity
} from "../../src/entities/entity-instances";
import {
  createPlayAnimationInteractionLink,
  createPlaySoundInteractionLink,
  createStopAnimationInteractionLink,
  createStopSoundInteractionLink,
  createTeleportPlayerInteractionLink
} from "../../src/interactions/interaction-links";
import { createFixtureLoadedModelAssetFromGeometry } from "../helpers/model-collider-fixtures";

function createProjectDocumentFixture() {
  const baseProjectDocument = createEmptyProjectDocument({
    sceneName: "Asset Cleanup Scene"
  });
  const sceneId = baseProjectDocument.activeSceneId;
  const baseScene = baseProjectDocument.scenes[sceneId];
  const { asset: modelAsset } = createFixtureLoadedModelAssetFromGeometry(
    "asset-model-cleanup",
    new BoxGeometry(1, 2, 1)
  );
  const imageAsset: ImageAssetRecord = {
    id: "asset-image-cleanup",
    kind: "image",
    sourceName: "panorama-cleanup.png",
    mimeType: "image/png",
    storageKey: createProjectAssetStorageKey("asset-image-cleanup"),
    byteLength: 2048,
    metadata: {
      kind: "image",
      width: 1024,
      height: 512,
      hasAlpha: false,
      warnings: []
    }
  };
  const audioAsset: AudioAssetRecord = {
    id: "asset-audio-cleanup",
    kind: "audio",
    sourceName: "cleanup-loop.ogg",
    mimeType: "audio/ogg",
    storageKey: createProjectAssetStorageKey("asset-audio-cleanup"),
    byteLength: 4096,
    metadata: {
      kind: "audio",
      durationSeconds: 6.5,
      channelCount: 2,
      sampleRateHz: 44100,
      warnings: []
    }
  };
  const modelInstance = createModelInstance({
    id: "model-instance-cleanup",
    assetId: modelAsset.id
  });
  const triggerVolume = createTriggerVolumeEntity({
    id: "entity-trigger-cleanup"
  });
  const teleportTarget = createTeleportTargetEntity({
    id: "entity-teleport-cleanup"
  });
  const soundEmitter = createSoundEmitterEntity({
    id: "entity-sound-cleanup",
    audioAssetId: audioAsset.id,
    autoplay: true,
    loop: true
  });
  const projectDocument: ProjectDocument = {
    ...baseProjectDocument,
    assets: {
      ...baseProjectDocument.assets,
      [modelAsset.id]: modelAsset,
      [imageAsset.id]: imageAsset,
      [audioAsset.id]: audioAsset
    },
    scenes: {
      ...baseProjectDocument.scenes,
      [sceneId]: {
        ...baseScene,
        world: {
          ...baseScene.world,
          background: {
            mode: "image",
            assetId: imageAsset.id,
            environmentIntensity: 0.8
          }
        },
        modelInstances: {
          [modelInstance.id]: modelInstance
        },
        entities: {
          [triggerVolume.id]: triggerVolume,
          [teleportTarget.id]: teleportTarget,
          [soundEmitter.id]: soundEmitter
        },
        interactionLinks: {
          "link-play-animation": createPlayAnimationInteractionLink({
            id: "link-play-animation",
            sourceEntityId: triggerVolume.id,
            targetModelInstanceId: modelInstance.id,
            clipName: "Idle"
          }),
          "link-stop-animation": createStopAnimationInteractionLink({
            id: "link-stop-animation",
            sourceEntityId: triggerVolume.id,
            targetModelInstanceId: modelInstance.id
          }),
          "link-play-sound": createPlaySoundInteractionLink({
            id: "link-play-sound",
            sourceEntityId: triggerVolume.id,
            targetSoundEmitterId: soundEmitter.id
          }),
          "link-stop-sound": createStopSoundInteractionLink({
            id: "link-stop-sound",
            sourceEntityId: triggerVolume.id,
            targetSoundEmitterId: soundEmitter.id
          }),
          "link-teleport": createTeleportPlayerInteractionLink({
            id: "link-teleport",
            sourceEntityId: triggerVolume.id,
            targetEntityId: teleportTarget.id
          })
        }
      }
    }
  };

  return {
    sceneId,
    projectDocument,
    modelAsset,
    imageAsset,
    audioAsset,
    modelInstance,
    soundEmitter
  };
}

describe("deleteProjectAssetFromProjectDocument", () => {
  it("removes deleted model assets from model instances and animation links", () => {
    const fixture = createProjectDocumentFixture();

    const nextProjectDocument = deleteProjectAssetFromProjectDocument(
      fixture.projectDocument,
      fixture.modelAsset.id
    );
    const nextScene = nextProjectDocument.scenes[fixture.sceneId];

    expect(nextProjectDocument.assets[fixture.modelAsset.id]).toBeUndefined();
    expect(nextScene.modelInstances).toEqual({});
    expect(Object.keys(nextScene.interactionLinks).sort()).toEqual([
      "link-play-sound",
      "link-stop-sound",
      "link-teleport"
    ]);
  });

  it("resets image backgrounds when deleting a referenced image asset", () => {
    const fixture = createProjectDocumentFixture();

    const nextProjectDocument = deleteProjectAssetFromProjectDocument(
      fixture.projectDocument,
      fixture.imageAsset.id
    );
    const nextScene = nextProjectDocument.scenes[fixture.sceneId];

    expect(nextProjectDocument.assets[fixture.imageAsset.id]).toBeUndefined();
    expect(nextScene.world.background).toEqual(
      createDefaultWorldSettings().background
    );
  });

  it("silences sound emitters and removes sound links when deleting an audio asset", () => {
    const fixture = createProjectDocumentFixture();

    const nextProjectDocument = deleteProjectAssetFromProjectDocument(
      fixture.projectDocument,
      fixture.audioAsset.id
    );
    const nextScene = nextProjectDocument.scenes[fixture.sceneId];

    expect(nextProjectDocument.assets[fixture.audioAsset.id]).toBeUndefined();
    expect(nextScene.entities[fixture.soundEmitter.id]).toMatchObject({
      kind: "soundEmitter",
      audioAssetId: null,
      autoplay: false,
      loop: true
    });
    expect(Object.keys(nextScene.interactionLinks).sort()).toEqual([
      "link-play-animation",
      "link-stop-animation",
      "link-teleport"
    ]);
  });
});