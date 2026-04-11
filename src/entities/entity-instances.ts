import { createOpaqueId } from "../core/ids";
import type { Vec3 } from "../core/vector";
import { isHexColorString } from "../document/world-settings";

interface PositionedEntity {
  id: string;
  name?: string;
  position: Vec3;
}

export interface PointLightEntity extends PositionedEntity {
  kind: "pointLight";
  colorHex: string;
  intensity: number;
  distance: number;
}

export interface SpotLightEntity extends PositionedEntity {
  kind: "spotLight";
  direction: Vec3;
  colorHex: string;
  intensity: number;
  distance: number;
  angleDegrees: number;
}

export interface PlayerStartEntity extends PositionedEntity {
  kind: "playerStart";
  yawDegrees: number;
  navigationMode: PlayerStartNavigationMode;
  inputBindings: PlayerStartInputBindings;
  collider: PlayerStartColliderSettings;
}

export interface SceneEntryEntity extends PositionedEntity {
  kind: "sceneEntry";
  yawDegrees: number;
}

export const PLAYER_START_COLLIDER_MODES = ["capsule", "box", "none"] as const;
export type PlayerStartColliderMode = (typeof PLAYER_START_COLLIDER_MODES)[number];
export const PLAYER_START_NAVIGATION_MODES = [
  "firstPerson",
  "thirdPerson"
] as const;
export type PlayerStartNavigationMode =
  (typeof PLAYER_START_NAVIGATION_MODES)[number];
export const PLAYER_START_MOVEMENT_ACTIONS = [
  "moveForward",
  "moveBackward",
  "moveLeft",
  "moveRight"
] as const;
export type PlayerStartMovementAction =
  (typeof PLAYER_START_MOVEMENT_ACTIONS)[number];
export type PlayerStartKeyboardBindingCode = string;
export const PLAYER_START_GAMEPAD_BINDINGS = [
  "leftStickUp",
  "leftStickDown",
  "leftStickLeft",
  "leftStickRight",
  "dpadUp",
  "dpadDown",
  "dpadLeft",
  "dpadRight"
] as const;
export type PlayerStartGamepadBinding =
  (typeof PLAYER_START_GAMEPAD_BINDINGS)[number];
export const PLAYER_START_GAMEPAD_CAMERA_LOOK_BINDINGS = [
  "rightStick"
] as const;
export type PlayerStartGamepadCameraLookBinding =
  (typeof PLAYER_START_GAMEPAD_CAMERA_LOOK_BINDINGS)[number];

export interface PlayerStartKeyboardBindings {
  moveForward: PlayerStartKeyboardBindingCode;
  moveBackward: PlayerStartKeyboardBindingCode;
  moveLeft: PlayerStartKeyboardBindingCode;
  moveRight: PlayerStartKeyboardBindingCode;
}

export interface PlayerStartGamepadBindings {
  moveForward: PlayerStartGamepadBinding;
  moveBackward: PlayerStartGamepadBinding;
  moveLeft: PlayerStartGamepadBinding;
  moveRight: PlayerStartGamepadBinding;
  cameraLook: PlayerStartGamepadCameraLookBinding;
}

export interface PlayerStartInputBindings {
  keyboard: PlayerStartKeyboardBindings;
  gamepad: PlayerStartGamepadBindings;
}

export interface PlayerStartInputBindingOverrides {
  keyboard?: Partial<PlayerStartKeyboardBindings>;
  gamepad?: Partial<PlayerStartGamepadBindings>;
}

export interface PlayerStartColliderSettings {
  mode: PlayerStartColliderMode;
  eyeHeight: number;
  capsuleRadius: number;
  capsuleHeight: number;
  boxSize: Vec3;
}

export interface SoundEmitterEntity extends PositionedEntity {
  kind: "soundEmitter";
  audioAssetId: string | null;
  volume: number;
  refDistance: number;
  maxDistance: number;
  autoplay: boolean;
  loop: boolean;
}

export interface TriggerVolumeEntity extends PositionedEntity {
  kind: "triggerVolume";
  size: Vec3;
  triggerOnEnter: boolean;
  triggerOnExit: boolean;
}

export interface TeleportTargetEntity extends PositionedEntity {
  kind: "teleportTarget";
  yawDegrees: number;
}

export interface InteractableEntity extends PositionedEntity {
  kind: "interactable";
  radius: number;
  prompt: string;
  enabled: boolean;
}

export interface SceneExitEntity extends PositionedEntity {
  kind: "sceneExit";
  radius: number;
  prompt: string;
  enabled: boolean;
  targetSceneId: string;
  targetEntryEntityId: string;
}

export type EntityInstance =
  | PointLightEntity
  | SpotLightEntity
  | PlayerStartEntity
  | SceneEntryEntity
  | SoundEmitterEntity
  | TriggerVolumeEntity
  | TeleportTargetEntity
  | InteractableEntity
  | SceneExitEntity;

export type EntityKind = EntityInstance["kind"];

export interface EntityRegistryEntry<T extends EntityInstance = EntityInstance> {
  kind: T["kind"];
  label: string;
  description: string;
  createDefaultEntity(overrides?: Partial<T>): T;
}

export const ENTITY_KIND_ORDER = [
  "pointLight",
  "spotLight",
  "playerStart",
  "sceneEntry",
  "soundEmitter",
  "triggerVolume",
  "teleportTarget",
  "interactable",
  "sceneExit"
] as const;
export const DEFAULT_POINT_LIGHT_POSITION: Vec3 = {
  x: 0,
  y: 0,
  z: 0
};
export const DEFAULT_POINT_LIGHT_COLOR_HEX = "#ffffff";
export const DEFAULT_POINT_LIGHT_INTENSITY = 1.25;
export const DEFAULT_POINT_LIGHT_DISTANCE = 8;
export const DEFAULT_SPOT_LIGHT_POSITION: Vec3 = {
  x: 0,
  y: 0,
  z: 0
};
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
export const DEFAULT_PLAYER_START_NAVIGATION_MODE: PlayerStartNavigationMode =
  "firstPerson";
export const DEFAULT_PLAYER_START_KEYBOARD_BINDINGS: PlayerStartKeyboardBindings =
  {
    moveForward: "KeyW",
    moveBackward: "KeyS",
    moveLeft: "KeyA",
    moveRight: "KeyD"
  };
export const DEFAULT_PLAYER_START_GAMEPAD_BINDINGS: PlayerStartGamepadBindings =
  {
    moveForward: "leftStickUp",
    moveBackward: "leftStickDown",
    moveLeft: "leftStickLeft",
    moveRight: "leftStickRight",
    cameraLook: "rightStick"
  };
export const DEFAULT_SCENE_ENTRY_YAW_DEGREES = 0;
export const DEFAULT_PLAYER_START_COLLIDER_MODE: PlayerStartColliderMode = "capsule";
export const DEFAULT_PLAYER_START_EYE_HEIGHT = 1.6;
export const DEFAULT_PLAYER_START_CAPSULE_RADIUS = 0.3;
export const DEFAULT_PLAYER_START_CAPSULE_HEIGHT = 1.8;
export const DEFAULT_PLAYER_START_BOX_SIZE: Vec3 = {
  x: 0.6,
  y: 1.8,
  z: 0.6
};
export const DEFAULT_SOUND_EMITTER_AUDIO_ASSET_ID: string | null = null;
export const DEFAULT_SOUND_EMITTER_VOLUME = 1;
export const DEFAULT_SOUND_EMITTER_GAIN = DEFAULT_SOUND_EMITTER_VOLUME;
export const DEFAULT_SOUND_EMITTER_REF_DISTANCE = 6;
export const DEFAULT_SOUND_EMITTER_RADIUS = DEFAULT_SOUND_EMITTER_REF_DISTANCE;
export const DEFAULT_SOUND_EMITTER_MAX_DISTANCE = 24;
export const DEFAULT_TRIGGER_VOLUME_SIZE: Vec3 = {
  x: 2,
  y: 2,
  z: 2
};
export const DEFAULT_TELEPORT_TARGET_YAW_DEGREES = 0;
export const DEFAULT_INTERACTABLE_RADIUS = 1.5;
export const DEFAULT_INTERACTABLE_PROMPT = "Use";
export const DEFAULT_SCENE_EXIT_RADIUS = 1.5;
export const DEFAULT_SCENE_EXIT_PROMPT = "Enter";

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

export function isPlayerStartColliderMode(value: string): value is PlayerStartColliderMode {
  return PLAYER_START_COLLIDER_MODES.includes(value as PlayerStartColliderMode);
}

export function isPlayerStartNavigationMode(
  value: string
): value is PlayerStartNavigationMode {
  return PLAYER_START_NAVIGATION_MODES.includes(
    value as PlayerStartNavigationMode
  );
}

export function isPlayerStartKeyboardBindingCode(
  value: string
): value is PlayerStartKeyboardBindingCode {
  return value.trim().length > 0;
}

export function isPlayerStartGamepadBinding(
  value: string
): value is PlayerStartGamepadBinding {
  return PLAYER_START_GAMEPAD_BINDINGS.includes(
    value as PlayerStartGamepadBinding
  );
}

export function isPlayerStartGamepadCameraLookBinding(
  value: string
): value is PlayerStartGamepadCameraLookBinding {
  return PLAYER_START_GAMEPAD_CAMERA_LOOK_BINDINGS.includes(
    value as PlayerStartGamepadCameraLookBinding
  );
}

export function clonePlayerStartColliderSettings(settings: PlayerStartColliderSettings): PlayerStartColliderSettings {
  return {
    mode: settings.mode,
    eyeHeight: settings.eyeHeight,
    capsuleRadius: settings.capsuleRadius,
    capsuleHeight: settings.capsuleHeight,
    boxSize: cloneVec3(settings.boxSize)
  };
}

export function clonePlayerStartInputBindings(
  bindings: PlayerStartInputBindings
): PlayerStartInputBindings {
  return {
    keyboard: {
      moveForward: bindings.keyboard.moveForward,
      moveBackward: bindings.keyboard.moveBackward,
      moveLeft: bindings.keyboard.moveLeft,
      moveRight: bindings.keyboard.moveRight
    },
    gamepad: {
      moveForward: bindings.gamepad.moveForward,
      moveBackward: bindings.gamepad.moveBackward,
      moveLeft: bindings.gamepad.moveLeft,
      moveRight: bindings.gamepad.moveRight,
      cameraLook: bindings.gamepad.cameraLook
    }
  };
}

export function createPlayerStartInputBindings(
  overrides: PlayerStartInputBindingOverrides = {}
): PlayerStartInputBindings {
  const keyboard: PlayerStartKeyboardBindings = {
    moveForward:
      overrides.keyboard?.moveForward ??
      DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.moveForward,
    moveBackward:
      overrides.keyboard?.moveBackward ??
      DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.moveBackward,
    moveLeft:
      overrides.keyboard?.moveLeft ??
      DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.moveLeft,
    moveRight:
      overrides.keyboard?.moveRight ??
      DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.moveRight
  };
  const gamepad: PlayerStartGamepadBindings = {
    moveForward:
      overrides.gamepad?.moveForward ??
      DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.moveForward,
    moveBackward:
      overrides.gamepad?.moveBackward ??
      DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.moveBackward,
    moveLeft:
      overrides.gamepad?.moveLeft ??
      DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.moveLeft,
    moveRight:
      overrides.gamepad?.moveRight ??
      DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.moveRight,
    cameraLook:
      overrides.gamepad?.cameraLook ??
      DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.cameraLook
  };

  if (!isPlayerStartKeyboardBindingCode(keyboard.moveForward)) {
    throw new Error("Player Start move-forward keyboard binding must be supported.");
  }

  if (!isPlayerStartKeyboardBindingCode(keyboard.moveBackward)) {
    throw new Error("Player Start move-backward keyboard binding must be supported.");
  }

  if (!isPlayerStartKeyboardBindingCode(keyboard.moveLeft)) {
    throw new Error("Player Start move-left keyboard binding must be supported.");
  }

  if (!isPlayerStartKeyboardBindingCode(keyboard.moveRight)) {
    throw new Error("Player Start move-right keyboard binding must be supported.");
  }

  if (!isPlayerStartGamepadBinding(gamepad.moveForward)) {
    throw new Error("Player Start move-forward gamepad binding must be supported.");
  }

  if (!isPlayerStartGamepadBinding(gamepad.moveBackward)) {
    throw new Error("Player Start move-backward gamepad binding must be supported.");
  }

  if (!isPlayerStartGamepadBinding(gamepad.moveLeft)) {
    throw new Error("Player Start move-left gamepad binding must be supported.");
  }

  if (!isPlayerStartGamepadBinding(gamepad.moveRight)) {
    throw new Error("Player Start move-right gamepad binding must be supported.");
  }

  if (!isPlayerStartGamepadCameraLookBinding(gamepad.cameraLook)) {
    throw new Error("Player Start camera-look gamepad binding must be supported.");
  }

  return {
    keyboard,
    gamepad
  };
}

export function arePlayerStartInputBindingsEqual(
  left: PlayerStartInputBindings,
  right: PlayerStartInputBindings
): boolean {
  return (
    left.keyboard.moveForward === right.keyboard.moveForward &&
    left.keyboard.moveBackward === right.keyboard.moveBackward &&
    left.keyboard.moveLeft === right.keyboard.moveLeft &&
    left.keyboard.moveRight === right.keyboard.moveRight &&
    left.gamepad.moveForward === right.gamepad.moveForward &&
    left.gamepad.moveBackward === right.gamepad.moveBackward &&
    left.gamepad.moveLeft === right.gamepad.moveLeft &&
    left.gamepad.moveRight === right.gamepad.moveRight &&
    left.gamepad.cameraLook === right.gamepad.cameraLook
  );
}

export function getPlayerStartColliderHeight(settings: PlayerStartColliderSettings): number | null {
  switch (settings.mode) {
    case "capsule":
      return settings.capsuleHeight;
    case "box":
      return settings.boxSize.y;
    case "none":
      return null;
  }
}

export function createPlayerStartColliderSettings(
  overrides: Partial<PlayerStartColliderSettings> = {}
): PlayerStartColliderSettings {
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

function normalizeSoundEmitterAudioAssetId(audioAssetId: string | null | undefined): string | null {
  if (audioAssetId === undefined || audioAssetId === null) {
    return null;
  }

  const trimmedAudioAssetId = audioAssetId.trim();

  if (trimmedAudioAssetId.length === 0) {
    throw new Error("Sound Emitter audio asset id must be non-empty when authored.");
  }

  return trimmedAudioAssetId;
}

function normalizeSceneReferenceId(
  value: string | null | undefined,
  label: string
): string {
  if (value === undefined || value === null) {
    throw new Error(`${label} must be authored.`);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`${label} must be non-empty.`);
  }

  return normalizedValue;
}

export function normalizeEntityName(name: string | null | undefined): string | undefined {
  if (name === undefined || name === null) {
    return undefined;
  }

  const trimmedName = name.trim();
  return trimmedName.length === 0 ? undefined : trimmedName;
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
  overrides: Partial<Pick<PointLightEntity, "id" | "name" | "position" | "colorHex" | "intensity" | "distance">> = {}
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
    name: normalizeEntityName(overrides.name),
    position,
    colorHex,
    intensity,
    distance
  };
}

export function createSpotLightEntity(
  overrides: Partial<Pick<SpotLightEntity, "id" | "name" | "position" | "direction" | "colorHex" | "intensity" | "distance" | "angleDegrees">> = {}
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
    name: normalizeEntityName(overrides.name),
    position,
    direction,
    colorHex,
    intensity,
    distance,
    angleDegrees
  };
}

export function createPlayerStartEntity(
  overrides: Partial<
    Pick<
      PlayerStartEntity,
      "id" | "name" | "position" | "yawDegrees" | "navigationMode"
    >
  > & {
    inputBindings?: PlayerStartInputBindingOverrides;
    collider?: Partial<PlayerStartColliderSettings>;
  } = {}
): PlayerStartEntity {
  const position = cloneVec3(overrides.position ?? DEFAULT_PLAYER_START_POSITION);
  const yawDegrees = overrides.yawDegrees ?? DEFAULT_PLAYER_START_YAW_DEGREES;
  const navigationMode =
    overrides.navigationMode ?? DEFAULT_PLAYER_START_NAVIGATION_MODE;
  const inputBindings = createPlayerStartInputBindings(overrides.inputBindings);
  const collider = createPlayerStartColliderSettings(overrides.collider);

  assertFiniteVec3(position, "Player Start position");

  if (!Number.isFinite(yawDegrees)) {
    throw new Error("Player Start yaw must be a finite number.");
  }

  if (!isPlayerStartNavigationMode(navigationMode)) {
    throw new Error(
      "Player Start navigation mode must be firstPerson or thirdPerson."
    );
  }

  return {
    id: overrides.id ?? createOpaqueId("entity-player-start"),
    kind: "playerStart",
    name: normalizeEntityName(overrides.name),
    position,
    yawDegrees: normalizeYawDegrees(yawDegrees),
    navigationMode,
    inputBindings,
    collider
  };
}

export function createSceneEntryEntity(
  overrides: Partial<Pick<SceneEntryEntity, "id" | "name" | "position" | "yawDegrees">> = {}
): SceneEntryEntity {
  const position = cloneVec3(overrides.position ?? DEFAULT_ENTITY_POSITION);
  const yawDegrees = overrides.yawDegrees ?? DEFAULT_SCENE_ENTRY_YAW_DEGREES;

  assertFiniteVec3(position, "Scene Entry position");

  if (!Number.isFinite(yawDegrees)) {
    throw new Error("Scene Entry yaw must be a finite number.");
  }

  return {
    id: overrides.id ?? createOpaqueId("entity-scene-entry"),
    kind: "sceneEntry",
    name: normalizeEntityName(overrides.name),
    position,
    yawDegrees: normalizeYawDegrees(yawDegrees)
  };
}

export function createSoundEmitterEntity(
  overrides: Partial<
    Pick<
      SoundEmitterEntity,
      "id" | "name" | "position" | "audioAssetId" | "volume" | "refDistance" | "maxDistance" | "autoplay" | "loop"
    >
  > = {}
): SoundEmitterEntity {
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

export function createTriggerVolumeEntity(
  overrides: Partial<Pick<TriggerVolumeEntity, "id" | "name" | "position" | "size" | "triggerOnEnter" | "triggerOnExit">> = {}
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
    name: normalizeEntityName(overrides.name),
    position,
    size,
    triggerOnEnter,
    triggerOnExit
  };
}

export function createTeleportTargetEntity(
  overrides: Partial<Pick<TeleportTargetEntity, "id" | "name" | "position" | "yawDegrees">> = {}
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
    name: normalizeEntityName(overrides.name),
    position,
    yawDegrees: normalizeYawDegrees(yawDegrees)
  };
}

export function createInteractableEntity(
  overrides: Partial<Pick<InteractableEntity, "id" | "name" | "position" | "radius" | "prompt" | "enabled">> = {}
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
    name: normalizeEntityName(overrides.name),
    position,
    radius,
    prompt,
    enabled
  };
}

export function createSceneExitEntity(
  overrides: Partial<
    Pick<
      SceneExitEntity,
      | "id"
      | "name"
      | "position"
      | "radius"
      | "prompt"
      | "enabled"
      | "targetSceneId"
      | "targetEntryEntityId"
    >
  > = {}
): SceneExitEntity {
  const position = cloneVec3(overrides.position ?? DEFAULT_ENTITY_POSITION);
  const radius = overrides.radius ?? DEFAULT_SCENE_EXIT_RADIUS;
  const prompt = normalizeInteractablePrompt(
    overrides.prompt ?? DEFAULT_SCENE_EXIT_PROMPT
  );
  const enabled = overrides.enabled ?? true;
  const targetSceneId = normalizeSceneReferenceId(
    overrides.targetSceneId,
    "Scene Exit target scene id"
  );
  const targetEntryEntityId = normalizeSceneReferenceId(
    overrides.targetEntryEntityId,
    "Scene Exit target entry id"
  );

  assertFiniteVec3(position, "Scene Exit position");
  assertPositiveFiniteNumber(radius, "Scene Exit radius");
  assertBoolean(enabled, "Scene Exit enabled");

  return {
    id: overrides.id ?? createOpaqueId("entity-scene-exit"),
    kind: "sceneExit",
    name: normalizeEntityName(overrides.name),
    position,
    radius,
    prompt,
    enabled,
    targetSceneId,
    targetEntryEntityId
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
    description:
      "Primary authored spawn point for first-person or third-person runtime navigation.",
    createDefaultEntity: createPlayerStartEntity
  },
  sceneEntry: {
    kind: "sceneEntry",
    label: "Scene Entry",
    description:
      "Explicit authored scene-transition arrival point with a facing direction.",
    createDefaultEntity: createSceneEntryEntity
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
  },
  sceneExit: {
    kind: "sceneExit",
    label: "Scene Exit",
    description:
      "Explicit authored scene-transition exit that loads a target scene entry on demand.",
    createDefaultEntity: createSceneExitEntity
  }
};

export function isEntityKind(value: unknown): value is EntityKind {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ENTITY_REGISTRY, value);
}

export function getEntityRegistryEntry<K extends EntityKind>(kind: K): EntityRegistryEntry<Extract<EntityInstance, { kind: K }>> {
  return ENTITY_REGISTRY[kind];
}

export function createDefaultEntityInstance(kind: "playerStart", overrides?: Partial<PlayerStartEntity>): PlayerStartEntity;
export function createDefaultEntityInstance(kind: "sceneEntry", overrides?: Partial<SceneEntryEntity>): SceneEntryEntity;
export function createDefaultEntityInstance(kind: "pointLight", overrides?: Partial<PointLightEntity>): PointLightEntity;
export function createDefaultEntityInstance(kind: "spotLight", overrides?: Partial<SpotLightEntity>): SpotLightEntity;
export function createDefaultEntityInstance(kind: "soundEmitter", overrides?: Partial<SoundEmitterEntity>): SoundEmitterEntity;
export function createDefaultEntityInstance(kind: "triggerVolume", overrides?: Partial<TriggerVolumeEntity>): TriggerVolumeEntity;
export function createDefaultEntityInstance(kind: "teleportTarget", overrides?: Partial<TeleportTargetEntity>): TeleportTargetEntity;
export function createDefaultEntityInstance(kind: "interactable", overrides?: Partial<InteractableEntity>): InteractableEntity;
export function createDefaultEntityInstance(kind: "sceneExit", overrides?: Partial<SceneExitEntity>): SceneExitEntity;
export function createDefaultEntityInstance(kind: EntityKind, overrides: Partial<EntityInstance> = {}): EntityInstance {
  switch (kind) {
    case "pointLight":
      return createPointLightEntity(overrides);
    case "spotLight":
      return createSpotLightEntity(overrides);
    case "playerStart":
      return createPlayerStartEntity(overrides);
    case "sceneEntry":
      return createSceneEntryEntity(overrides);
    case "soundEmitter":
      return createSoundEmitterEntity(overrides);
    case "triggerVolume":
      return createTriggerVolumeEntity(overrides);
    case "teleportTarget":
      return createTeleportTargetEntity(overrides);
    case "interactable":
      return createInteractableEntity(overrides);
    case "sceneExit":
      return createSceneExitEntity(overrides);
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
    case "sceneEntry":
      return createSceneEntryEntity(entity);
    case "soundEmitter":
      return createSoundEmitterEntity(entity);
    case "triggerVolume":
      return createTriggerVolumeEntity(entity);
    case "teleportTarget":
      return createTeleportTargetEntity(entity);
    case "interactable":
      return createInteractableEntity(entity);
    case "sceneExit":
      return createSceneExitEntity(entity);
  }
}

export function cloneEntityRegistry(entities: Record<string, EntityInstance>): Record<string, EntityInstance> {
  return Object.fromEntries(Object.entries(entities).map(([entityId, entity]) => [entityId, cloneEntityInstance(entity)]));
}

export function areEntityInstancesEqual(left: EntityInstance, right: EntityInstance): boolean {
  if (left.kind !== right.kind || left.id !== right.id || left.name !== right.name || !areVec3Equal(left.position, right.position)) {
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
      return (
        left.yawDegrees === typedRight.yawDegrees &&
        left.navigationMode === typedRight.navigationMode &&
        arePlayerStartInputBindingsEqual(
          left.inputBindings,
          typedRight.inputBindings
        ) &&
        left.collider.mode === typedRight.collider.mode &&
        left.collider.eyeHeight === typedRight.collider.eyeHeight &&
        left.collider.capsuleRadius === typedRight.collider.capsuleRadius &&
        left.collider.capsuleHeight === typedRight.collider.capsuleHeight &&
        areVec3Equal(left.collider.boxSize, typedRight.collider.boxSize)
      );
    }
    case "sceneEntry": {
      const typedRight = right as SceneEntryEntity;
      return left.yawDegrees === typedRight.yawDegrees;
    }
    case "soundEmitter": {
      const typedRight = right as SoundEmitterEntity;
      return (
        left.audioAssetId === typedRight.audioAssetId &&
        left.volume === typedRight.volume &&
        left.refDistance === typedRight.refDistance &&
        left.maxDistance === typedRight.maxDistance &&
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
    case "sceneExit": {
      const typedRight = right as SceneExitEntity;
      return (
        left.radius === typedRight.radius &&
        left.prompt === typedRight.prompt &&
        left.enabled === typedRight.enabled &&
        left.targetSceneId === typedRight.targetSceneId &&
        left.targetEntryEntityId === typedRight.targetEntryEntityId
      );
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
