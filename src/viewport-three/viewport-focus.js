import { getSingleSelectedBrushId, getSingleSelectedEntityId, getSingleSelectedModelInstanceId } from "../core/selection";
import { getBoxBrushBounds } from "../geometry/box-brush";
const PLAYER_START_FOCUS_HALF_EXTENTS = {
    x: 0.35,
    y: 0.3,
    z: 0.55
};
const TELEPORT_TARGET_FOCUS_HALF_EXTENTS = {
    x: 0.42,
    y: 0.28,
    z: 0.42
};
function createEmptyBoundsAccumulator() {
    return {
        min: {
            x: Number.POSITIVE_INFINITY,
            y: Number.POSITIVE_INFINITY,
            z: Number.POSITIVE_INFINITY
        },
        max: {
            x: Number.NEGATIVE_INFINITY,
            y: Number.NEGATIVE_INFINITY,
            z: Number.NEGATIVE_INFINITY
        }
    };
}
function includeBounds(bounds, min, max) {
    bounds.min.x = Math.min(bounds.min.x, min.x);
    bounds.min.y = Math.min(bounds.min.y, min.y);
    bounds.min.z = Math.min(bounds.min.z, min.z);
    bounds.max.x = Math.max(bounds.max.x, max.x);
    bounds.max.y = Math.max(bounds.max.y, max.y);
    bounds.max.z = Math.max(bounds.max.z, max.z);
}
function finishBounds(bounds) {
    if (!Number.isFinite(bounds.min.x) || !Number.isFinite(bounds.max.x)) {
        return null;
    }
    const center = {
        x: (bounds.min.x + bounds.max.x) * 0.5,
        y: (bounds.min.y + bounds.max.y) * 0.5,
        z: (bounds.min.z + bounds.max.z) * 0.5
    };
    const radius = Math.max(0.5, Math.hypot(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y, bounds.max.z - bounds.min.z) * 0.5);
    return {
        center,
        radius
    };
}
function createBrushFocusTarget(brush) {
    return {
        center: {
            ...brush.center
        },
        radius: Math.max(0.5, Math.hypot(brush.size.x, brush.size.y, brush.size.z) * 0.5)
    };
}
function includeBrush(bounds, brush) {
    const brushBounds = getBoxBrushBounds(brush);
    includeBounds(bounds, brushBounds.min, brushBounds.max);
}
function includePlayerStart(bounds, position) {
    includeBounds(bounds, {
        x: position.x - PLAYER_START_FOCUS_HALF_EXTENTS.x,
        y: position.y,
        z: position.z - PLAYER_START_FOCUS_HALF_EXTENTS.z
    }, {
        x: position.x + PLAYER_START_FOCUS_HALF_EXTENTS.x,
        y: position.y + PLAYER_START_FOCUS_HALF_EXTENTS.y * 2,
        z: position.z + PLAYER_START_FOCUS_HALF_EXTENTS.z
    });
}
function createBoundsFocusTarget(center, halfExtents, minimumRadius) {
    return {
        center,
        radius: Math.max(minimumRadius, Math.hypot(halfExtents.x, halfExtents.y, halfExtents.z))
    };
}
function createPlayerStartFocusTarget(position) {
    return createBoundsFocusTarget({
        x: position.x,
        y: position.y + PLAYER_START_FOCUS_HALF_EXTENTS.y,
        z: position.z
    }, PLAYER_START_FOCUS_HALF_EXTENTS, 0.45);
}
function includeTeleportTarget(bounds, position) {
    includeBounds(bounds, {
        x: position.x - TELEPORT_TARGET_FOCUS_HALF_EXTENTS.x,
        y: position.y,
        z: position.z - TELEPORT_TARGET_FOCUS_HALF_EXTENTS.z
    }, {
        x: position.x + TELEPORT_TARGET_FOCUS_HALF_EXTENTS.x,
        y: position.y + TELEPORT_TARGET_FOCUS_HALF_EXTENTS.y * 2,
        z: position.z + TELEPORT_TARGET_FOCUS_HALF_EXTENTS.z
    });
}
function createTeleportTargetFocusTarget(position) {
    return createBoundsFocusTarget({
        x: position.x,
        y: position.y + TELEPORT_TARGET_FOCUS_HALF_EXTENTS.y,
        z: position.z
    }, TELEPORT_TARGET_FOCUS_HALF_EXTENTS, 0.45);
}
function getModelInstanceBoundingBox(modelInstance, asset) {
    if (asset?.kind === "model" && asset.metadata.boundingBox !== null) {
        const boundingBox = asset.metadata.boundingBox;
        const scaledMin = {
            x: boundingBox.min.x * modelInstance.scale.x,
            y: boundingBox.min.y * modelInstance.scale.y,
            z: boundingBox.min.z * modelInstance.scale.z
        };
        const scaledMax = {
            x: boundingBox.max.x * modelInstance.scale.x,
            y: boundingBox.max.y * modelInstance.scale.y,
            z: boundingBox.max.z * modelInstance.scale.z
        };
        return {
            center: {
                x: modelInstance.position.x + (scaledMin.x + scaledMax.x) * 0.5,
                y: modelInstance.position.y + (scaledMin.y + scaledMax.y) * 0.5,
                z: modelInstance.position.z + (scaledMin.z + scaledMax.z) * 0.5
            },
            size: {
                x: Math.abs(scaledMax.x - scaledMin.x),
                y: Math.abs(scaledMax.y - scaledMin.y),
                z: Math.abs(scaledMax.z - scaledMin.z)
            }
        };
    }
    return {
        center: {
            ...modelInstance.position
        },
        size: {
            x: modelInstance.scale.x,
            y: modelInstance.scale.y,
            z: modelInstance.scale.z
        }
    };
}
function includeModelInstance(bounds, modelInstance, asset) {
    const modelBounds = getModelInstanceBoundingBox(modelInstance, asset);
    const halfSize = {
        x: modelBounds.size.x * 0.5,
        y: modelBounds.size.y * 0.5,
        z: modelBounds.size.z * 0.5
    };
    includeBounds(bounds, {
        x: modelBounds.center.x - halfSize.x,
        y: modelBounds.center.y - halfSize.y,
        z: modelBounds.center.z - halfSize.z
    }, {
        x: modelBounds.center.x + halfSize.x,
        y: modelBounds.center.y + halfSize.y,
        z: modelBounds.center.z + halfSize.z
    });
}
function createModelInstanceFocusTarget(modelInstance, asset) {
    const modelBounds = getModelInstanceBoundingBox(modelInstance, asset);
    return createBoundsFocusTarget(modelBounds.center, {
        x: modelBounds.size.x * 0.5,
        y: modelBounds.size.y * 0.5,
        z: modelBounds.size.z * 0.5
    }, 0.5);
}
function includeSphereEntity(bounds, position, radius) {
    includeBounds(bounds, {
        x: position.x - radius,
        y: position.y - radius,
        z: position.z - radius
    }, {
        x: position.x + radius,
        y: position.y + radius,
        z: position.z + radius
    });
}
function createSphereEntityFocusTarget(position, radius, minimumRadius) {
    return {
        center: {
            x: position.x,
            y: position.y,
            z: position.z
        },
        radius: Math.max(minimumRadius, radius)
    };
}
function includeTriggerVolume(bounds, position, size) {
    const halfSize = {
        x: size.x * 0.5,
        y: size.y * 0.5,
        z: size.z * 0.5
    };
    includeBounds(bounds, {
        x: position.x - halfSize.x,
        y: position.y - halfSize.y,
        z: position.z - halfSize.z
    }, {
        x: position.x + halfSize.x,
        y: position.y + halfSize.y,
        z: position.z + halfSize.z
    });
}
function createTriggerVolumeFocusTarget(position, size) {
    const halfSize = {
        x: size.x * 0.5,
        y: size.y * 0.5,
        z: size.z * 0.5
    };
    return createBoundsFocusTarget({
        x: position.x,
        y: position.y,
        z: position.z
    }, halfSize, 0.75);
}
function includeEntity(bounds, entity) {
    switch (entity.kind) {
        case "pointLight":
            includeSphereEntity(bounds, entity.position, Math.max(0.5, entity.distance));
            break;
        case "spotLight":
            includeSphereEntity(bounds, entity.position, Math.max(0.75, entity.distance));
            break;
        case "playerStart":
            includePlayerStart(bounds, entity.position);
            break;
        case "soundEmitter":
            includeSphereEntity(bounds, entity.position, Math.max(0.4, entity.maxDistance));
            break;
        case "triggerVolume":
            includeTriggerVolume(bounds, entity.position, entity.size);
            break;
        case "teleportTarget":
            includeTeleportTarget(bounds, entity.position);
            break;
        case "interactable":
            includeSphereEntity(bounds, entity.position, Math.max(0.4, entity.radius));
            break;
    }
}
function createEntityFocusTarget(entity) {
    switch (entity.kind) {
        case "pointLight":
            return createSphereEntityFocusTarget(entity.position, Math.max(0.6, entity.distance), 0.75);
        case "spotLight":
            return createSphereEntityFocusTarget(entity.position, Math.max(0.8, entity.distance), 0.9);
        case "playerStart":
            return createPlayerStartFocusTarget(entity.position);
        case "soundEmitter":
            return createSphereEntityFocusTarget(entity.position, entity.maxDistance, 0.75);
        case "triggerVolume":
            return createTriggerVolumeFocusTarget(entity.position, entity.size);
        case "teleportTarget":
            return createTeleportTargetFocusTarget(entity.position);
        case "interactable":
            return createSphereEntityFocusTarget(entity.position, entity.radius, 0.65);
    }
}
function getSceneFocusTarget(document) {
    const bounds = createEmptyBoundsAccumulator();
    for (const brush of Object.values(document.brushes)) {
        includeBrush(bounds, brush);
    }
    for (const modelInstance of Object.values(document.modelInstances)) {
        includeModelInstance(bounds, modelInstance, document.assets[modelInstance.assetId]);
    }
    for (const entity of Object.values(document.entities)) {
        includeEntity(bounds, entity);
    }
    return finishBounds(bounds);
}
export function resolveViewportFocusTarget(document, selection) {
    const selectedBrushId = getSingleSelectedBrushId(selection);
    if (selectedBrushId !== null) {
        const brush = document.brushes[selectedBrushId];
        if (brush !== undefined && brush.kind === "box") {
            return createBrushFocusTarget(brush);
        }
    }
    const selectedEntityId = getSingleSelectedEntityId(selection);
    if (selectedEntityId !== null) {
        const entity = document.entities[selectedEntityId];
        if (entity !== undefined) {
            return createEntityFocusTarget(entity);
        }
    }
    const selectedModelInstanceId = getSingleSelectedModelInstanceId(selection);
    if (selectedModelInstanceId !== null) {
        const modelInstance = document.modelInstances[selectedModelInstanceId];
        if (modelInstance !== undefined) {
            return createModelInstanceFocusTarget(modelInstance, document.assets[modelInstance.assetId]);
        }
    }
    return getSceneFocusTarget(document);
}
