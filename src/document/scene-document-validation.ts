import {
  type AudioAssetMetadata,
  type ImageAssetMetadata,
  type ModelAssetMetadata,
  type ProjectAssetBoundingBox,
  type ProjectAssetRecord
} from "../assets/project-assets";
import type { ModelInstance } from "../assets/model-instances";
import {
  type InteractableEntity,
  type PointLightEntity,
  type PlayerStartEntity,
  type SoundEmitterEntity,
  type SpotLightEntity,
  type TeleportTargetEntity,
  type TriggerVolumeEntity
} from "../entities/entity-instances";
import { type InteractionLink } from "../interactions/interaction-links";
import { BOX_FACE_IDS, hasPositiveBoxSize } from "./brushes";
import type { SceneDocument } from "./scene-document";
import { isHexColorString, type WorldSettings } from "./world-settings";

export type SceneDiagnosticSeverity = "error" | "warning";
export type SceneDiagnosticScope = "document" | "build";

export interface SceneDiagnostic {
  code: string;
  severity: SceneDiagnosticSeverity;
  scope: SceneDiagnosticScope;
  message: string;
  path?: string;
}

export interface SceneDocumentValidationResult {
  diagnostics: SceneDiagnostic[];
  errors: SceneDiagnostic[];
  warnings: SceneDiagnostic[];
}

export function createDiagnostic(
  severity: SceneDiagnosticSeverity,
  code: string,
  message: string,
  path?: string,
  scope: SceneDiagnosticScope = "document"
): SceneDiagnostic {
  return {
    code,
    severity,
    scope,
    message,
    path
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFiniteVec3(vector: { x: unknown; y: unknown; z: unknown }): vector is { x: number; y: number; z: number } {
  return isFiniteNumber(vector.x) && isFiniteNumber(vector.y) && isFiniteNumber(vector.z);
}

function hasPositiveFiniteVec3(vector: { x: unknown; y: unknown; z: unknown }): vector is { x: number; y: number; z: number } {
  return isFiniteVec3(vector) && vector.x > 0 && vector.y > 0 && vector.z > 0;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function hasNonZeroVectorLength(vector: { x: number; y: number; z: number }): boolean {
  return vector.x !== 0 || vector.y !== 0 || vector.z !== 0;
}

function validateWorldSettings(world: WorldSettings, document: SceneDocument, diagnostics: SceneDiagnostic[]) {
  if (world.background.mode === "solid") {
    if (!isHexColorString(world.background.colorHex)) {
      diagnostics.push(
        createDiagnostic(
          "error",
          "invalid-world-background-color",
          "Solid world backgrounds must use #RRGGBB colors.",
          "world.background.colorHex"
        )
      );
    }
  } else if (world.background.mode === "verticalGradient") {
    if (!isHexColorString(world.background.topColorHex)) {
      diagnostics.push(
        createDiagnostic(
          "error",
          "invalid-world-background-top-color",
          "Gradient world backgrounds must use #RRGGBB colors for the top color.",
          "world.background.topColorHex"
        )
      );
    }

    if (!isHexColorString(world.background.bottomColorHex)) {
      diagnostics.push(
        createDiagnostic(
          "error",
          "invalid-world-background-bottom-color",
          "Gradient world backgrounds must use #RRGGBB colors for the bottom color.",
          "world.background.bottomColorHex"
        )
      );
    }
  } else {
    if (typeof world.background.assetId !== "string" || world.background.assetId.trim().length === 0) {
      diagnostics.push(
        createDiagnostic(
          "error",
          "invalid-world-background-asset-id",
          "World background images must reference a non-empty asset id.",
          "world.background.assetId"
        )
      );
    } else {
      const backgroundAsset = document.assets[world.background.assetId];

      if (backgroundAsset === undefined) {
        diagnostics.push(
          createDiagnostic(
            "error",
            "missing-world-background-asset",
            `World background image asset ${world.background.assetId} does not exist.`,
            "world.background.assetId"
          )
        );
      } else if (backgroundAsset.kind !== "image") {
        diagnostics.push(
          createDiagnostic(
            "error",
            "invalid-world-background-asset-kind",
            "World background images must reference image assets.",
            "world.background.assetId"
          )
        );
      }
    }

    if (!isNonNegativeFiniteNumber(world.background.environmentIntensity)) {
      diagnostics.push(
        createDiagnostic(
          "error",
          "invalid-world-background-environment-intensity",
          "World background environment intensity must be a non-negative finite number.",
          "world.background.environmentIntensity"
        )
      );
    }
  }

  if (!isHexColorString(world.ambientLight.colorHex)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-world-ambient-color",
        "World ambient light must use a #RRGGBB color.",
        "world.ambientLight.colorHex"
      )
    );
  }

  if (!isNonNegativeFiniteNumber(world.ambientLight.intensity)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-world-ambient-intensity",
        "World ambient light intensity must remain finite and zero or greater.",
        "world.ambientLight.intensity"
      )
    );
  }

  if (!isHexColorString(world.sunLight.colorHex)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-world-sun-color", "World sun color must use a #RRGGBB color.", "world.sunLight.colorHex")
    );
  }

  if (!isNonNegativeFiniteNumber(world.sunLight.intensity)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-world-sun-intensity",
        "World sun intensity must remain finite and zero or greater.",
        "world.sunLight.intensity"
      )
    );
  }

  if (!isFiniteVec3(world.sunLight.direction) || !hasNonZeroVectorLength(world.sunLight.direction)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-world-sun-direction",
        "World sun direction must remain finite and must not be the zero vector.",
        "world.sunLight.direction"
      )
    );
  }
}

function validatePointLightEntity(entity: PointLightEntity, path: string, diagnostics: SceneDiagnostic[]) {
  if (!isFiniteVec3(entity.position)) {
    diagnostics.push(createDiagnostic("error", "invalid-point-light-position", "Point Light position must remain finite on every axis.", `${path}.position`));
  }

  if (!isHexColorString(entity.colorHex)) {
    diagnostics.push(createDiagnostic("error", "invalid-point-light-color", "Point Light color must use a #RRGGBB color.", `${path}.colorHex`));
  }

  if (!isNonNegativeFiniteNumber(entity.intensity)) {
    diagnostics.push(createDiagnostic("error", "invalid-point-light-intensity", "Point Light intensity must remain finite and zero or greater.", `${path}.intensity`));
  }

  if (!isPositiveFiniteNumber(entity.distance)) {
    diagnostics.push(createDiagnostic("error", "invalid-point-light-distance", "Point Light distance must remain finite and greater than zero.", `${path}.distance`));
  }
}

function validateSpotLightEntity(entity: SpotLightEntity, path: string, diagnostics: SceneDiagnostic[]) {
  if (!isFiniteVec3(entity.position)) {
    diagnostics.push(createDiagnostic("error", "invalid-spot-light-position", "Spot Light position must remain finite on every axis.", `${path}.position`));
  }

  if (!isFiniteVec3(entity.direction) || !hasNonZeroVectorLength(entity.direction)) {
    diagnostics.push(createDiagnostic("error", "invalid-spot-light-direction", "Spot Light direction must remain finite and must not be the zero vector.", `${path}.direction`));
  }

  if (!isHexColorString(entity.colorHex)) {
    diagnostics.push(createDiagnostic("error", "invalid-spot-light-color", "Spot Light color must use a #RRGGBB color.", `${path}.colorHex`));
  }

  if (!isNonNegativeFiniteNumber(entity.intensity)) {
    diagnostics.push(createDiagnostic("error", "invalid-spot-light-intensity", "Spot Light intensity must remain finite and zero or greater.", `${path}.intensity`));
  }

  if (!isPositiveFiniteNumber(entity.distance)) {
    diagnostics.push(createDiagnostic("error", "invalid-spot-light-distance", "Spot Light distance must remain finite and greater than zero.", `${path}.distance`));
  }

  if (!isFiniteNumber(entity.angleDegrees) || entity.angleDegrees <= 0 || entity.angleDegrees >= 180) {
    diagnostics.push(createDiagnostic("error", "invalid-spot-light-angle", "Spot Light angle must remain a finite degree value between 0 and 180.", `${path}.angleDegrees`));
  }
}

function validateProjectAssetBoundingBox(
  boundingBox: ProjectAssetBoundingBox | null,
  path: string,
  diagnostics: SceneDiagnostic[]
) {
  if (boundingBox === null) {
    return;
  }

  if (!isFiniteVec3(boundingBox.min)) {
    diagnostics.push(createDiagnostic("error", "invalid-asset-bounding-box-min", "Model asset bounding boxes must have finite minimum coordinates.", `${path}.min`));
  }

  if (!isFiniteVec3(boundingBox.max)) {
    diagnostics.push(createDiagnostic("error", "invalid-asset-bounding-box-max", "Model asset bounding boxes must have finite maximum coordinates.", `${path}.max`));
  }

  if (!isFiniteVec3(boundingBox.size) || boundingBox.size.x < 0 || boundingBox.size.y < 0 || boundingBox.size.z < 0) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-asset-bounding-box-size",
        "Model asset bounding boxes must have finite, zero-or-greater size values.",
        `${path}.size`
      )
    );
  }
}

function validateModelAssetMetadata(metadata: ModelAssetMetadata, path: string, diagnostics: SceneDiagnostic[]) {
  if (metadata.format !== "glb" && metadata.format !== "gltf") {
    diagnostics.push(createDiagnostic("error", "invalid-model-asset-format", "Model asset format must be glb or gltf.", `${path}.format`));
  }

  if (metadata.sceneName !== null && metadata.sceneName.trim().length === 0) {
    diagnostics.push(createDiagnostic("error", "invalid-model-asset-scene-name", "Model asset scene names must be non-empty when authored.", `${path}.sceneName`));
  }

  if (!isNonNegativeFiniteNumber(metadata.nodeCount)) {
    diagnostics.push(createDiagnostic("error", "invalid-model-asset-node-count", "Model asset node counts must be finite and zero or greater.", `${path}.nodeCount`));
  }

  if (!isNonNegativeFiniteNumber(metadata.meshCount)) {
    diagnostics.push(createDiagnostic("error", "invalid-model-asset-mesh-count", "Model asset mesh counts must be finite and zero or greater.", `${path}.meshCount`));
  }

  if (!Array.isArray(metadata.materialNames) || metadata.materialNames.some((name) => typeof name !== "string")) {
    diagnostics.push(createDiagnostic("error", "invalid-model-asset-material-names", "Model asset material names must be string arrays.", `${path}.materialNames`));
  }

  if (!Array.isArray(metadata.textureNames) || metadata.textureNames.some((name) => typeof name !== "string")) {
    diagnostics.push(createDiagnostic("error", "invalid-model-asset-texture-names", "Model asset texture names must be string arrays.", `${path}.textureNames`));
  }

  if (!Array.isArray(metadata.animationNames) || metadata.animationNames.some((name) => typeof name !== "string")) {
    diagnostics.push(createDiagnostic("error", "invalid-model-asset-animation-names", "Model asset animation names must be string arrays.", `${path}.animationNames`));
  }

  validateProjectAssetBoundingBox(metadata.boundingBox, `${path}.boundingBox`, diagnostics);

  if (!Array.isArray(metadata.warnings) || metadata.warnings.some((warning) => typeof warning !== "string")) {
    diagnostics.push(createDiagnostic("error", "invalid-model-asset-warnings", "Model asset warnings must be string arrays.", `${path}.warnings`));
  }
}

function validateImageAssetMetadata(metadata: ImageAssetMetadata, path: string, diagnostics: SceneDiagnostic[]) {
  if (!isPositiveFiniteNumber(metadata.width)) {
    diagnostics.push(createDiagnostic("error", "invalid-image-asset-width", "Image asset width must be finite and greater than zero.", `${path}.width`));
  }

  if (!isPositiveFiniteNumber(metadata.height)) {
    diagnostics.push(createDiagnostic("error", "invalid-image-asset-height", "Image asset height must be finite and greater than zero.", `${path}.height`));
  }

  if (!isBoolean(metadata.hasAlpha)) {
    diagnostics.push(createDiagnostic("error", "invalid-image-asset-alpha", "Image asset alpha flags must be booleans.", `${path}.hasAlpha`));
  }

  if (!Array.isArray(metadata.warnings) || metadata.warnings.some((warning) => typeof warning !== "string")) {
    diagnostics.push(createDiagnostic("error", "invalid-image-asset-warnings", "Image asset warnings must be string arrays.", `${path}.warnings`));
  }
}

function validateAudioAssetMetadata(metadata: AudioAssetMetadata, path: string, diagnostics: SceneDiagnostic[]) {
  if (metadata.durationSeconds !== null && !isNonNegativeFiniteNumber(metadata.durationSeconds)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-audio-asset-duration",
        "Audio asset durations must be finite and zero or greater when authored.",
        `${path}.durationSeconds`
      )
    );
  }

  if (metadata.channelCount !== null && !isPositiveFiniteNumber(metadata.channelCount)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-audio-asset-channel-count",
        "Audio asset channel counts must be finite and greater than zero when authored.",
        `${path}.channelCount`
      )
    );
  }

  if (metadata.sampleRateHz !== null && !isPositiveFiniteNumber(metadata.sampleRateHz)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-audio-asset-sample-rate",
        "Audio asset sample rates must be finite and greater than zero when authored.",
        `${path}.sampleRateHz`
      )
    );
  }

  if (!Array.isArray(metadata.warnings) || metadata.warnings.some((warning) => typeof warning !== "string")) {
    diagnostics.push(createDiagnostic("error", "invalid-audio-asset-warnings", "Audio asset warnings must be string arrays.", `${path}.warnings`));
  }
}

function validateProjectAsset(asset: ProjectAssetRecord, path: string, diagnostics: SceneDiagnostic[]) {
  if (asset.sourceName.trim().length === 0) {
    diagnostics.push(createDiagnostic("error", "invalid-asset-source-name", "Asset source names must be non-empty strings.", `${path}.sourceName`));
  }

  if (asset.mimeType.trim().length === 0) {
    diagnostics.push(createDiagnostic("error", "invalid-asset-mime-type", "Asset mime types must be non-empty strings.", `${path}.mimeType`));
  }

  if (asset.storageKey.trim().length === 0) {
    diagnostics.push(createDiagnostic("error", "invalid-asset-storage-key", "Asset storage keys must be non-empty strings.", `${path}.storageKey`));
  }

  if (!isPositiveFiniteNumber(asset.byteLength)) {
    diagnostics.push(createDiagnostic("error", "invalid-asset-byte-length", "Asset byte lengths must be finite and greater than zero.", `${path}.byteLength`));
  }

  switch (asset.kind) {
    case "model":
      validateModelAssetMetadata(asset.metadata, `${path}.metadata`, diagnostics);
      break;
    case "image":
      validateImageAssetMetadata(asset.metadata, `${path}.metadata`, diagnostics);
      break;
    case "audio":
      validateAudioAssetMetadata(asset.metadata, `${path}.metadata`, diagnostics);
      break;
  }
}

function validateModelInstance(modelInstance: ModelInstance, path: string, document: SceneDocument, diagnostics: SceneDiagnostic[]) {
  if (modelInstance.name !== undefined && modelInstance.name.trim().length === 0) {
    diagnostics.push(createDiagnostic("error", "invalid-model-instance-name", "Model instance names must be non-empty when authored.", `${path}.name`));
  }

  if (!isFiniteVec3(modelInstance.position)) {
    diagnostics.push(createDiagnostic("error", "invalid-model-instance-position", "Model instance positions must remain finite on every axis.", `${path}.position`));
  }

  if (!isFiniteVec3(modelInstance.rotationDegrees)) {
    diagnostics.push(createDiagnostic("error", "invalid-model-instance-rotation", "Model instance rotations must remain finite on every axis.", `${path}.rotationDegrees`));
  }

  if (!hasPositiveFiniteVec3(modelInstance.scale)) {
    diagnostics.push(createDiagnostic("error", "invalid-model-instance-scale", "Model instance scales must remain finite and positive on every axis.", `${path}.scale`));
  }

  const asset = document.assets[modelInstance.assetId];

  if (asset === undefined) {
    diagnostics.push(
      createDiagnostic("error", "missing-model-instance-asset", `Model instance asset ${modelInstance.assetId} does not exist.`, `${path}.assetId`)
    );
    return;
  }

  if (asset.kind !== "model") {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-model-instance-asset-kind",
        "Model instances may only reference model assets.",
        `${path}.assetId`
      )
    );
  }
}

function validatePlayerStartEntity(entity: PlayerStartEntity, path: string, diagnostics: SceneDiagnostic[]) {
  if (!isFiniteVec3(entity.position)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-player-start-position", "Player Start position must remain finite on every axis.", `${path}.position`)
    );
  }

  if (!isFiniteNumber(entity.yawDegrees)) {
    diagnostics.push(createDiagnostic("error", "invalid-player-start-yaw", "Player Start yaw must remain a finite number.", `${path}.yawDegrees`));
  }
}

function validateSoundEmitterAudioAsset(
  entity: SoundEmitterEntity,
  path: string,
  document: SceneDocument,
  diagnostics: SceneDiagnostic[],
  missingSeverity: SceneDiagnosticSeverity
): ProjectAssetRecord | null {
  if (entity.audioAssetId === null) {
    diagnostics.push(
      createDiagnostic(
        missingSeverity,
        "missing-sound-emitter-audio-asset",
        entity.autoplay
          ? "Sound Emitter autoplay requires an assigned audio asset."
          : "Sound Emitter has no audio asset assigned yet.",
        `${path}.audioAssetId`
      )
    );
    return null;
  }

  const asset = document.assets[entity.audioAssetId];

  if (asset === undefined) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "missing-sound-emitter-audio-asset",
        `Sound Emitter audio asset ${entity.audioAssetId} does not exist.`,
        `${path}.audioAssetId`
      )
    );
    return null;
  }

  if (asset.kind !== "audio") {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-sound-emitter-audio-asset-kind",
        "Sound Emitter audioAssetId must reference an audio asset.",
        `${path}.audioAssetId`
      )
    );
    return null;
  }

  return asset;
}

function validateSoundEmitterEntity(entity: SoundEmitterEntity, path: string, document: SceneDocument, diagnostics: SceneDiagnostic[]) {
  if (!isFiniteVec3(entity.position)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-sound-emitter-position", "Sound Emitter position must remain finite on every axis.", `${path}.position`)
    );
  }

  if (!isNonNegativeFiniteNumber(entity.volume)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-sound-emitter-volume", "Sound Emitter volume must remain finite and zero or greater.", `${path}.volume`)
    );
  }

  if (!isPositiveFiniteNumber(entity.refDistance)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-sound-emitter-ref-distance",
        "Sound Emitter ref distance must remain finite and greater than zero.",
        `${path}.refDistance`
      )
    );
  }

  if (!isPositiveFiniteNumber(entity.maxDistance)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-sound-emitter-max-distance",
        "Sound Emitter max distance must remain finite and greater than zero.",
        `${path}.maxDistance`
      )
    );
  }

  if (isPositiveFiniteNumber(entity.refDistance) && isPositiveFiniteNumber(entity.maxDistance) && entity.maxDistance < entity.refDistance) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-sound-emitter-distance-order",
        "Sound Emitter max distance must be greater than or equal to ref distance.",
        `${path}.maxDistance`
      )
    );
  }

  if (!isBoolean(entity.autoplay)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-sound-emitter-autoplay", "Sound Emitter autoplay must remain a boolean.", `${path}.autoplay`)
    );
  }

  if (!isBoolean(entity.loop)) {
    diagnostics.push(createDiagnostic("error", "invalid-sound-emitter-loop", "Sound Emitter loop must remain a boolean.", `${path}.loop`));
  }

  validateSoundEmitterAudioAsset(entity, path, document, diagnostics, entity.autoplay ? "error" : "warning");
}

function validateTriggerVolumeEntity(entity: TriggerVolumeEntity, path: string, diagnostics: SceneDiagnostic[]) {
  if (!isFiniteVec3(entity.position)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-trigger-volume-position", "Trigger Volume position must remain finite on every axis.", `${path}.position`)
    );
  }

  if (!hasPositiveFiniteVec3(entity.size)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-trigger-volume-size",
        "Trigger Volume size must remain finite and positive on every axis.",
        `${path}.size`
      )
    );
  }

  if (!isBoolean(entity.triggerOnEnter)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-trigger-volume-enter-flag",
        "Trigger Volume triggerOnEnter must remain a boolean.",
        `${path}.triggerOnEnter`
      )
    );
  }

  if (!isBoolean(entity.triggerOnExit)) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-trigger-volume-exit-flag",
        "Trigger Volume triggerOnExit must remain a boolean.",
        `${path}.triggerOnExit`
      )
    );
  }
}

function validateTeleportTargetEntity(entity: TeleportTargetEntity, path: string, diagnostics: SceneDiagnostic[]) {
  if (!isFiniteVec3(entity.position)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-teleport-target-position", "Teleport Target position must remain finite on every axis.", `${path}.position`)
    );
  }

  if (!isFiniteNumber(entity.yawDegrees)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-teleport-target-yaw", "Teleport Target yaw must remain a finite number.", `${path}.yawDegrees`)
    );
  }
}

function validateInteractableEntity(entity: InteractableEntity, path: string, diagnostics: SceneDiagnostic[]) {
  if (!isFiniteVec3(entity.position)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-interactable-position", "Interactable position must remain finite on every axis.", `${path}.position`)
    );
  }

  if (!isPositiveFiniteNumber(entity.radius)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-interactable-radius", "Interactable radius must remain finite and greater than zero.", `${path}.radius`)
    );
  }

  if (typeof entity.prompt !== "string" || entity.prompt.trim().length === 0) {
    diagnostics.push(
      createDiagnostic("error", "invalid-interactable-prompt", "Interactable prompt must remain a non-empty string.", `${path}.prompt`)
    );
  }

  if (!isBoolean(entity.enabled)) {
    diagnostics.push(createDiagnostic("error", "invalid-interactable-enabled", "Interactable enabled must remain a boolean.", `${path}.enabled`));
  }
}

function validateInteractionLink(link: InteractionLink, path: string, document: SceneDocument, diagnostics: SceneDiagnostic[]) {
  const sourceEntity = document.entities[link.sourceEntityId];

  if (sourceEntity === undefined) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "missing-interaction-source-entity",
        `Interaction source entity ${link.sourceEntityId} does not exist.`,
        `${path}.sourceEntityId`
      )
    );
    return;
  }

  if (sourceEntity.kind !== "triggerVolume" && sourceEntity.kind !== "interactable") {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-interaction-source-kind",
        "Interaction links may only source from Trigger Volume or Interactable entities in the current slice.",
        `${path}.sourceEntityId`
      )
    );
  }

  if (sourceEntity.kind === "triggerVolume") {
    if (link.trigger !== "enter" && link.trigger !== "exit") {
      diagnostics.push(
        createDiagnostic(
          "error",
          "unsupported-interaction-trigger",
          "Trigger Volume links may only use enter or exit triggers.",
          `${path}.trigger`
        )
      );
    }
  } else if (sourceEntity.kind === "interactable") {
    if (link.trigger !== "click") {
      diagnostics.push(
        createDiagnostic(
          "error",
          "unsupported-interaction-trigger",
          "Interactable links may only use the click trigger.",
          `${path}.trigger`
        )
      );
    }
  }

  switch (link.action.type) {
    case "teleportPlayer": {
      const targetEntity = document.entities[link.action.targetEntityId];

      if (targetEntity === undefined) {
        diagnostics.push(
          createDiagnostic(
            "error",
            "missing-teleport-target-entity",
            `Teleport target entity ${link.action.targetEntityId} does not exist.`,
            `${path}.action.targetEntityId`
          )
        );
        return;
      }

      if (targetEntity.kind !== "teleportTarget") {
        diagnostics.push(
          createDiagnostic(
            "error",
            "invalid-teleport-target-kind",
            "Teleport player actions must target a Teleport Target entity.",
            `${path}.action.targetEntityId`
          )
        );
      }
      break;
    }
    case "toggleVisibility":
      if (document.brushes[link.action.targetBrushId] === undefined) {
        diagnostics.push(
          createDiagnostic(
            "error",
            "missing-visibility-target-brush",
            `Visibility target brush ${link.action.targetBrushId} does not exist.`,
            `${path}.action.targetBrushId`
          )
        );
      }

      if (link.action.visible !== undefined && typeof link.action.visible !== "boolean") {
        diagnostics.push(
          createDiagnostic(
            "error",
            "invalid-visibility-action-visible",
            "Visibility actions must use a boolean visible value when authored.",
            `${path}.action.visible`
          )
        );
      }
      break;
    case "playAnimation":
      {
        const targetModelInstance = document.modelInstances[link.action.targetModelInstanceId];

        if (targetModelInstance === undefined) {
          diagnostics.push(
            createDiagnostic(
              "error",
              "missing-play-animation-target-instance",
              `Play animation target model instance ${link.action.targetModelInstanceId} does not exist.`,
              `${path}.action.targetModelInstanceId`
            )
          );
          return;
        }

        if (link.action.clipName.trim().length === 0) {
          diagnostics.push(
            createDiagnostic(
              "error",
              "invalid-play-animation-clip-name",
              "Play animation clip name must be non-empty.",
              `${path}.action.clipName`
            )
          );
          return;
        }

        const targetAsset = document.assets[targetModelInstance.assetId];

        if (targetAsset === undefined || targetAsset.kind !== "model") {
          return;
        }

        if (!targetAsset.metadata.animationNames.includes(link.action.clipName)) {
          diagnostics.push(
            createDiagnostic(
              "error",
              "missing-play-animation-clip",
              `Play animation clip ${link.action.clipName} does not exist on model asset ${targetAsset.id}.`,
              `${path}.action.clipName`
            )
          );
        }

        break;
      }
    case "stopAnimation":
      // Validate that the target model instance exists in the document
      if (document.modelInstances[link.action.targetModelInstanceId] === undefined) {
        diagnostics.push(
          createDiagnostic(
            "error",
            "missing-stop-animation-target-instance",
            `Stop animation target model instance ${link.action.targetModelInstanceId} does not exist.`,
            `${path}.action.targetModelInstanceId`
          )
        );
      }
      break;
    case "playSound":
    case "stopSound": {
      const targetEntity = document.entities[link.action.targetSoundEmitterId];

      if (targetEntity === undefined) {
        diagnostics.push(
          createDiagnostic(
            "error",
            "missing-sound-emitter-entity",
            `Sound emitter entity ${link.action.targetSoundEmitterId} does not exist.`,
            `${path}.action.targetSoundEmitterId`
          )
        );
        break;
      }

      if (targetEntity.kind !== "soundEmitter") {
        diagnostics.push(
          createDiagnostic(
            "error",
            "invalid-sound-emitter-kind",
            "Sound playback actions must target a Sound Emitter entity.",
            `${path}.action.targetSoundEmitterId`
          )
        );
        break;
      }

      if (targetEntity.audioAssetId === null) {
        diagnostics.push(
          createDiagnostic(
            "error",
            "missing-sound-emitter-audio-asset",
            "Sound playback actions require a Sound Emitter that references an audio asset.",
            `${path}.action.targetSoundEmitterId`
          )
        );
      }

      break;
    }
    default:
      diagnostics.push(
        createDiagnostic(
          "error",
          "unsupported-interaction-action",
          `Unsupported interaction action ${(link.action as { type: string }).type}.`,
          `${path}.action.type`
        )
      );
      break;
  }
}

function registerAuthoredId(id: string, path: string, seenIds: Map<string, string>, diagnostics: SceneDiagnostic[]) {
  const previousPath = seenIds.get(id);

  if (previousPath !== undefined) {
    diagnostics.push(
      createDiagnostic("error", "duplicate-authored-id", `Duplicate authored id ${id} is already used at ${previousPath}.`, path)
    );
    return;
  }

  seenIds.set(id, path);
}

export function formatSceneDiagnostic(diagnostic: SceneDiagnostic): string {
  return diagnostic.path === undefined ? diagnostic.message : `${diagnostic.path}: ${diagnostic.message}`;
}

export function formatSceneDiagnosticSummary(diagnostics: SceneDiagnostic[], limit = 3): string {
  if (diagnostics.length === 0) {
    return "No diagnostics.";
  }

  const visibleDiagnostics = diagnostics.slice(0, Math.max(1, limit));
  const summary = visibleDiagnostics.map((diagnostic) => formatSceneDiagnostic(diagnostic)).join("; ");
  const remainingCount = diagnostics.length - visibleDiagnostics.length;

  return remainingCount > 0 ? `${summary}; +${remainingCount} more` : summary;
}

export function validateSceneDocument(document: SceneDocument): SceneDocumentValidationResult {
  const diagnostics: SceneDiagnostic[] = [];
  const seenIds = new Map<string, string>();

  validateWorldSettings(document.world, document, diagnostics);

  for (const [materialKey, material] of Object.entries(document.materials)) {
    const path = `materials.${materialKey}`;

    if (material.id !== materialKey) {
      diagnostics.push(
        createDiagnostic("error", "material-id-mismatch", "Material ids must match their registry key.", `${path}.id`)
      );
    }

    registerAuthoredId(material.id, path, seenIds, diagnostics);
  }

  for (const [assetKey, asset] of Object.entries(document.assets)) {
    const path = `assets.${assetKey}`;

    if (asset.id !== assetKey) {
      diagnostics.push(createDiagnostic("error", "asset-id-mismatch", "Asset ids must match their registry key.", `${path}.id`));
    }

    registerAuthoredId(asset.id, path, seenIds, diagnostics);
    validateProjectAsset(asset, path, diagnostics);
  }

  for (const [brushKey, brush] of Object.entries(document.brushes)) {
    const path = `brushes.${brushKey}`;

    if (brush.id !== brushKey) {
      diagnostics.push(createDiagnostic("error", "brush-id-mismatch", "Brush ids must match their registry key.", `${path}.id`));
    }

    registerAuthoredId(brush.id, path, seenIds, diagnostics);

    if (brush.name !== undefined && brush.name.trim().length === 0) {
      diagnostics.push(createDiagnostic("error", "invalid-box-name", "Box brush names must be non-empty when authored.", `${path}.name`));
    }

    if (!isFiniteVec3(brush.size) || !hasPositiveBoxSize(brush.size)) {
      diagnostics.push(
        createDiagnostic("error", "invalid-box-size", "Box brush sizes must remain finite and positive on every axis.", `${path}.size`)
      );
    }

    for (const faceId of BOX_FACE_IDS) {
      const materialId = brush.faces[faceId].materialId;

      if (materialId !== null && document.materials[materialId] === undefined) {
        diagnostics.push(
          createDiagnostic(
            "error",
            "missing-material-ref",
            `Face material reference ${materialId} does not exist in the document material registry.`,
            `${path}.faces.${faceId}.materialId`
          )
        );
      }
    }
  }

  for (const [modelInstanceKey, modelInstance] of Object.entries(document.modelInstances)) {
    const path = `modelInstances.${modelInstanceKey}`;

    if (modelInstance.id !== modelInstanceKey) {
      diagnostics.push(
        createDiagnostic("error", "model-instance-id-mismatch", "Model instance ids must match their registry key.", `${path}.id`)
      );
    }

    registerAuthoredId(modelInstance.id, path, seenIds, diagnostics);
    validateModelInstance(modelInstance, path, document, diagnostics);
  }

  for (const [entityKey, entity] of Object.entries(document.entities)) {
    const path = `entities.${entityKey}`;

    if (entity.id !== entityKey) {
      diagnostics.push(createDiagnostic("error", "entity-id-mismatch", "Entity ids must match their registry key.", `${path}.id`));
    }

    registerAuthoredId(entity.id, path, seenIds, diagnostics);

    switch (entity.kind) {
      case "pointLight":
        validatePointLightEntity(entity, path, diagnostics);
        break;
      case "spotLight":
        validateSpotLightEntity(entity, path, diagnostics);
        break;
      case "playerStart":
        validatePlayerStartEntity(entity, path, diagnostics);
        break;
      case "soundEmitter":
        validateSoundEmitterEntity(entity, path, document, diagnostics);
        break;
      case "triggerVolume":
        validateTriggerVolumeEntity(entity, path, diagnostics);
        break;
      case "teleportTarget":
        validateTeleportTargetEntity(entity, path, diagnostics);
        break;
      case "interactable":
        validateInteractableEntity(entity, path, diagnostics);
        break;
      default:
        diagnostics.push(
          createDiagnostic(
            "error",
            "unsupported-entity-kind",
            `Unsupported entity kind ${(entity as { kind: string }).kind}.`,
            `${path}.kind`
          )
        );
        break;
    }
  }

  for (const [linkKey, link] of Object.entries(document.interactionLinks)) {
    const path = `interactionLinks.${linkKey}`;

    if (link.id !== linkKey) {
      diagnostics.push(createDiagnostic("error", "interaction-link-id-mismatch", "Interaction link ids must match their registry key.", `${path}.id`));
    }

    registerAuthoredId(link.id, path, seenIds, diagnostics);
    validateInteractionLink(link, path, document, diagnostics);
  }

  return {
    diagnostics,
    errors: diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    warnings: diagnostics.filter((diagnostic) => diagnostic.severity === "warning")
  };
}

export function assertSceneDocumentIsValid(document: SceneDocument) {
  const validation = validateSceneDocument(document);

  if (validation.errors.length > 0) {
    throw new Error(`Scene document has ${validation.errors.length} validation error(s): ${formatSceneDiagnosticSummary(validation.errors)}`);
  }
}
