import { createOpaqueId } from "../core/ids";
import { isHexColorString } from "../document/world-settings";
export const PLAYER_START_COLLIDER_MODES = ["capsule", "box", "none"];
export const ENTITY_KIND_ORDER = [
    "pointLight",
    "spotLight",
    "playerStart",
    "soundEmitter",
    "triggerVolume",
    "teleportTarget",
    "interactable"
];
export const DEFAULT_POINT_LIGHT_POSITION = {
    x: 0,
    y: 0,
    z: 0
};
export const DEFAULT_POINT_LIGHT_COLOR_HEX = "#ffffff";
export const DEFAULT_POINT_LIGHT_INTENSITY = 1.25;
export const DEFAULT_POINT_LIGHT_DISTANCE = 8;
export const DEFAULT_SPOT_LIGHT_POSITION = {
    x: 0,
    y: 0,
    z: 0
};
export const DEFAULT_SPOT_LIGHT_DIRECTION = {
    x: 0,
    y: -1,
    z: 0
};
export const DEFAULT_SPOT_LIGHT_COLOR_HEX = "#ffffff";
export const DEFAULT_SPOT_LIGHT_INTENSITY = 1.5;
export const DEFAULT_SPOT_LIGHT_DISTANCE = 12;
export const DEFAULT_SPOT_LIGHT_ANGLE_DEGREES = 35;
export const DEFAULT_ENTITY_POSITION = {
    x: 0,
    y: 0,
    z: 0
};
export const DEFAULT_PLAYER_START_POSITION = DEFAULT_ENTITY_POSITION;
export const DEFAULT_PLAYER_START_YAW_DEGREES = 0;
export const DEFAULT_PLAYER_START_COLLIDER_MODE = "capsule";
export const DEFAULT_PLAYER_START_EYE_HEIGHT = 1.6;
export const DEFAULT_PLAYER_START_CAPSULE_RADIUS = 0.3;
export const DEFAULT_PLAYER_START_CAPSULE_HEIGHT = 1.8;
export const DEFAULT_PLAYER_START_BOX_SIZE = {
    x: 0.6,
    y: 1.8,
    z: 0.6
};
export const DEFAULT_SOUND_EMITTER_AUDIO_ASSET_ID = null;
export const DEFAULT_SOUND_EMITTER_VOLUME = 1;
export const DEFAULT_SOUND_EMITTER_GAIN = DEFAULT_SOUND_EMITTER_VOLUME;
export const DEFAULT_SOUND_EMITTER_REF_DISTANCE = 6;
export const DEFAULT_SOUND_EMITTER_RADIUS = DEFAULT_SOUND_EMITTER_REF_DISTANCE;
export const DEFAULT_SOUND_EMITTER_MAX_DISTANCE = 24;
export const DEFAULT_TRIGGER_VOLUME_SIZE = {
    x: 2,
    y: 2,
    z: 2
};
export const DEFAULT_TELEPORT_TARGET_YAW_DEGREES = 0;
export const DEFAULT_INTERACTABLE_RADIUS = 1.5;
export const DEFAULT_INTERACTABLE_PROMPT = "Use";
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
function assertFiniteVec3(vector, label) {
    if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z)) {
        throw new Error(`${label} must be finite on every axis.`);
    }
}
function assertPositiveFiniteNumber(value, label) {
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${label} must be a finite number greater than zero.`);
    }
}
function assertPositiveFiniteVec3(vector, label) {
    assertFiniteVec3(vector, label);
    if (vector.x <= 0 || vector.y <= 0 || vector.z <= 0) {
        throw new Error(`${label} must remain positive on every axis.`);
    }
}
function assertNonNegativeFiniteNumber(value, label) {
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(`${label} must be a finite number greater than or equal to zero.`);
    }
}
function assertHexColorString(value, label) {
    if (!isHexColorString(value)) {
        throw new Error(`${label} must use #RRGGBB format.`);
    }
}
function assertNonZeroVec3(vector, label) {
    if (vector.x === 0 && vector.y === 0 && vector.z === 0) {
        throw new Error(`${label} must not be the zero vector.`);
    }
}
function assertBoolean(value, label) {
    if (typeof value !== "boolean") {
        throw new Error(`${label} must be a boolean.`);
    }
}
export function isPlayerStartColliderMode(value) {
    return PLAYER_START_COLLIDER_MODES.includes(value);
}
export function clonePlayerStartColliderSettings(settings) {
    return {
        mode: settings.mode,
        eyeHeight: settings.eyeHeight,
        capsuleRadius: settings.capsuleRadius,
        capsuleHeight: settings.capsuleHeight,
        boxSize: cloneVec3(settings.boxSize)
    };
}
export function getPlayerStartColliderHeight(settings) {
    switch (settings.mode) {
        case "capsule":
            return settings.capsuleHeight;
        case "box":
            return settings.boxSize.y;
        case "none":
            return null;
    }
}
export function createPlayerStartColliderSettings(overrides = {}) {
    const mode = overrides.mode ?? DEFAULT_PLAYER_START_COLLIDER_MODE;
    const eyeHeight = overrides.eyeHeight ?? DEFAULT_PLAYER_START_EYE_HEIGHT;
    const capsuleRadius = overrides.capsuleRadius ?? DEFAULT_PLAYER_START_CAPSULE_RADIUS;
    const capsuleHeight = overrides.capsuleHeight ?? DEFAULT_PLAYER_START_CAPSULE_HEIGHT;
    const boxSize = cloneVec3(overrides.boxSize ?? DEFAULT_PLAYER_START_BOX_SIZE);
    if (!isPlayerStartColliderMode(mode)) {
        throw new Error("Player Start collider mode must be capsule, box, or none.");
    }
    assertPositiveFiniteNumber(eyeHeight, "Player Start eye height");
    assertPositiveFiniteNumber(capsuleRadius, "Player Start capsule radius");
    assertPositiveFiniteNumber(capsuleHeight, "Player Start capsule height");
    assertPositiveFiniteVec3(boxSize, "Player Start box size");
    if (capsuleHeight < capsuleRadius * 2) {
        throw new Error("Player Start capsule height must be at least twice the capsule radius.");
    }
    if (mode === "capsule" && eyeHeight > capsuleHeight) {
        throw new Error("Player Start eye height must be less than or equal to the capsule height.");
    }
    if (mode === "box" && eyeHeight > boxSize.y) {
        throw new Error("Player Start eye height must be less than or equal to the box height.");
    }
    return {
        mode,
        eyeHeight,
        capsuleRadius,
        capsuleHeight,
        boxSize
    };
}
function normalizeSoundEmitterAudioAssetId(audioAssetId) {
    if (audioAssetId === undefined || audioAssetId === null) {
        return null;
    }
    const trimmedAudioAssetId = audioAssetId.trim();
    if (trimmedAudioAssetId.length === 0) {
        throw new Error("Sound Emitter audio asset id must be non-empty when authored.");
    }
    return trimmedAudioAssetId;
}
export function normalizeEntityName(name) {
    if (name === undefined || name === null) {
        return undefined;
    }
    const trimmedName = name.trim();
    return trimmedName.length === 0 ? undefined : trimmedName;
}
export function normalizeYawDegrees(yawDegrees) {
    const normalizedYaw = yawDegrees % 360;
    return normalizedYaw < 0 ? normalizedYaw + 360 : normalizedYaw;
}
export function normalizeInteractablePrompt(prompt) {
    const normalizedPrompt = prompt.trim();
    if (normalizedPrompt.length === 0) {
        throw new Error("Interactable prompt must be non-empty.");
    }
    return normalizedPrompt;
}
export function createPointLightEntity(overrides = {}) {
    const position = cloneVec3(overrides.position ?? DEFAULT_POINT_LIGHT_POSITION);
    const colorHex = overrides.colorHex ?? DEFAULT_POINT_LIGHT_COLOR_HEX;
    const intensity = overrides.intensity ?? DEFAULT_POINT_LIGHT_INTENSITY;
    const distance = overrides.distance ?? DEFAULT_POINT_LIGHT_DISTANCE;
    assertFiniteVec3(position, "Point Light position");
    assertHexColorString(colorHex, "Point Light color");
    assertNonNegativeFiniteNumber(intensity, "Point Light intensity");
    assertPositiveFiniteNumber(distance, "Point Light distance");
    return {
        id: overrides.id ?? createOpaqueId("entity-point-light"),
        kind: "pointLight",
        name: normalizeEntityName(overrides.name),
        position,
        colorHex,
        intensity,
        distance
    };
}
export function createSpotLightEntity(overrides = {}) {
    const position = cloneVec3(overrides.position ?? DEFAULT_SPOT_LIGHT_POSITION);
    const direction = cloneVec3(overrides.direction ?? DEFAULT_SPOT_LIGHT_DIRECTION);
    const colorHex = overrides.colorHex ?? DEFAULT_SPOT_LIGHT_COLOR_HEX;
    const intensity = overrides.intensity ?? DEFAULT_SPOT_LIGHT_INTENSITY;
    const distance = overrides.distance ?? DEFAULT_SPOT_LIGHT_DISTANCE;
    const angleDegrees = overrides.angleDegrees ?? DEFAULT_SPOT_LIGHT_ANGLE_DEGREES;
    assertFiniteVec3(position, "Spot Light position");
    assertFiniteVec3(direction, "Spot Light direction");
    assertNonZeroVec3(direction, "Spot Light direction");
    assertHexColorString(colorHex, "Spot Light color");
    assertNonNegativeFiniteNumber(intensity, "Spot Light intensity");
    assertPositiveFiniteNumber(distance, "Spot Light distance");
    if (!Number.isFinite(angleDegrees) || angleDegrees <= 0 || angleDegrees >= 180) {
        throw new Error("Spot Light angle must be a finite degree value between 0 and 180.");
    }
    return {
        id: overrides.id ?? createOpaqueId("entity-spot-light"),
        kind: "spotLight",
        name: normalizeEntityName(overrides.name),
        position,
        direction,
        colorHex,
        intensity,
        distance,
        angleDegrees
    };
}
export function createPlayerStartEntity(overrides = {}) {
    const position = cloneVec3(overrides.position ?? DEFAULT_PLAYER_START_POSITION);
    const yawDegrees = overrides.yawDegrees ?? DEFAULT_PLAYER_START_YAW_DEGREES;
    const collider = createPlayerStartColliderSettings(overrides.collider);
    assertFiniteVec3(position, "Player Start position");
    if (!Number.isFinite(yawDegrees)) {
        throw new Error("Player Start yaw must be a finite number.");
    }
    return {
        id: overrides.id ?? createOpaqueId("entity-player-start"),
        kind: "playerStart",
        name: normalizeEntityName(overrides.name),
        position,
        yawDegrees: normalizeYawDegrees(yawDegrees),
        collider
    };
}
export function createSoundEmitterEntity(overrides = {}) {
    const position = cloneVec3(overrides.position ?? DEFAULT_ENTITY_POSITION);
    const audioAssetId = normalizeSoundEmitterAudioAssetId(overrides.audioAssetId ?? DEFAULT_SOUND_EMITTER_AUDIO_ASSET_ID);
    const volume = overrides.volume ?? DEFAULT_SOUND_EMITTER_VOLUME;
    const refDistance = overrides.refDistance ?? DEFAULT_SOUND_EMITTER_REF_DISTANCE;
    const maxDistance = overrides.maxDistance ?? DEFAULT_SOUND_EMITTER_MAX_DISTANCE;
    const autoplay = overrides.autoplay ?? false;
    const loop = overrides.loop ?? false;
    assertFiniteVec3(position, "Sound Emitter position");
    assertNonNegativeFiniteNumber(volume, "Sound Emitter volume");
    assertPositiveFiniteNumber(refDistance, "Sound Emitter ref distance");
    assertPositiveFiniteNumber(maxDistance, "Sound Emitter max distance");
    if (maxDistance < refDistance) {
        throw new Error("Sound Emitter max distance must be greater than or equal to ref distance.");
    }
    assertBoolean(autoplay, "Sound Emitter autoplay");
    assertBoolean(loop, "Sound Emitter loop");
    return {
        id: overrides.id ?? createOpaqueId("entity-sound-emitter"),
        kind: "soundEmitter",
        name: normalizeEntityName(overrides.name),
        position,
        audioAssetId,
        volume,
        refDistance,
        maxDistance,
        autoplay,
        loop
    };
}
export function createTriggerVolumeEntity(overrides = {}) {
    const position = cloneVec3(overrides.position ?? DEFAULT_ENTITY_POSITION);
    const size = cloneVec3(overrides.size ?? DEFAULT_TRIGGER_VOLUME_SIZE);
    const triggerOnEnter = overrides.triggerOnEnter ?? true;
    const triggerOnExit = overrides.triggerOnExit ?? false;
    assertFiniteVec3(position, "Trigger Volume position");
    assertPositiveFiniteVec3(size, "Trigger Volume size");
    assertBoolean(triggerOnEnter, "Trigger Volume triggerOnEnter");
    assertBoolean(triggerOnExit, "Trigger Volume triggerOnExit");
    return {
        id: overrides.id ?? createOpaqueId("entity-trigger-volume"),
        kind: "triggerVolume",
        name: normalizeEntityName(overrides.name),
        position,
        size,
        triggerOnEnter,
        triggerOnExit
    };
}
export function createTeleportTargetEntity(overrides = {}) {
    const position = cloneVec3(overrides.position ?? DEFAULT_ENTITY_POSITION);
    const yawDegrees = overrides.yawDegrees ?? DEFAULT_TELEPORT_TARGET_YAW_DEGREES;
    assertFiniteVec3(position, "Teleport Target position");
    if (!Number.isFinite(yawDegrees)) {
        throw new Error("Teleport Target yaw must be a finite number.");
    }
    return {
        id: overrides.id ?? createOpaqueId("entity-teleport-target"),
        kind: "teleportTarget",
        name: normalizeEntityName(overrides.name),
        position,
        yawDegrees: normalizeYawDegrees(yawDegrees)
    };
}
export function createInteractableEntity(overrides = {}) {
    const position = cloneVec3(overrides.position ?? DEFAULT_ENTITY_POSITION);
    const radius = overrides.radius ?? DEFAULT_INTERACTABLE_RADIUS;
    const prompt = normalizeInteractablePrompt(overrides.prompt ?? DEFAULT_INTERACTABLE_PROMPT);
    const enabled = overrides.enabled ?? true;
    assertFiniteVec3(position, "Interactable position");
    assertPositiveFiniteNumber(radius, "Interactable radius");
    assertBoolean(enabled, "Interactable enabled");
    return {
        id: overrides.id ?? createOpaqueId("entity-interactable"),
        kind: "interactable",
        name: normalizeEntityName(overrides.name),
        position,
        radius,
        prompt,
        enabled
    };
}
export const ENTITY_REGISTRY = {
    pointLight: {
        kind: "pointLight",
        label: "Point Light",
        description: "Authored local point light that illuminates nearby geometry in a spherical radius.",
        createDefaultEntity: createPointLightEntity
    },
    spotLight: {
        kind: "spotLight",
        label: "Spot Light",
        description: "Authored local spotlight with an explicit direction and cone angle.",
        createDefaultEntity: createSpotLightEntity
    },
    playerStart: {
        kind: "playerStart",
        label: "Player Start",
        description: "Primary authored spawn point for first-person runtime navigation.",
        createDefaultEntity: createPlayerStartEntity
    },
    soundEmitter: {
        kind: "soundEmitter",
        label: "Sound Emitter",
        description: "Authored positional audio source wired to an audio asset and configurable for looping, volume, and distance falloff.",
        createDefaultEntity: createSoundEmitterEntity
    },
    triggerVolume: {
        kind: "triggerVolume",
        label: "Trigger Volume",
        description: "Axis-aligned authored trigger volume for enter and exit events.",
        createDefaultEntity: createTriggerVolumeEntity
    },
    teleportTarget: {
        kind: "teleportTarget",
        label: "Teleport Target",
        description: "Explicit authored teleport destination with a facing direction.",
        createDefaultEntity: createTeleportTargetEntity
    },
    interactable: {
        kind: "interactable",
        label: "Interactable",
        description: "Explicit authored interaction point for later click and use behavior.",
        createDefaultEntity: createInteractableEntity
    }
};
export function isEntityKind(value) {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(ENTITY_REGISTRY, value);
}
export function getEntityRegistryEntry(kind) {
    return ENTITY_REGISTRY[kind];
}
export function createDefaultEntityInstance(kind, overrides = {}) {
    switch (kind) {
        case "pointLight":
            return createPointLightEntity(overrides);
        case "spotLight":
            return createSpotLightEntity(overrides);
        case "playerStart":
            return createPlayerStartEntity(overrides);
        case "soundEmitter":
            return createSoundEmitterEntity(overrides);
        case "triggerVolume":
            return createTriggerVolumeEntity(overrides);
        case "teleportTarget":
            return createTeleportTargetEntity(overrides);
        case "interactable":
            return createInteractableEntity(overrides);
    }
}
export function cloneEntityInstance(entity) {
    switch (entity.kind) {
        case "pointLight":
            return createPointLightEntity(entity);
        case "spotLight":
            return createSpotLightEntity(entity);
        case "playerStart":
            return createPlayerStartEntity(entity);
        case "soundEmitter":
            return createSoundEmitterEntity(entity);
        case "triggerVolume":
            return createTriggerVolumeEntity(entity);
        case "teleportTarget":
            return createTeleportTargetEntity(entity);
        case "interactable":
            return createInteractableEntity(entity);
    }
}
export function cloneEntityRegistry(entities) {
    return Object.fromEntries(Object.entries(entities).map(([entityId, entity]) => [entityId, cloneEntityInstance(entity)]));
}
export function areEntityInstancesEqual(left, right) {
    if (left.kind !== right.kind || left.id !== right.id || left.name !== right.name || !areVec3Equal(left.position, right.position)) {
        return false;
    }
    switch (left.kind) {
        case "pointLight": {
            const typedRight = right;
            return (left.colorHex === typedRight.colorHex &&
                left.intensity === typedRight.intensity &&
                left.distance === typedRight.distance);
        }
        case "spotLight": {
            const typedRight = right;
            return (areVec3Equal(left.direction, typedRight.direction) &&
                left.colorHex === typedRight.colorHex &&
                left.intensity === typedRight.intensity &&
                left.distance === typedRight.distance &&
                left.angleDegrees === typedRight.angleDegrees);
        }
        case "playerStart": {
            const typedRight = right;
            return (left.yawDegrees === typedRight.yawDegrees &&
                left.collider.mode === typedRight.collider.mode &&
                left.collider.eyeHeight === typedRight.collider.eyeHeight &&
                left.collider.capsuleRadius === typedRight.collider.capsuleRadius &&
                left.collider.capsuleHeight === typedRight.collider.capsuleHeight &&
                areVec3Equal(left.collider.boxSize, typedRight.collider.boxSize));
        }
        case "soundEmitter": {
            const typedRight = right;
            return (left.audioAssetId === typedRight.audioAssetId &&
                left.volume === typedRight.volume &&
                left.refDistance === typedRight.refDistance &&
                left.maxDistance === typedRight.maxDistance &&
                left.autoplay === typedRight.autoplay &&
                left.loop === typedRight.loop);
        }
        case "triggerVolume": {
            const typedRight = right;
            return (areVec3Equal(left.size, typedRight.size) &&
                left.triggerOnEnter === typedRight.triggerOnEnter &&
                left.triggerOnExit === typedRight.triggerOnExit);
        }
        case "teleportTarget": {
            const typedRight = right;
            return left.yawDegrees === typedRight.yawDegrees;
        }
        case "interactable": {
            const typedRight = right;
            return left.radius === typedRight.radius && left.prompt === typedRight.prompt && left.enabled === typedRight.enabled;
        }
    }
}
export function compareEntityInstances(left, right) {
    const leftOrder = ENTITY_KIND_ORDER.indexOf(left.kind);
    const rightOrder = ENTITY_KIND_ORDER.indexOf(right.kind);
    if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
    }
    return left.id.localeCompare(right.id);
}
export function getEntityInstances(entities) {
    return Object.values(entities).sort(compareEntityInstances);
}
export function getEntitiesOfKind(entities, kind) {
    return getEntityInstances(entities).filter((entity) => entity.kind === kind);
}
export function getPlayerStartEntities(entities) {
    return getEntitiesOfKind(entities, "playerStart");
}
export function getPrimaryPlayerStartEntity(entities) {
    return getPlayerStartEntities(entities)[0] ?? null;
}
export function getEntityKindLabel(kind) {
    return getEntityRegistryEntry(kind).label;
}
