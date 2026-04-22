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
import { updateBrush, type Brush } from "../document/brushes";
import {
  createCameraRigEntity,
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
        session.target.entityKind === "cameraRig"
          ? "camera rig"
          : session.target.entityKind === "playerStart"
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
    case "cameraRig":
      return entity.rigType === "fixed"
        ? createCameraRigEntity({
            ...entity,
            position: preview.position
          })
        : createCameraRigEntity(entity);
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

function createUpdatedBrushFromPreview(
  brush: Brush,
  preview: {
    center: { x: number; y: number; z: number };
    rotationDegrees: { x: number; y: number; z: number };
    size: { x: number; y: number; z: number };
    geometry: Brush["geometry"];
  }
): Brush {
  return updateBrush(brush, {
    center: preview.center,
    rotationDegrees: preview.rotationDegrees,
    size: preview.size,
    geometry: preview.geometry as never
  });
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
    case "brushes":
      if (session.preview.kind !== "brushes") {
        throw new Error("Whitebox multi-transform preview is invalid.");
      }

      return createApplyBatchSelectionTransformCommand({
        selection: {
          kind: "brushes",
          ids: session.target.items.map((item) => item.brushId)
        },
        brushes: session.preview.items.map((item) => {
          const brush = document.brushes[item.brushId];

          if (brush === undefined) {
            throw new Error(`Whitebox solid ${item.brushId} does not exist.`);
          }

          return createUpdatedBrushFromPreview(brush, item);
        }),
        label: createTransformCommandLabel(session)
      });
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
    case "modelInstances":
      if (session.preview.kind !== "modelInstances") {
        throw new Error("Model instance multi-transform preview is invalid.");
      }

      return createApplyBatchSelectionTransformCommand({
        selection: {
          kind: "modelInstances",
          ids: session.target.items.map((item) => item.modelInstanceId)
        },
        modelInstances: session.preview.items.map((item) => {
          const modelInstance = document.modelInstances[item.modelInstanceId];

          if (modelInstance === undefined) {
            throw new Error(
              `Model instance ${item.modelInstanceId} does not exist.`
            );
          }

          return createModelInstance({
            ...modelInstance,
            position: item.position,
            rotationDegrees: item.rotationDegrees,
            scale: item.scale
          });
        }),
        label: createTransformCommandLabel(session)
      });
    case "entity": {
      if (session.preview.kind !== "entity") {
        throw new Error("Entity transform preview is invalid.");
      }

      const entity = document.entities[session.target.entityId];

      if (entity === undefined) {
        throw new Error(`Entity ${session.target.entityId} does not exist.`);
      }

      return createUpsertEntityCommand({
        entity: createUpdatedEntityFromPreview(entity, session.preview),
        label: createTransformCommandLabel(session)
      });
    }
    case "entities":
      if (session.preview.kind !== "entities") {
        throw new Error("Entity multi-transform preview is invalid.");
      }

      return createApplyBatchSelectionTransformCommand({
        selection: {
          kind: "entities",
          ids: session.target.items.map((item) => item.entityId)
        },
        entities: session.preview.items.map((item) => {
          const entity = document.entities[item.entityId];

          if (entity === undefined) {
            throw new Error(`Entity ${item.entityId} does not exist.`);
          }

          return createUpdatedEntityFromPreview(entity, item);
        }),
        label: createTransformCommandLabel(session)
      });
  }
}
