import { createMoveBoxBrushCommand } from "./move-box-brush-command";
import { createResizeBoxBrushCommand } from "./resize-box-brush-command";
import { createRotateBoxBrushCommand } from "./rotate-box-brush-command";
import { createSetBoxBrushTransformCommand } from "./set-box-brush-transform-command";
import { createUpsertEntityCommand } from "./upsert-entity-command";
import { createUpsertModelInstanceCommand } from "./upsert-model-instance-command";
import { createModelInstance } from "../assets/model-instances";
import { createInteractableEntity, createPlayerStartEntity, createPointLightEntity, createSoundEmitterEntity, createSpotLightEntity, createTeleportTargetEntity, createTriggerVolumeEntity } from "../entities/entity-instances";
import { getTransformOperationLabel } from "../core/transform-session";
function createTransformCommandLabel(session) {
    return `${getTransformOperationLabel(session.operation)} ${session.target.kind === "brush"
        ? "whitebox box"
        : session.target.kind === "brushFace"
            ? "whitebox face"
            : session.target.kind === "brushEdge"
                ? "whitebox edge"
                : session.target.kind === "brushVertex"
                    ? "whitebox vertex"
                    : session.target.kind === "entity"
                        ? session.target.entityKind === "playerStart"
                            ? "player start"
                            : session.target.entityKind === "pointLight"
                                ? "point light"
                                : session.target.entityKind === "spotLight"
                                    ? "spot light"
                                    : session.target.entityKind === "soundEmitter"
                                        ? "sound emitter"
                                        : session.target.entityKind === "triggerVolume"
                                            ? "trigger volume"
                                            : session.target.entityKind === "teleportTarget"
                                                ? "teleport target"
                                                : "interactable"
                        : "model instance"}`;
}
export function createCommitTransformSessionCommand(document, session) {
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
