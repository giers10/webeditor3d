import { createOpaqueId } from "../core/ids";
export const MODEL_INSTANCE_COLLISION_MODES = ["none", "terrain", "static", "dynamic", "simple"];
export const DEFAULT_MODEL_INSTANCE_POSITION = {
    x: 0,
    y: 0,
    z: 0
};
export const DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES = {
    x: 0,
    y: 0,
    z: 0
};
export const DEFAULT_MODEL_INSTANCE_SCALE = {
    x: 1,
    y: 1,
    z: 1
};
export const DEFAULT_MODEL_INSTANCE_COLLISION_SETTINGS = {
    mode: "none",
    visible: false
};
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
export function isModelInstanceCollisionMode(value) {
    return MODEL_INSTANCE_COLLISION_MODES.includes(value);
}
export function createModelInstanceCollisionSettings(overrides = {}) {
    const mode = overrides.mode ?? DEFAULT_MODEL_INSTANCE_COLLISION_SETTINGS.mode;
    if (!isModelInstanceCollisionMode(mode)) {
        throw new Error("Model instance collision mode must be a supported value.");
    }
    const visible = overrides.visible ?? DEFAULT_MODEL_INSTANCE_COLLISION_SETTINGS.visible;
    if (typeof visible !== "boolean") {
        throw new Error("Model instance collision visibility must be a boolean.");
    }
    return {
        mode,
        visible
    };
}
export function cloneModelInstanceCollisionSettings(settings) {
    return createModelInstanceCollisionSettings(settings);
}
export function areModelInstanceCollisionSettingsEqual(left, right) {
    return left.mode === right.mode && left.visible === right.visible;
}
export function normalizeModelInstanceName(name) {
    if (name === undefined || name === null) {
        return undefined;
    }
    const trimmedName = name.trim();
    return trimmedName.length === 0 ? undefined : trimmedName;
}
function assertFiniteVec3(vector, label) {
    if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z)) {
        throw new Error(`${label} must be finite on every axis.`);
    }
}
function assertPositiveFiniteVec3(vector, label) {
    assertFiniteVec3(vector, label);
    if (vector.x <= 0 || vector.y <= 0 || vector.z <= 0) {
        throw new Error(`${label} must remain positive on every axis.`);
    }
}
export function createModelInstance(overrides) {
    const position = cloneVec3(overrides.position ?? DEFAULT_MODEL_INSTANCE_POSITION);
    const rotationDegrees = cloneVec3(overrides.rotationDegrees ?? DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES);
    const scale = cloneVec3(overrides.scale ?? DEFAULT_MODEL_INSTANCE_SCALE);
    const collision = cloneModelInstanceCollisionSettings(overrides.collision ?? DEFAULT_MODEL_INSTANCE_COLLISION_SETTINGS);
    if (overrides.assetId.trim().length === 0) {
        throw new Error("Model instance assetId must be a non-empty string.");
    }
    assertFiniteVec3(position, "Model instance position");
    assertFiniteVec3(rotationDegrees, "Model instance rotation");
    assertPositiveFiniteVec3(scale, "Model instance scale");
    return {
        id: overrides.id ?? createOpaqueId("model-instance"),
        kind: "modelInstance",
        assetId: overrides.assetId,
        name: normalizeModelInstanceName(overrides.name),
        position,
        rotationDegrees,
        scale,
        collision,
        animationClipName: overrides.animationClipName,
        animationAutoplay: overrides.animationAutoplay
    };
}
export function createModelInstancePlacementPosition(asset, anchor) {
    const boundingBox = asset?.metadata.boundingBox;
    if (anchor !== null) {
        const floorOffset = boundingBox === null || boundingBox === undefined ? 0 : -boundingBox.min.y;
        return {
            x: anchor.x,
            y: anchor.y + floorOffset,
            z: anchor.z
        };
    }
    return {
        x: DEFAULT_MODEL_INSTANCE_POSITION.x,
        y: boundingBox === null || boundingBox === undefined ? DEFAULT_MODEL_INSTANCE_POSITION.y : Math.max(DEFAULT_MODEL_INSTANCE_POSITION.y, -boundingBox.min.y),
        z: DEFAULT_MODEL_INSTANCE_POSITION.z
    };
}
export function cloneModelInstance(instance) {
    return createModelInstance(instance);
}
export function areModelInstancesEqual(left, right) {
    return (left.id === right.id &&
        left.kind === right.kind &&
        left.assetId === right.assetId &&
        left.name === right.name &&
        areVec3Equal(left.position, right.position) &&
        areVec3Equal(left.rotationDegrees, right.rotationDegrees) &&
        areVec3Equal(left.scale, right.scale) &&
        areModelInstanceCollisionSettingsEqual(left.collision, right.collision) &&
        left.animationClipName === right.animationClipName &&
        left.animationAutoplay === right.animationAutoplay);
}
export function compareModelInstances(left, right) {
    if (left.assetId !== right.assetId) {
        return left.assetId.localeCompare(right.assetId);
    }
    const leftName = left.name ?? "";
    const rightName = right.name ?? "";
    if (leftName !== rightName) {
        return leftName.localeCompare(rightName);
    }
    return left.id.localeCompare(right.id);
}
export function getModelInstances(modelInstances) {
    return Object.values(modelInstances).sort(compareModelInstances);
}
export function getModelInstanceKindLabel() {
    return "Model Instance";
}
