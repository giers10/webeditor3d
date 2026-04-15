import { createMoveBoxBrushCommand } from "./move-box-brush-command";
import { createApplyBatchSelectionTransformCommand } from "./apply-batch-selection-transform-command";
import { createResizeBoxBrushCommand } from "./resize-box-brush-command";
import { createRotateBoxBrushCommand } from "./rotate-box-brush-command";
import { createSetPathPointPositionCommand } from "./set-path-point-position-command";
import { createSetBoxBrushTransformCommand } from "./set-box-brush-transform-command";
import { createUpsertEntityCommand } from "./upsert-entity-command";
import { createUpsertModelInstanceCommand } from "./upsert-model-instance-command";
import type { EditorCommand } from "./command";
import type { SceneDocument } from "../document/scene-document";
import { createModelInstance } from "../assets/model-instances";
import {
  createInteractableEntity,
  createNpcEntity,
  createPlayerStartEntity,
  createPointLightEntity,
  createSceneEntryEntity,
  createSoundEmitterEntity,
  createSpotLightEntity,
  createTeleportTargetEntity,
  createTriggerVolumeEntity
} from "../entities/entity-instances";
import {
  getTransformOperationLabel,
  type ActiveTransformSession
} from "../core/transform-session";

function createTransformCommandLabel(session: ActiveTransformSession): string {
  let targetLabel = "model instance";

  switch (session.target.kind) {
    case "brush":
      targetLabel = "whitebox box";
      break;
    case "brushes":
      targetLabel =
        session.target.items.length === 1
          ? "whitebox solid"
          : `${session.target.items.length} whitebox solids`;
      break;
    case "brushFace":
      targetLabel = "whitebox face";
      break;
    case "brushEdge":
      targetLabel = "whitebox edge";
      break;
    case "brushVertex":
      targetLabel = "whitebox vertex";
      break;
    case "pathPoint":
      targetLabel = "path point";
      break;
    case "entity":
      targetLabel =
        session.target.entityKind === "playerStart"
          ? "player start"
          : session.target.entityKind === "npc"
            ? "NPC"
            : session.target.entityKind === "pointLight"
              ? "point light"
              : session.target.entityKind === "spotLight"
                ? "spot light"
                : session.target.entityKind === "soundEmitter"
                  ? "sound emitter"
                  : session.target.entityKind === "triggerVolume"
                    ? "trigger volume"
                    : session.target.entityKind === "sceneEntry"
                      ? "scene entry"
                        : session.target.entityKind === "teleportTarget"
                          ? "teleport target"
                          : session.target.entityKind === "interactable"
                            ? "interactable"
                            : "entity";
      break;
    case "entities":
      targetLabel =
        session.target.items.length === 1
          ? "entity"
          : `${session.target.items.length} entities`;
      break;
    case "modelInstance":
      break;
    case "modelInstances":
      targetLabel =
        session.target.items.length === 1
          ? "model instance"
          : `${session.target.items.length} model instances`;
      break;
  }

  return `${getTransformOperationLabel(session.operation)} ${targetLabel}`;
}

function createUpdatedEntityFromPreview(
  entity: SceneDocument["entities"][string],
  preview: {
    position: { x: number; y: number; z: number };
    rotation:
      | { kind: "none" }
      | { kind: "yaw"; yawDegrees: number }
      | { kind: "direction"; direction: { x: number; y: number; z: number } };
  }
) {
  switch (entity.kind) {
    case "pointLight":
      return createPointLightEntity({
        ...entity,
        position: preview.position
      });
    case "spotLight":
      return createSpotLightEntity({
        ...entity,
        position: preview.position,
        direction:
          preview.rotation.kind === "direction"
            ? preview.rotation.direction
            : entity.direction
      });
    case "playerStart":
      return createPlayerStartEntity({
        ...entity,
        position: preview.position,
        yawDegrees:
          preview.rotation.kind === "yaw"
            ? preview.rotation.yawDegrees
            : entity.yawDegrees
      });
    case "sceneEntry":
      return createSceneEntryEntity({
        ...entity,
        position: preview.position,
        yawDegrees:
          preview.rotation.kind === "yaw"
            ? preview.rotation.yawDegrees
            : entity.yawDegrees
      });
    case "npc":
      return createNpcEntity({
        ...entity,
        position: preview.position,
        yawDegrees:
          preview.rotation.kind === "yaw"
            ? preview.rotation.yawDegrees
            : entity.yawDegrees
      });
    case "soundEmitter":
      return createSoundEmitterEntity({
        ...entity,
        position: preview.position
      });
    case "triggerVolume":
      return createTriggerVolumeEntity({
        ...entity,
        position: preview.position
      });
    case "teleportTarget":
      return createTeleportTargetEntity({
        ...entity,
        position: preview.position,
        yawDegrees:
          preview.rotation.kind === "yaw"
            ? preview.rotation.yawDegrees
            : entity.yawDegrees
      });
    case "interactable":
      return createInteractableEntity({
        ...entity,
        position: preview.position
      });
  }
}

export function createCommitTransformSessionCommand(document: SceneDocument, session: ActiveTransformSession): EditorCommand {
  switch (session.target.kind) {
    case "brush":
      if (session.preview.kind !== "brush") {
        throw new Error("Brush transform preview is invalid.");
      }

      switch (session.operation) {
        case "translate":
          return createMoveBoxBrushCommand({
            brushId: session.target.brushId,
            center: session.preview.center,
            snapToGrid: false,
            label: createTransformCommandLabel(session)
          });
        case "rotate":
          return createRotateBoxBrushCommand({
            brushId: session.target.brushId,
            rotationDegrees: session.preview.rotationDegrees,
            label: createTransformCommandLabel(session)
          });
        case "scale":
          return createResizeBoxBrushCommand({
            brushId: session.target.brushId,
            size: session.preview.size,
            snapToGrid: false,
            label: createTransformCommandLabel(session)
          });
      }
    case "brushFace":
      if (session.preview.kind !== "brush") {
        throw new Error("Whitebox face transform preview is invalid.");
      }

      return createSetBoxBrushTransformCommand({
        selection: {
          kind: "brushFace",
          brushId: session.target.brushId,
          faceId: session.target.faceId
        },
        center: session.preview.center,
        rotationDegrees: session.preview.rotationDegrees,
        size: session.preview.size,
        geometry: session.preview.geometry,
        label: createTransformCommandLabel(session)
      });
    case "brushEdge":
      if (session.preview.kind !== "brush") {
        throw new Error("Whitebox edge transform preview is invalid.");
      }

      return createSetBoxBrushTransformCommand({
        selection: {
          kind: "brushEdge",
          brushId: session.target.brushId,
          edgeId: session.target.edgeId
        },
        center: session.preview.center,
        rotationDegrees: session.preview.rotationDegrees,
        size: session.preview.size,
        geometry: session.preview.geometry,
        label: createTransformCommandLabel(session)
      });
    case "brushVertex":
      if (session.preview.kind !== "brush") {
        throw new Error("Whitebox vertex transform preview is invalid.");
      }

      return createSetBoxBrushTransformCommand({
        selection: {
          kind: "brushVertex",
          brushId: session.target.brushId,
          vertexId: session.target.vertexId
        },
        center: session.preview.center,
        rotationDegrees: session.preview.rotationDegrees,
        size: session.preview.size,
        geometry: session.preview.geometry,
        label: createTransformCommandLabel(session)
      });
    case "pathPoint":
      if (session.preview.kind !== "pathPoint") {
        throw new Error("Path point transform preview is invalid.");
      }

      return createSetPathPointPositionCommand({
        pathId: session.target.pathId,
        pointId: session.target.pointId,
        position: session.preview.position,
        label: createTransformCommandLabel(session)
      });
    case "modelInstance": {
      if (session.preview.kind !== "modelInstance") {
        throw new Error("Model instance transform preview is invalid.");
      }

      const modelInstance = document.modelInstances[session.target.modelInstanceId];

      if (modelInstance === undefined) {
        throw new Error(`Model instance ${session.target.modelInstanceId} does not exist.`);
      }

      return createUpsertModelInstanceCommand({
        modelInstance: createModelInstance({
          ...modelInstance,
          position: session.preview.position,
          rotationDegrees: session.preview.rotationDegrees,
          scale: session.preview.scale
        }),
        label: createTransformCommandLabel(session)
      });
    }
    case "entity": {
      if (session.preview.kind !== "entity") {
        throw new Error("Entity transform preview is invalid.");
      }

      const entity = document.entities[session.target.entityId];

      if (entity === undefined) {
        throw new Error(`Entity ${session.target.entityId} does not exist.`);
      }

      switch (entity.kind) {
        case "pointLight":
          return createUpsertEntityCommand({
            entity: createPointLightEntity({
              ...entity,
              position: session.preview.position
            }),
            label: createTransformCommandLabel(session)
          });
        case "spotLight":
          return createUpsertEntityCommand({
            entity: createSpotLightEntity({
              ...entity,
              position: session.preview.position,
              direction: session.preview.rotation.kind === "direction" ? session.preview.rotation.direction : entity.direction
            }),
            label: createTransformCommandLabel(session)
          });
        case "playerStart":
          return createUpsertEntityCommand({
            entity: createPlayerStartEntity({
              ...entity,
              position: session.preview.position,
              yawDegrees: session.preview.rotation.kind === "yaw" ? session.preview.rotation.yawDegrees : entity.yawDegrees
            }),
            label: createTransformCommandLabel(session)
          });
        case "sceneEntry":
          return createUpsertEntityCommand({
            entity: createSceneEntryEntity({
              ...entity,
              position: session.preview.position,
              yawDegrees:
                session.preview.rotation.kind === "yaw"
                  ? session.preview.rotation.yawDegrees
                  : entity.yawDegrees
            }),
            label: createTransformCommandLabel(session)
          });
        case "npc":
          return createUpsertEntityCommand({
            entity: createNpcEntity({
              ...entity,
              position: session.preview.position,
              yawDegrees:
                session.preview.rotation.kind === "yaw"
                  ? session.preview.rotation.yawDegrees
                  : entity.yawDegrees
            }),
            label: createTransformCommandLabel(session)
          });
        case "soundEmitter":
          return createUpsertEntityCommand({
            entity: createSoundEmitterEntity({
              ...entity,
              position: session.preview.position
            }),
            label: createTransformCommandLabel(session)
          });
        case "triggerVolume":
          return createUpsertEntityCommand({
            entity: createTriggerVolumeEntity({
              ...entity,
              position: session.preview.position
            }),
            label: createTransformCommandLabel(session)
          });
        case "teleportTarget":
          return createUpsertEntityCommand({
            entity: createTeleportTargetEntity({
              ...entity,
              position: session.preview.position,
              yawDegrees: session.preview.rotation.kind === "yaw" ? session.preview.rotation.yawDegrees : entity.yawDegrees
            }),
            label: createTransformCommandLabel(session)
          });
        case "interactable":
          return createUpsertEntityCommand({
            entity: createInteractableEntity({
              ...entity,
              position: session.preview.position
            }),
            label: createTransformCommandLabel(session)
          });
      }
    }
  }
}
