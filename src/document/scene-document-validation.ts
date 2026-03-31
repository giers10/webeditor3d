import {
  type InteractableEntity,
  type PlayerStartEntity,
  type SoundEmitterEntity,
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

function validateWorldSettings(world: WorldSettings, diagnostics: SceneDiagnostic[]) {
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
  } else {
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

function validateSoundEmitterEntity(entity: SoundEmitterEntity, path: string, diagnostics: SceneDiagnostic[]) {
  if (!isFiniteVec3(entity.position)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-sound-emitter-position", "Sound Emitter position must remain finite on every axis.", `${path}.position`)
    );
  }

  if (!isPositiveFiniteNumber(entity.radius)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-sound-emitter-radius", "Sound Emitter radius must remain finite and greater than zero.", `${path}.radius`)
    );
  }

  if (!isNonNegativeFiniteNumber(entity.gain)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-sound-emitter-gain", "Sound Emitter gain must remain finite and zero or greater.", `${path}.gain`)
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

  if (sourceEntity.kind !== "triggerVolume") {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-interaction-source-kind",
        "Interaction links may only source from Trigger Volume entities in the current slice.",
        `${path}.sourceEntityId`
      )
    );
  }

  if (link.trigger !== "enter" && link.trigger !== "exit") {
    diagnostics.push(
      createDiagnostic(
        "error",
        "unsupported-interaction-trigger",
        `Unsupported interaction trigger ${String(link.trigger)}.`,
        `${path}.trigger`
      )
    );
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

  validateWorldSettings(document.world, diagnostics);

  for (const [materialKey, material] of Object.entries(document.materials)) {
    const path = `materials.${materialKey}`;

    if (material.id !== materialKey) {
      diagnostics.push(
        createDiagnostic("error", "material-id-mismatch", "Material ids must match their registry key.", `${path}.id`)
      );
    }

    registerAuthoredId(material.id, path, seenIds, diagnostics);
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

  for (const [entityKey, entity] of Object.entries(document.entities)) {
    const path = `entities.${entityKey}`;

    if (entity.id !== entityKey) {
      diagnostics.push(createDiagnostic("error", "entity-id-mismatch", "Entity ids must match their registry key.", `${path}.id`));
    }

    registerAuthoredId(entity.id, path, seenIds, diagnostics);

    switch (entity.kind) {
      case "playerStart":
        validatePlayerStartEntity(entity, path, diagnostics);
        break;
      case "soundEmitter":
        validateSoundEmitterEntity(entity, path, diagnostics);
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
