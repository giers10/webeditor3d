import { createOpaqueId } from "./ids";
import { BOX_EDGE_LABELS, BOX_FACE_LABELS, BOX_VERTEX_LABELS } from "../document/brushes";
import { cloneEntityInstance, getEntityKindLabel } from "../entities/entity-instances";
import { cloneModelInstance, getModelInstanceKindLabel } from "../assets/model-instances";
function cloneVec3(vector) {
    return {
        x: vector.x,
        y: vector.y,
        z: vector.z
    };
}
function areVec3Equal(left, right) {
    return left.x === right.x && left.y === right.y && left.z === right.z;
}
function cloneEntityTransformRotationState(rotation) {
    switch (rotation.kind) {
        case "none":
            return {
                kind: "none"
            };
        case "yaw":
            return {
                kind: "yaw",
                yawDegrees: rotation.yawDegrees
            };
        case "direction":
            return {
                kind: "direction",
                direction: cloneVec3(rotation.direction)
            };
    }
}
function areEntityTransformRotationsEqual(left, right) {
    if (left.kind !== right.kind) {
        return false;
    }
    switch (left.kind) {
        case "none":
            return true;
        case "yaw":
            return right.kind === "yaw" && left.yawDegrees === right.yawDegrees;
        case "direction":
            return right.kind === "direction" && areVec3Equal(left.direction, right.direction);
    }
}
export function createInactiveTransformSession() {
    return {
        kind: "none"
    };
}
export function cloneTransformTarget(target) {
    switch (target.kind) {
        case "brush":
            return {
                kind: "brush",
                brushId: target.brushId,
                initialCenter: cloneVec3(target.initialCenter),
                initialRotationDegrees: cloneVec3(target.initialRotationDegrees),
                initialSize: cloneVec3(target.initialSize)
            };
        case "brushFace":
            return {
                kind: "brushFace",
                brushId: target.brushId,
                faceId: target.faceId,
                initialCenter: cloneVec3(target.initialCenter),
                initialRotationDegrees: cloneVec3(target.initialRotationDegrees),
                initialSize: cloneVec3(target.initialSize)
            };
        case "brushEdge":
            return {
                kind: "brushEdge",
                brushId: target.brushId,
                edgeId: target.edgeId,
                initialCenter: cloneVec3(target.initialCenter),
                initialRotationDegrees: cloneVec3(target.initialRotationDegrees),
                initialSize: cloneVec3(target.initialSize)
            };
        case "brushVertex":
            return {
                kind: "brushVertex",
                brushId: target.brushId,
                vertexId: target.vertexId,
                initialCenter: cloneVec3(target.initialCenter),
                initialRotationDegrees: cloneVec3(target.initialRotationDegrees),
                initialSize: cloneVec3(target.initialSize)
            };
        case "modelInstance":
            return {
                kind: "modelInstance",
                modelInstanceId: target.modelInstanceId,
                assetId: target.assetId,
                initialPosition: cloneVec3(target.initialPosition),
                initialRotationDegrees: cloneVec3(target.initialRotationDegrees),
                initialScale: cloneVec3(target.initialScale)
            };
        case "entity":
            return {
                kind: "entity",
                entityId: target.entityId,
                entityKind: target.entityKind,
                initialPosition: cloneVec3(target.initialPosition),
                initialRotation: cloneEntityTransformRotationState(target.initialRotation)
            };
    }
}
export function cloneTransformPreview(preview) {
    switch (preview.kind) {
        case "brush":
            return {
                kind: "brush",
                center: cloneVec3(preview.center),
                rotationDegrees: cloneVec3(preview.rotationDegrees),
                size: cloneVec3(preview.size)
            };
        case "modelInstance":
            return {
                kind: "modelInstance",
                position: cloneVec3(preview.position),
                rotationDegrees: cloneVec3(preview.rotationDegrees),
                scale: cloneVec3(preview.scale)
            };
        case "entity":
            return {
                kind: "entity",
                position: cloneVec3(preview.position),
                rotation: cloneEntityTransformRotationState(preview.rotation)
            };
    }
}
export function cloneTransformSession(session) {
    if (session.kind === "none") {
        return session;
    }
    return {
        kind: "active",
        id: session.id,
        source: session.source,
        sourcePanelId: session.sourcePanelId,
        operation: session.operation,
        axisConstraint: session.axisConstraint,
        target: cloneTransformTarget(session.target),
        preview: cloneTransformPreview(session.preview)
    };
}
export function areTransformSessionsEqual(left, right) {
    if (left.kind !== right.kind) {
        return false;
    }
    if (left.kind === "none" || right.kind === "none") {
        return true;
    }
    return (left.id === right.id &&
        left.source === right.source &&
        left.sourcePanelId === right.sourcePanelId &&
        left.operation === right.operation &&
        left.axisConstraint === right.axisConstraint &&
        areTransformTargetsEqual(left.target, right.target) &&
        areTransformPreviewsEqual(left.preview, right.preview));
}
function areTransformTargetsEqual(left, right) {
    if (left.kind !== right.kind) {
        return false;
    }
    switch (left.kind) {
        case "brush":
            return (right.kind === "brush" &&
                left.brushId === right.brushId &&
                areVec3Equal(left.initialCenter, right.initialCenter) &&
                areVec3Equal(left.initialRotationDegrees, right.initialRotationDegrees) &&
                areVec3Equal(left.initialSize, right.initialSize));
        case "brushFace":
            return (right.kind === "brushFace" &&
                left.brushId === right.brushId &&
                left.faceId === right.faceId &&
                areVec3Equal(left.initialCenter, right.initialCenter) &&
                areVec3Equal(left.initialRotationDegrees, right.initialRotationDegrees) &&
                areVec3Equal(left.initialSize, right.initialSize));
        case "brushEdge":
            return (right.kind === "brushEdge" &&
                left.brushId === right.brushId &&
                left.edgeId === right.edgeId &&
                areVec3Equal(left.initialCenter, right.initialCenter) &&
                areVec3Equal(left.initialRotationDegrees, right.initialRotationDegrees) &&
                areVec3Equal(left.initialSize, right.initialSize));
        case "brushVertex":
            return (right.kind === "brushVertex" &&
                left.brushId === right.brushId &&
                left.vertexId === right.vertexId &&
                areVec3Equal(left.initialCenter, right.initialCenter) &&
                areVec3Equal(left.initialRotationDegrees, right.initialRotationDegrees) &&
                areVec3Equal(left.initialSize, right.initialSize));
        case "modelInstance":
            return (right.kind === "modelInstance" &&
                left.modelInstanceId === right.modelInstanceId &&
                left.assetId === right.assetId &&
                areVec3Equal(left.initialPosition, right.initialPosition) &&
                areVec3Equal(left.initialRotationDegrees, right.initialRotationDegrees) &&
                areVec3Equal(left.initialScale, right.initialScale));
        case "entity":
            return (right.kind === "entity" &&
                left.entityId === right.entityId &&
                left.entityKind === right.entityKind &&
                areVec3Equal(left.initialPosition, right.initialPosition) &&
                areEntityTransformRotationsEqual(left.initialRotation, right.initialRotation));
    }
}
function areTransformPreviewsEqual(left, right) {
    if (left.kind !== right.kind) {
        return false;
    }
    switch (left.kind) {
        case "brush":
            return (right.kind === "brush" &&
                areVec3Equal(left.center, right.center) &&
                areVec3Equal(left.rotationDegrees, right.rotationDegrees) &&
                areVec3Equal(left.size, right.size));
        case "modelInstance":
            return (right.kind === "modelInstance" &&
                areVec3Equal(left.position, right.position) &&
                areVec3Equal(left.rotationDegrees, right.rotationDegrees) &&
                areVec3Equal(left.scale, right.scale));
        case "entity":
            return right.kind === "entity" && areVec3Equal(left.position, right.position) && areEntityTransformRotationsEqual(left.rotation, right.rotation);
    }
}
export function createTransformSession(options) {
    return {
        kind: "active",
        id: createOpaqueId("transform-session"),
        source: options.source,
        sourcePanelId: options.sourcePanelId,
        operation: options.operation,
        axisConstraint: options.axisConstraint ?? null,
        target: cloneTransformTarget(options.target),
        preview: createTransformPreviewFromTarget(options.target)
    };
}
export function createTransformPreviewFromTarget(target) {
    switch (target.kind) {
        case "brush":
        case "brushFace":
        case "brushEdge":
        case "brushVertex":
            return {
                kind: "brush",
                center: cloneVec3(target.initialCenter),
                rotationDegrees: cloneVec3(target.initialRotationDegrees),
                size: cloneVec3(target.initialSize)
            };
        case "modelInstance":
            return {
                kind: "modelInstance",
                position: cloneVec3(target.initialPosition),
                rotationDegrees: cloneVec3(target.initialRotationDegrees),
                scale: cloneVec3(target.initialScale)
            };
        case "entity":
            return {
                kind: "entity",
                position: cloneVec3(target.initialPosition),
                rotation: cloneEntityTransformRotationState(target.initialRotation)
            };
    }
}
export function doesTransformSessionChangeTarget(session) {
    switch (session.target.kind) {
        case "brush":
        case "brushFace":
        case "brushEdge":
        case "brushVertex":
            return (session.preview.kind === "brush" &&
                (!areVec3Equal(session.preview.center, session.target.initialCenter) ||
                    !areVec3Equal(session.preview.rotationDegrees, session.target.initialRotationDegrees) ||
                    !areVec3Equal(session.preview.size, session.target.initialSize)));
        case "modelInstance":
            return (session.preview.kind === "modelInstance" &&
                (!areVec3Equal(session.preview.position, session.target.initialPosition) ||
                    !areVec3Equal(session.preview.rotationDegrees, session.target.initialRotationDegrees) ||
                    !areVec3Equal(session.preview.scale, session.target.initialScale)));
        case "entity":
            return (session.preview.kind === "entity" &&
                (!areVec3Equal(session.preview.position, session.target.initialPosition) ||
                    !areEntityTransformRotationsEqual(session.preview.rotation, session.target.initialRotation)));
    }
}
export function getTransformOperationLabel(operation) {
    switch (operation) {
        case "translate":
            return "Move";
        case "rotate":
            return "Rotate";
        case "scale":
            return "Scale";
    }
}
export function getTransformAxisLabel(axis) {
    return axis.toUpperCase();
}
export function getTransformTargetLabel(target) {
    switch (target.kind) {
        case "brush":
            return "Whitebox Box";
        case "brushFace":
            return `Whitebox Face (${BOX_FACE_LABELS[target.faceId]})`;
        case "brushEdge":
            return `Whitebox Edge (${BOX_EDGE_LABELS[target.edgeId]})`;
        case "brushVertex":
            return `Whitebox Vertex (${BOX_VERTEX_LABELS[target.vertexId]})`;
        case "modelInstance":
            return getModelInstanceKindLabel();
        case "entity":
            return getEntityKindLabel(target.entityKind);
    }
}
export function getSupportedTransformOperations(target) {
    switch (target.kind) {
        case "brush":
        case "brushFace":
        case "brushEdge":
            return ["translate", "rotate", "scale"];
        case "brushVertex":
            return ["translate"];
        case "modelInstance":
            return ["translate", "rotate", "scale"];
        case "entity":
            return target.initialRotation.kind === "none" ? ["translate"] : ["translate", "rotate"];
    }
}
export function supportsTransformOperation(target, operation) {
    return getSupportedTransformOperations(target).includes(operation);
}
export function supportsTransformAxisConstraint(session, axis) {
    switch (session.operation) {
        case "translate":
            return true;
        case "scale":
            if (session.target.kind === "modelInstance" || session.target.kind === "brush" || session.target.kind === "brushVertex") {
                return session.target.kind !== "brushVertex";
            }
            if (session.target.kind === "brushFace") {
                const normalAxis = session.target.faceId === "posX" || session.target.faceId === "negX" ? "x" : session.target.faceId === "posY" || session.target.faceId === "negY" ? "y" : "z";
                return axis === normalAxis;
            }
            if (session.target.kind === "brushEdge") {
                if (session.target.edgeId.startsWith("edgeX_")) {
                    return axis !== "x";
                }
                if (session.target.edgeId.startsWith("edgeY_")) {
                    return axis !== "y";
                }
                return axis !== "z";
            }
            return false;
        case "rotate":
            if (session.target.kind === "entity" && session.target.initialRotation.kind === "yaw") {
                return axis === "y";
            }
            if (session.target.kind === "brushFace") {
                const normalAxis = session.target.faceId === "posX" || session.target.faceId === "negX" ? "x" : session.target.faceId === "posY" || session.target.faceId === "negY" ? "y" : "z";
                return axis === normalAxis;
            }
            if (session.target.kind === "brushEdge") {
                if (session.target.edgeId.startsWith("edgeX_")) {
                    return axis === "x";
                }
                if (session.target.edgeId.startsWith("edgeY_")) {
                    return axis === "y";
                }
                return axis === "z";
            }
            if (session.target.kind === "brushVertex") {
                return false;
            }
            return true;
    }
}
function resolveEntityRotation(entity) {
    switch (entity.kind) {
        case "playerStart":
        case "teleportTarget":
            return {
                kind: "yaw",
                yawDegrees: entity.yawDegrees
            };
        case "spotLight":
            return {
                kind: "direction",
                direction: cloneVec3(entity.direction)
            };
        case "pointLight":
        case "soundEmitter":
        case "triggerVolume":
        case "interactable":
            return {
                kind: "none"
            };
    }
}
function createBrushTransformTarget(document, brushId) {
    const brush = document.brushes[brushId];
    if (brush === undefined || brush.kind !== "box") {
        return {
            target: null,
            message: "Select a supported whitebox box before transforming it."
        };
    }
    return {
        target: {
            kind: "brush",
            brushId: brush.id,
            initialCenter: cloneVec3(brush.center),
            initialRotationDegrees: cloneVec3(brush.rotationDegrees),
            initialSize: cloneVec3(brush.size)
        },
        message: null
    };
}
function createBrushFaceTransformTarget(document, brushId, faceId) {
    const brushResolution = createBrushTransformTarget(document, brushId);
    if (brushResolution.target === null || brushResolution.target.kind !== "brush") {
        return brushResolution;
    }
    return {
        target: {
            kind: "brushFace",
            brushId,
            faceId,
            initialCenter: cloneVec3(brushResolution.target.initialCenter),
            initialRotationDegrees: cloneVec3(brushResolution.target.initialRotationDegrees),
            initialSize: cloneVec3(brushResolution.target.initialSize)
        },
        message: null
    };
}
function createBrushEdgeTransformTarget(document, brushId, edgeId) {
    const brushResolution = createBrushTransformTarget(document, brushId);
    if (brushResolution.target === null || brushResolution.target.kind !== "brush") {
        return brushResolution;
    }
    return {
        target: {
            kind: "brushEdge",
            brushId,
            edgeId,
            initialCenter: cloneVec3(brushResolution.target.initialCenter),
            initialRotationDegrees: cloneVec3(brushResolution.target.initialRotationDegrees),
            initialSize: cloneVec3(brushResolution.target.initialSize)
        },
        message: null
    };
}
function createBrushVertexTransformTarget(document, brushId, vertexId) {
    const brushResolution = createBrushTransformTarget(document, brushId);
    if (brushResolution.target === null || brushResolution.target.kind !== "brush") {
        return brushResolution;
    }
    return {
        target: {
            kind: "brushVertex",
            brushId,
            vertexId,
            initialCenter: cloneVec3(brushResolution.target.initialCenter),
            initialRotationDegrees: cloneVec3(brushResolution.target.initialRotationDegrees),
            initialSize: cloneVec3(brushResolution.target.initialSize)
        },
        message: null
    };
}
function createEntityTransformTarget(document, entityId) {
    const entity = document.entities[entityId];
    if (entity === undefined) {
        return {
            target: null,
            message: "Select an authored entity before transforming it."
        };
    }
    const clonedEntity = cloneEntityInstance(entity);
    return {
        target: {
            kind: "entity",
            entityId: clonedEntity.id,
            entityKind: clonedEntity.kind,
            initialPosition: cloneVec3(clonedEntity.position),
            initialRotation: resolveEntityRotation(clonedEntity)
        },
        message: null
    };
}
function createModelInstanceTransformTarget(document, modelInstanceId) {
    const modelInstance = document.modelInstances[modelInstanceId];
    if (modelInstance === undefined) {
        return {
            target: null,
            message: "Select a model instance before transforming it."
        };
    }
    const clonedModelInstance = cloneModelInstance(modelInstance);
    return {
        target: {
            kind: "modelInstance",
            modelInstanceId: clonedModelInstance.id,
            assetId: clonedModelInstance.assetId,
            initialPosition: cloneVec3(clonedModelInstance.position),
            initialRotationDegrees: cloneVec3(clonedModelInstance.rotationDegrees),
            initialScale: cloneVec3(clonedModelInstance.scale)
        },
        message: null
    };
}
export function resolveTransformTarget(document, selection, whiteboxSelectionMode = "object") {
    switch (selection.kind) {
        case "none":
            return {
                target: null,
                message: "Select a single brush, entity, or model instance before transforming it."
            };
        case "brushFace":
            if (whiteboxSelectionMode !== "face") {
                return {
                    target: null,
                    message: "Switch to Face mode to transform a selected whitebox face."
                };
            }
            return createBrushFaceTransformTarget(document, selection.brushId, selection.faceId);
        case "brushEdge":
            if (whiteboxSelectionMode !== "edge") {
                return {
                    target: null,
                    message: "Switch to Edge mode to transform a selected whitebox edge."
                };
            }
            return createBrushEdgeTransformTarget(document, selection.brushId, selection.edgeId);
        case "brushVertex":
            if (whiteboxSelectionMode !== "vertex") {
                return {
                    target: null,
                    message: "Switch to Vertex mode to transform a selected whitebox vertex."
                };
            }
            return createBrushVertexTransformTarget(document, selection.brushId, selection.vertexId);
        case "brushes":
            if (whiteboxSelectionMode !== "object") {
                return {
                    target: null,
                    message: "Switch to Object mode to transform the whole whitebox box."
                };
            }
            if (selection.ids.length !== 1) {
                return {
                    target: null,
                    message: "Select a single brush before transforming it."
                };
            }
            return createBrushTransformTarget(document, selection.ids[0]);
        case "entities":
            if (selection.ids.length !== 1) {
                return {
                    target: null,
                    message: "Select a single entity before transforming it."
                };
            }
            return createEntityTransformTarget(document, selection.ids[0]);
        case "modelInstances":
            if (selection.ids.length !== 1) {
                return {
                    target: null,
                    message: "Select a single model instance before transforming it."
                };
            }
            return createModelInstanceTransformTarget(document, selection.ids[0]);
    }
}
