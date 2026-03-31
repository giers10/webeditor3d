import { createOpaqueId } from "../core/ids";
import type { Vec3 } from "../core/vector";
import { isHexColorString } from "../document/world-settings";

export interface PointLightEntity {
  id: string;
  kind: "pointLight";
  position: Vec3;
  colorHex: string;
  intensity: number;
  distance: number;
}

export interface SpotLightEntity {
  id: string;
  kind: "spotLight";
  position: Vec3;
  direction: Vec3;
  colorHex: string;
  intensity: number;
  distance: number;
  angleDegrees: number;
}

export interface PlayerStartEntity {
  id: string;
  kind: "playerStart";
  position: Vec3;
  yawDegrees: number;
}

export interface SoundEmitterEntity {
  id: string;
  kind: "soundEmitter";
  position: Vec3;
  radius: number;
  gain: number;
  autoplay: boolean;
  loop: boolean;
}

export interface TriggerVolumeEntity {
  id: string;
  kind: "triggerVolume";
  position: Vec3;
  size: Vec3;
  triggerOnEnter: boolean;
  triggerOnExit: boolean;
}

export interface TeleportTargetEntity {
  id: string;
  kind: "teleportTarget";
  position: Vec3;
  yawDegrees: number;
}

export interface InteractableEntity {
  id: string;
  kind: "interactable";
  position: Vec3;
  radius: number;
  prompt: string;
  enabled: boolean;
}

export type EntityInstance =
  | PointLightEntity
  | SpotLightEntity
  | PlayerStartEntity
  | SoundEmitterEntity
  | TriggerVolumeEntity
  | TeleportTargetEntity
  | InteractableEntity;

export type EntityKind = EntityInstance["kind"];

export interface EntityRegistryEntry<T extends EntityInstance = EntityInstance> {
  kind: T["kind"];
  label: string;
  description: string;
  createDefaultEntity(overrides?: Partial<T>): T;
}

export const ENTITY_KIND_ORDER = ["playerStart", "soundEmitter", "triggerVolume", "teleportTarget", "interactable"] as const;
export const DEFAULT_POINT_LIGHT_POSITION = DEFAULT_ENTITY_POSITION;
export const DEFAULT_POINT_LIGHT_COLOR_HEX = "#ffffff";
export const DEFAULT_POINT_LIGHT_INTENSITY = 1.25;
export const DEFAULT_POINT_LIGHT_DISTANCE = 8;
export const DEFAULT_SPOT_LIGHT_POSITION = DEFAULT_ENTITY_POSITION;
export const DEFAULT_SPOT_LIGHT_DIRECTION: Vec3 = {
  x: 0,
  y: -1,
  z: 0
};
export const DEFAULT_SPOT_LIGHT_COLOR_HEX = "#ffffff";
export const DEFAULT_SPOT_LIGHT_INTENSITY = 1.5;
export const DEFAULT_SPOT_LIGHT_DISTANCE = 12;
export const DEFAULT_SPOT_LIGHT_ANGLE_DEGREES = 35;

export const DEFAULT_ENTITY_POSITION: Vec3 = {
  x: 0,
  y: 0,
  z: 0
};

export const DEFAULT_PLAYER_START_POSITION = DEFAULT_ENTITY_POSITION;
export const DEFAULT_PLAYER_START_YAW_DEGREES = 0;
export const DEFAULT_SOUND_EMITTER_RADIUS = 6;
export const DEFAULT_SOUND_EMITTER_GAIN = 1;
export const DEFAULT_TRIGGER_VOLUME_SIZE: Vec3 = {
  x: 2,
  y: 2,
  z: 2
};
export const DEFAULT_TELEPORT_TARGET_YAW_DEGREES = 0;
export const DEFAULT_INTERACTABLE_RADIUS = 1.5;
export const DEFAULT_INTERACTABLE_PROMPT = "Use";

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function areVec3Equal(left: Vec3, right: Vec3): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function assertFiniteVec3(vector: Vec3, label: string) {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z)) {
    throw new Error(`${label} must be finite on every axis.`);
  }
}

function assertPositiveFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite number greater than zero.`);
  }
}

function assertPositiveFiniteVec3(vector: Vec3, label: string) {
  assertFiniteVec3(vector, label);

  if (vector.x <= 0 || vector.y <= 0 || vector.z <= 0) {
    throw new Error(`${label} must remain positive on every axis.`);
  }
}

function assertNonNegativeFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite number greater than or equal to zero.`);
  }
}

function assertHexColorString(value: string, label: string) {
  if (!isHexColorString(value)) {
    throw new Error(`${label} must use #RRGGBB format.`);
  }
}

function assertNonZeroVec3(vector: Vec3, label: string) {
  if (vector.x === 0 && vector.y === 0 && vector.z === 0) {
    throw new Error(`${label} must not be the zero vector.`);
  }
}

function assertBoolean(value: boolean, label: string) {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean.`);
  }
}

export function normalizeYawDegrees(yawDegrees: number): number {
  const normalizedYaw = yawDegrees % 360;
  return normalizedYaw < 0 ? normalizedYaw + 360 : normalizedYaw;
}

export function normalizeInteractablePrompt(prompt: string): string {
  const normalizedPrompt = prompt.trim();

  if (normalizedPrompt.length === 0) {
    throw new Error("Interactable prompt must be non-empty.");
  }

  return normalizedPrompt;
}

export function createPointLightEntity(
  overrides: Partial<Pick<PointLightEntity, "id" | "position" | "colorHex" | "intensity" | "distance">> = {}
): PointLightEntity {
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
    position,
    colorHex,
    intensity,
    distance
  };
}

export function createSpotLightEntity(
  overrides: Partial<Pick<SpotLightEntity, "id" | "position" | "direction" | "colorHex" | "intensity" | "distance" | "angleDegrees">> = {}
): SpotLightEntity {
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
    position,
    direction,
    colorHex,
    intensity,
    distance,
    angleDegrees
  };
}

export function createPlayerStartEntity(
  overrides: Partial<Pick<PlayerStartEntity, "id" | "position" | "yawDegrees">> = {}
): PlayerStartEntity {
  const position = cloneVec3(overrides.position ?? DEFAULT_PLAYER_START_POSITION);
  const yawDegrees = overrides.yawDegrees ?? DEFAULT_PLAYER_START_YAW_DEGREES;

  assertFiniteVec3(position, "Player Start position");

  if (!Number.isFinite(yawDegrees)) {
    throw new Error("Player Start yaw must be a finite number.");
  }

  return {
    id: overrides.id ?? createOpaqueId("entity-player-start"),
    kind: "playerStart",
    position,
    yawDegrees: normalizeYawDegrees(yawDegrees)
  };
}

export function createSoundEmitterEntity(
  overrides: Partial<Pick<SoundEmitterEntity, "id" | "position" | "radius" | "gain" | "autoplay" | "loop">> = {}
): SoundEmitterEntity {
  const position = cloneVec3(overrides.position ?? DEFAULT_ENTITY_POSITION);
  const radius = overrides.radius ?? DEFAULT_SOUND_EMITTER_RADIUS;
  const gain = overrides.gain ?? DEFAULT_SOUND_EMITTER_GAIN;
  const autoplay = overrides.autoplay ?? false;
  const loop = overrides.loop ?? false;

  assertFiniteVec3(position, "Sound Emitter position");
  assertPositiveFiniteNumber(radius, "Sound Emitter radius");
  assertNonNegativeFiniteNumber(gain, "Sound Emitter gain");
  assertBoolean(autoplay, "Sound Emitter autoplay");
  assertBoolean(loop, "Sound Emitter loop");

  return {
    id: overrides.id ?? createOpaqueId("entity-sound-emitter"),
    kind: "soundEmitter",
    position,
    radius,
    gain,
    autoplay,
    loop
  };
}

export function createTriggerVolumeEntity(
  overrides: Partial<Pick<TriggerVolumeEntity, "id" | "position" | "size" | "triggerOnEnter" | "triggerOnExit">> = {}
): TriggerVolumeEntity {
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
    position,
    size,
    triggerOnEnter,
    triggerOnExit
  };
}

export function createTeleportTargetEntity(
  overrides: Partial<Pick<TeleportTargetEntity, "id" | "position" | "yawDegrees">> = {}
): TeleportTargetEntity {
  const position = cloneVec3(overrides.position ?? DEFAULT_ENTITY_POSITION);
  const yawDegrees = overrides.yawDegrees ?? DEFAULT_TELEPORT_TARGET_YAW_DEGREES;

  assertFiniteVec3(position, "Teleport Target position");

  if (!Number.isFinite(yawDegrees)) {
    throw new Error("Teleport Target yaw must be a finite number.");
  }

  return {
    id: overrides.id ?? createOpaqueId("entity-teleport-target"),
    kind: "teleportTarget",
    position,
    yawDegrees: normalizeYawDegrees(yawDegrees)
  };
}

export function createInteractableEntity(
  overrides: Partial<Pick<InteractableEntity, "id" | "position" | "radius" | "prompt" | "enabled">> = {}
): InteractableEntity {
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
    position,
    radius,
    prompt,
    enabled
  };
}

export const ENTITY_REGISTRY: { [K in EntityKind]: EntityRegistryEntry<Extract<EntityInstance, { kind: K }>> } = {
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
    description: "Authored positional audio source placeholder for the later spatial-audio slice.",
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

export function isEntityKind(value: unknown): value is EntityKind {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ENTITY_REGISTRY, value);
}

export function getEntityRegistryEntry<K extends EntityKind>(kind: K): EntityRegistryEntry<Extract<EntityInstance, { kind: K }>> {
  return ENTITY_REGISTRY[kind];
}

export function createDefaultEntityInstance(kind: "playerStart", overrides?: Partial<PlayerStartEntity>): PlayerStartEntity;
export function createDefaultEntityInstance(kind: "pointLight", overrides?: Partial<PointLightEntity>): PointLightEntity;
export function createDefaultEntityInstance(kind: "spotLight", overrides?: Partial<SpotLightEntity>): SpotLightEntity;
export function createDefaultEntityInstance(kind: "soundEmitter", overrides?: Partial<SoundEmitterEntity>): SoundEmitterEntity;
export function createDefaultEntityInstance(kind: "triggerVolume", overrides?: Partial<TriggerVolumeEntity>): TriggerVolumeEntity;
export function createDefaultEntityInstance(kind: "teleportTarget", overrides?: Partial<TeleportTargetEntity>): TeleportTargetEntity;
export function createDefaultEntityInstance(kind: "interactable", overrides?: Partial<InteractableEntity>): InteractableEntity;
export function createDefaultEntityInstance(kind: EntityKind, overrides: Partial<EntityInstance> = {}): EntityInstance {
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

export function cloneEntityInstance(entity: EntityInstance): EntityInstance {
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

export function cloneEntityRegistry(entities: Record<string, EntityInstance>): Record<string, EntityInstance> {
  return Object.fromEntries(Object.entries(entities).map(([entityId, entity]) => [entityId, cloneEntityInstance(entity)]));
}

export function areEntityInstancesEqual(left: EntityInstance, right: EntityInstance): boolean {
  if (left.kind !== right.kind || left.id !== right.id || !areVec3Equal(left.position, right.position)) {
    return false;
  }

  switch (left.kind) {
    case "pointLight": {
      const typedRight = right as PointLightEntity;
      return (
        left.colorHex === typedRight.colorHex &&
        left.intensity === typedRight.intensity &&
        left.distance === typedRight.distance
      );
    }
    case "spotLight": {
      const typedRight = right as SpotLightEntity;
      return (
        areVec3Equal(left.direction, typedRight.direction) &&
        left.colorHex === typedRight.colorHex &&
        left.intensity === typedRight.intensity &&
        left.distance === typedRight.distance &&
        left.angleDegrees === typedRight.angleDegrees
      );
    }
    case "playerStart": {
      const typedRight = right as PlayerStartEntity;
      return left.yawDegrees === typedRight.yawDegrees;
    }
    case "soundEmitter": {
      const typedRight = right as SoundEmitterEntity;
      return (
        left.radius === typedRight.radius &&
        left.gain === typedRight.gain &&
        left.autoplay === typedRight.autoplay &&
        left.loop === typedRight.loop
      );
    }
    case "triggerVolume": {
      const typedRight = right as TriggerVolumeEntity;
      return (
        areVec3Equal(left.size, typedRight.size) &&
        left.triggerOnEnter === typedRight.triggerOnEnter &&
        left.triggerOnExit === typedRight.triggerOnExit
      );
    }
    case "teleportTarget": {
      const typedRight = right as TeleportTargetEntity;
      return left.yawDegrees === typedRight.yawDegrees;
    }
    case "interactable": {
      const typedRight = right as InteractableEntity;
      return left.radius === typedRight.radius && left.prompt === typedRight.prompt && left.enabled === typedRight.enabled;
    }
  }
}

export function compareEntityInstances(left: EntityInstance, right: EntityInstance): number {
  const leftOrder = ENTITY_KIND_ORDER.indexOf(left.kind);
  const rightOrder = ENTITY_KIND_ORDER.indexOf(right.kind);

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.id.localeCompare(right.id);
}

export function getEntityInstances(entities: Record<string, EntityInstance>): EntityInstance[] {
  return Object.values(entities).sort(compareEntityInstances);
}

export function getEntitiesOfKind<K extends EntityKind>(
  entities: Record<string, EntityInstance>,
  kind: K
): Extract<EntityInstance, { kind: K }>[] {
  return getEntityInstances(entities).filter((entity): entity is Extract<EntityInstance, { kind: K }> => entity.kind === kind);
}

export function getPlayerStartEntities(entities: Record<string, EntityInstance>): PlayerStartEntity[] {
  return getEntitiesOfKind(entities, "playerStart");
}

export function getPrimaryPlayerStartEntity(entities: Record<string, EntityInstance>): PlayerStartEntity | null {
  return getPlayerStartEntities(entities)[0] ?? null;
}

export function getEntityKindLabel(kind: EntityKind): string {
  return getEntityRegistryEntry(kind).label;
}
