import { createOpaqueId } from "../core/ids";
import type { Vec3 } from "../core/vector";
import {
  areProjectDialoguesEqual,
  cloneProjectDialogue,
  type ProjectDialogue
} from "../dialogues/project-dialogues";
import { normalizeTimeOfDayHours } from "../document/project-time-settings";
import { isHexColorString } from "../document/world-settings";

interface PositionedEntity {
  id: string;
  name?: string;
  visible: boolean;
  enabled: boolean;
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
  movementTemplate: PlayerStartMovementTemplate;
  inputBindings: PlayerStartInputBindings;
  collider: PlayerStartColliderSettings;
}

export interface SceneEntryEntity extends PositionedEntity {
  kind: "sceneEntry";
  yawDegrees: number;
}

export const CAMERA_RIG_TYPES = ["fixed"] as const;
export type CameraRigType = (typeof CAMERA_RIG_TYPES)[number];
export const CAMERA_RIG_TARGET_KINDS = [
  "player",
  "actor",
  "entity",
  "worldPoint"
] as const;
export type CameraRigTargetKind = (typeof CAMERA_RIG_TARGET_KINDS)[number];
export const CAMERA_RIG_TRANSITION_MODES = ["cut", "blend"] as const;
export type CameraRigTransitionMode =
  (typeof CAMERA_RIG_TRANSITION_MODES)[number];

export interface CameraRigPlayerTargetRef {
  kind: "player";
}

export interface CameraRigActorTargetRef {
  kind: "actor";
  actorId: string;
}

export interface CameraRigEntityTargetRef {
  kind: "entity";
  entityId: string;
}

export interface CameraRigWorldPointTargetRef {
  kind: "worldPoint";
  point: Vec3;
}

export type CameraRigTargetRef =
  | CameraRigPlayerTargetRef
  | CameraRigActorTargetRef
  | CameraRigEntityTargetRef
  | CameraRigWorldPointTargetRef;

export interface CameraRigLookAroundSettings {
  enabled: boolean;
  yawLimitDegrees: number;
  pitchLimitDegrees: number;
  recenterSpeed: number;
}

export interface CameraRigEntity extends PositionedEntity {
  kind: "cameraRig";
  rigType: CameraRigType;
  priority: number;
  defaultActive: boolean;
  target: CameraRigTargetRef;
  targetOffset: Vec3;
  transitionMode: CameraRigTransitionMode;
  transitionDurationSeconds: number;
  lookAround: CameraRigLookAroundSettings;
}

export interface CharacterColliderSettings {
  mode: PlayerStartColliderMode;
  eyeHeight: number;
  capsuleRadius: number;
  capsuleHeight: number;
  boxSize: Vec3;
}

export interface PlayerStartColliderSettings extends CharacterColliderSettings {}

export interface NpcColliderSettings extends CharacterColliderSettings {}

export const NPC_PRESENCE_MODES = ["always", "timeWindow"] as const;
export type NpcPresenceMode = (typeof NPC_PRESENCE_MODES)[number];

export interface NpcAlwaysPresence {
  mode: "always";
}

export interface NpcTimeWindowPresence {
  mode: "timeWindow";
  startHour: number;
  endHour: number;
}

export type NpcPresence = NpcAlwaysPresence | NpcTimeWindowPresence;

export interface NpcEntity extends PositionedEntity {
  kind: "npc";
  actorId: string;
  presence: NpcPresence;
  yawDegrees: number;
  modelAssetId: string | null;
  dialogues: ProjectDialogue[];
  defaultDialogueId: string | null;
  collider: NpcColliderSettings;
}

export const PLAYER_START_COLLIDER_MODES = ["capsule", "box", "none"] as const;
export type PlayerStartColliderMode = (typeof PLAYER_START_COLLIDER_MODES)[number];
export const PLAYER_START_NAVIGATION_MODES = [
  "firstPerson",
  "thirdPerson"
] as const;
export type PlayerStartNavigationMode =
  (typeof PLAYER_START_NAVIGATION_MODES)[number];
export const PLAYER_START_MOVEMENT_TEMPLATE_KINDS = [
  "default",
  "responsive",
  "custom"
] as const;
export type PlayerStartMovementTemplateKind =
  (typeof PLAYER_START_MOVEMENT_TEMPLATE_KINDS)[number];
export const PLAYER_START_MOVEMENT_ACTIONS = [
  "moveForward",
  "moveBackward",
  "moveLeft",
  "moveRight"
] as const;
export type PlayerStartMovementAction =
  (typeof PLAYER_START_MOVEMENT_ACTIONS)[number];
export const PLAYER_START_LOCOMOTION_ACTIONS = [
  "jump",
  "sprint",
  "crouch"
] as const;
export type PlayerStartLocomotionAction =
  (typeof PLAYER_START_LOCOMOTION_ACTIONS)[number];
export const PLAYER_START_SYSTEM_ACTIONS = ["pauseTime"] as const;
export type PlayerStartSystemAction =
  (typeof PLAYER_START_SYSTEM_ACTIONS)[number];
export type PlayerStartInputAction =
  | PlayerStartMovementAction
  | PlayerStartLocomotionAction
  | PlayerStartSystemAction;
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
export const PLAYER_START_GAMEPAD_ACTION_BINDINGS = [
  "buttonSouth",
  "buttonEast",
  "buttonWest",
  "buttonNorth",
  "buttonMenu",
  "leftShoulder",
  "rightShoulder",
  "leftTrigger",
  "rightTrigger",
  "leftStickPress",
  "rightStickPress"
] as const;
export type PlayerStartGamepadActionBinding =
  (typeof PLAYER_START_GAMEPAD_ACTION_BINDINGS)[number];
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
  jump: PlayerStartKeyboardBindingCode;
  sprint: PlayerStartKeyboardBindingCode;
  crouch: PlayerStartKeyboardBindingCode;
  pauseTime: PlayerStartKeyboardBindingCode;
}

export interface PlayerStartGamepadBindings {
  moveForward: PlayerStartGamepadBinding;
  moveBackward: PlayerStartGamepadBinding;
  moveLeft: PlayerStartGamepadBinding;
  moveRight: PlayerStartGamepadBinding;
  jump: PlayerStartGamepadActionBinding;
  sprint: PlayerStartGamepadActionBinding;
  crouch: PlayerStartGamepadActionBinding;
  pauseTime: PlayerStartGamepadActionBinding;
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

export interface PlayerStartMovementCapabilities {
  jump: boolean;
  sprint: boolean;
  crouch: boolean;
}

export interface PlayerStartJumpSettings {
  speed: number;
  bufferMs: number;
  coyoteTimeMs: number;
  variableHeight: boolean;
  maxHoldMs: number;
  moveWhileJumping: boolean;
  moveWhileFalling: boolean;
  directionOnly: boolean;
  bunnyHop: boolean;
  bunnyHopBoost: number;
}

export interface PlayerStartSprintSettings {
  speedMultiplier: number;
}

export interface PlayerStartCrouchSettings {
  speedMultiplier: number;
}

export interface PlayerStartMovementTemplate {
  kind: PlayerStartMovementTemplateKind;
  moveSpeed: number;
  maxSpeed: number;
  maxStepHeight: number;
  capabilities: PlayerStartMovementCapabilities;
  jump: PlayerStartJumpSettings;
  sprint: PlayerStartSprintSettings;
  crouch: PlayerStartCrouchSettings;
}

export interface PlayerStartMovementTemplateOverrides {
  kind?: PlayerStartMovementTemplateKind;
  moveSpeed?: number;
  maxSpeed?: number;
  maxStepHeight?: number;
  capabilities?: Partial<PlayerStartMovementCapabilities>;
  jump?: Partial<PlayerStartJumpSettings>;
  sprint?: Partial<PlayerStartSprintSettings>;
  crouch?: Partial<PlayerStartCrouchSettings>;
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
  interactionEnabled: boolean;
}

export type EntityInstance =
  | PointLightEntity
  | SpotLightEntity
  | PlayerStartEntity
  | CameraRigEntity
  | SceneEntryEntity
  | NpcEntity
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

export const ENTITY_KIND_ORDER = [
  "pointLight",
  "spotLight",
  "playerStart",
  "cameraRig",
  "sceneEntry",
  "npc",
  "soundEmitter",
  "triggerVolume",
  "teleportTarget",
  "interactable"
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

export const DEFAULT_ENTITY_VISIBLE = true;
export const DEFAULT_ENTITY_ENABLED = true;

export const DEFAULT_PLAYER_START_POSITION = DEFAULT_ENTITY_POSITION;
export const DEFAULT_PLAYER_START_YAW_DEGREES = 0;
export const DEFAULT_CAMERA_RIG_PRIORITY = 0;
export const DEFAULT_CAMERA_RIG_DEFAULT_ACTIVE = true;
export const DEFAULT_CAMERA_RIG_TARGET_OFFSET: Vec3 = {
  x: 0,
  y: 1.4,
  z: 0
};
export const DEFAULT_CAMERA_RIG_TRANSITION_MODE: CameraRigTransitionMode =
  "blend";
export const DEFAULT_CAMERA_RIG_TRANSITION_DURATION_SECONDS = 0.35;
export const DEFAULT_CAMERA_RIG_LOOK_AROUND_ENABLED = true;
export const DEFAULT_CAMERA_RIG_LOOK_AROUND_YAW_LIMIT_DEGREES = 12;
export const DEFAULT_CAMERA_RIG_LOOK_AROUND_PITCH_LIMIT_DEGREES = 8;
export const DEFAULT_CAMERA_RIG_LOOK_AROUND_RECENTER_SPEED = 3.5;
export const DEFAULT_PLAYER_START_NAVIGATION_MODE: PlayerStartNavigationMode =
  "firstPerson";
export const DEFAULT_PLAYER_START_MOVEMENT_TEMPLATE_KIND: PlayerStartMovementTemplateKind =
  "default";
export const DEFAULT_PLAYER_START_MOVE_SPEED = 4.5;
export const DEFAULT_PLAYER_START_MAX_SPEED = 0;
export const DEFAULT_PLAYER_START_MAX_STEP_HEIGHT = 0.35;
export const DEFAULT_PLAYER_START_JUMP_SPEED = 7.2;
export const DEFAULT_PLAYER_START_JUMP_BUFFER_MS = 0;
export const DEFAULT_PLAYER_START_COYOTE_TIME_MS = 0;
export const DEFAULT_PLAYER_START_VARIABLE_JUMP_HEIGHT = false;
export const DEFAULT_PLAYER_START_VARIABLE_JUMP_MAX_HOLD_MS = 160;
export const DEFAULT_PLAYER_START_MOVE_WHILE_JUMPING = true;
export const DEFAULT_PLAYER_START_MOVE_WHILE_FALLING = true;
export const DEFAULT_PLAYER_START_AIR_DIRECTION_ONLY = false;
export const DEFAULT_PLAYER_START_BUNNY_HOP = false;
export const DEFAULT_PLAYER_START_BUNNY_HOP_BOOST = 0.05;
export const DEFAULT_PLAYER_START_SPRINT_SPEED_MULTIPLIER = 1.65;
export const DEFAULT_PLAYER_START_CROUCH_SPEED_MULTIPLIER = 0.45;
export const DEFAULT_PLAYER_START_MOVEMENT_CAPABILITIES: PlayerStartMovementCapabilities =
  {
    jump: true,
    sprint: true,
    crouch: true
  };
export const DEFAULT_PLAYER_START_JUMP_SETTINGS: PlayerStartJumpSettings = {
  speed: DEFAULT_PLAYER_START_JUMP_SPEED,
  bufferMs: DEFAULT_PLAYER_START_JUMP_BUFFER_MS,
  coyoteTimeMs: DEFAULT_PLAYER_START_COYOTE_TIME_MS,
  variableHeight: DEFAULT_PLAYER_START_VARIABLE_JUMP_HEIGHT,
  maxHoldMs: DEFAULT_PLAYER_START_VARIABLE_JUMP_MAX_HOLD_MS,
  moveWhileJumping: DEFAULT_PLAYER_START_MOVE_WHILE_JUMPING,
  moveWhileFalling: DEFAULT_PLAYER_START_MOVE_WHILE_FALLING,
  directionOnly: DEFAULT_PLAYER_START_AIR_DIRECTION_ONLY,
  bunnyHop: DEFAULT_PLAYER_START_BUNNY_HOP,
  bunnyHopBoost: DEFAULT_PLAYER_START_BUNNY_HOP_BOOST
};
export const DEFAULT_PLAYER_START_SPRINT_SETTINGS: PlayerStartSprintSettings = {
  speedMultiplier: DEFAULT_PLAYER_START_SPRINT_SPEED_MULTIPLIER
};
export const DEFAULT_PLAYER_START_CROUCH_SETTINGS: PlayerStartCrouchSettings = {
  speedMultiplier: DEFAULT_PLAYER_START_CROUCH_SPEED_MULTIPLIER
};
export const RESPONSIVE_PLAYER_START_JUMP_BUFFER_MS = 120;
export const RESPONSIVE_PLAYER_START_COYOTE_TIME_MS = 120;
export const RESPONSIVE_PLAYER_START_VARIABLE_JUMP_MAX_HOLD_MS = 180;
export const RESPONSIVE_PLAYER_START_JUMP_SETTINGS: PlayerStartJumpSettings = {
  speed: DEFAULT_PLAYER_START_JUMP_SPEED,
  bufferMs: RESPONSIVE_PLAYER_START_JUMP_BUFFER_MS,
  coyoteTimeMs: RESPONSIVE_PLAYER_START_COYOTE_TIME_MS,
  variableHeight: true,
  maxHoldMs: RESPONSIVE_PLAYER_START_VARIABLE_JUMP_MAX_HOLD_MS,
  moveWhileJumping: DEFAULT_PLAYER_START_MOVE_WHILE_JUMPING,
  moveWhileFalling: DEFAULT_PLAYER_START_MOVE_WHILE_FALLING,
  directionOnly: DEFAULT_PLAYER_START_AIR_DIRECTION_ONLY,
  bunnyHop: DEFAULT_PLAYER_START_BUNNY_HOP,
  bunnyHopBoost: DEFAULT_PLAYER_START_BUNNY_HOP_BOOST
};
export const DEFAULT_PLAYER_START_KEYBOARD_BINDINGS: PlayerStartKeyboardBindings =
  {
    moveForward: "KeyW",
    moveBackward: "KeyS",
    moveLeft: "KeyA",
    moveRight: "KeyD",
    jump: "Space",
    sprint: "ShiftLeft",
    crouch: "ControlLeft",
    pauseTime: "KeyP"
  };
export const DEFAULT_PLAYER_START_GAMEPAD_BINDINGS: PlayerStartGamepadBindings =
  {
    moveForward: "leftStickUp",
    moveBackward: "leftStickDown",
    moveLeft: "leftStickLeft",
    moveRight: "leftStickRight",
    jump: "buttonSouth",
    sprint: "leftStickPress",
    crouch: "buttonEast",
    pauseTime: "buttonMenu",
    cameraLook: "rightStick"
  };
export const DEFAULT_SCENE_ENTRY_YAW_DEGREES = 0;
export const DEFAULT_NPC_YAW_DEGREES = 0;
export const DEFAULT_NPC_MODEL_ASSET_ID: string | null = null;
export const DEFAULT_NPC_DIALOGUE_ID: string | null = null;
export const DEFAULT_NPC_COLLIDER_MODE: PlayerStartColliderMode = "capsule";
export const DEFAULT_NPC_TIME_WINDOW_START_HOUR = 9;
export const DEFAULT_NPC_TIME_WINDOW_END_HOUR = 17;
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

export function isCameraRigType(value: string): value is CameraRigType {
  return CAMERA_RIG_TYPES.includes(value as CameraRigType);
}

export function isCameraRigTargetKind(
  value: unknown
): value is CameraRigTargetKind {
  return (
    typeof value === "string" &&
    CAMERA_RIG_TARGET_KINDS.includes(value as CameraRigTargetKind)
  );
}

export function isCameraRigTransitionMode(
  value: string
): value is CameraRigTransitionMode {
  return CAMERA_RIG_TRANSITION_MODES.includes(value as CameraRigTransitionMode);
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

export function isPlayerStartGamepadActionBinding(
  value: string
): value is PlayerStartGamepadActionBinding {
  return PLAYER_START_GAMEPAD_ACTION_BINDINGS.includes(
    value as PlayerStartGamepadActionBinding
  );
}

export function isPlayerStartGamepadCameraLookBinding(
  value: string
): value is PlayerStartGamepadCameraLookBinding {
  return PLAYER_START_GAMEPAD_CAMERA_LOOK_BINDINGS.includes(
    value as PlayerStartGamepadCameraLookBinding
  );
}

function cloneCharacterColliderSettings(
  settings: CharacterColliderSettings
): CharacterColliderSettings {
  return {
    mode: settings.mode,
    eyeHeight: settings.eyeHeight,
    capsuleRadius: settings.capsuleRadius,
    capsuleHeight: settings.capsuleHeight,
    boxSize: cloneVec3(settings.boxSize)
  };
}

export function clonePlayerStartColliderSettings(
  settings: PlayerStartColliderSettings
): PlayerStartColliderSettings {
  return cloneCharacterColliderSettings(settings);
}

export function cloneNpcColliderSettings(
  settings: NpcColliderSettings
): NpcColliderSettings {
  return cloneCharacterColliderSettings(settings);
}

function normalizeCameraRigTargetActorId(actorId: string): string {
  const normalizedActorId = actorId.trim();

  if (normalizedActorId.length === 0) {
    throw new Error("Camera Rig actor targets must reference a non-empty actor id.");
  }

  return normalizedActorId;
}

function normalizeCameraRigTargetEntityId(entityId: string): string {
  const normalizedEntityId = entityId.trim();

  if (normalizedEntityId.length === 0) {
    throw new Error("Camera Rig entity targets must reference a non-empty entity id.");
  }

  return normalizedEntityId;
}

export function createCameraRigPlayerTargetRef(): CameraRigPlayerTargetRef {
  return {
    kind: "player"
  };
}

export function createCameraRigActorTargetRef(
  actorId: string
): CameraRigActorTargetRef {
  return {
    kind: "actor",
    actorId: normalizeCameraRigTargetActorId(actorId)
  };
}

export function createCameraRigEntityTargetRef(
  entityId: string
): CameraRigEntityTargetRef {
  return {
    kind: "entity",
    entityId: normalizeCameraRigTargetEntityId(entityId)
  };
}

export function createCameraRigWorldPointTargetRef(
  point: Vec3 = DEFAULT_ENTITY_POSITION
): CameraRigWorldPointTargetRef {
  const normalizedPoint = cloneVec3(point);
  assertFiniteVec3(normalizedPoint, "Camera Rig world-point target");

  return {
    kind: "worldPoint",
    point: normalizedPoint
  };
}

export function cloneCameraRigTargetRef(target: CameraRigTargetRef): CameraRigTargetRef {
  switch (target.kind) {
    case "player":
      return createCameraRigPlayerTargetRef();
    case "actor":
      return createCameraRigActorTargetRef(target.actorId);
    case "entity":
      return createCameraRigEntityTargetRef(target.entityId);
    case "worldPoint":
      return createCameraRigWorldPointTargetRef(target.point);
  }
}

function normalizeCameraRigTargetRef(
  target: CameraRigTargetRef | undefined
): CameraRigTargetRef {
  if (target === undefined) {
    return createCameraRigPlayerTargetRef();
  }

  return cloneCameraRigTargetRef(target);
}

export function areCameraRigTargetRefsEqual(
  left: CameraRigTargetRef,
  right: CameraRigTargetRef
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  switch (left.kind) {
    case "player":
      return true;
    case "actor":
      return right.kind === "actor" && left.actorId === right.actorId;
    case "entity":
      return right.kind === "entity" && left.entityId === right.entityId;
    case "worldPoint":
      return right.kind === "worldPoint" && areVec3Equal(left.point, right.point);
  }
}

export function createCameraRigLookAroundSettings(
  overrides: Partial<CameraRigLookAroundSettings> = {}
): CameraRigLookAroundSettings {
  const enabled =
    overrides.enabled ?? DEFAULT_CAMERA_RIG_LOOK_AROUND_ENABLED;
  const yawLimitDegrees =
    overrides.yawLimitDegrees ??
    DEFAULT_CAMERA_RIG_LOOK_AROUND_YAW_LIMIT_DEGREES;
  const pitchLimitDegrees =
    overrides.pitchLimitDegrees ??
    DEFAULT_CAMERA_RIG_LOOK_AROUND_PITCH_LIMIT_DEGREES;
  const recenterSpeed =
    overrides.recenterSpeed ?? DEFAULT_CAMERA_RIG_LOOK_AROUND_RECENTER_SPEED;

  assertBoolean(enabled, "Camera Rig look-around enabled");
  assertNonNegativeFiniteNumber(
    yawLimitDegrees,
    "Camera Rig look-around yaw limit"
  );
  assertNonNegativeFiniteNumber(
    pitchLimitDegrees,
    "Camera Rig look-around pitch limit"
  );
  assertNonNegativeFiniteNumber(
    recenterSpeed,
    "Camera Rig look-around recenter speed"
  );

  return {
    enabled,
    yawLimitDegrees,
    pitchLimitDegrees,
    recenterSpeed
  };
}

export function cloneCameraRigLookAroundSettings(
  settings: CameraRigLookAroundSettings
): CameraRigLookAroundSettings {
  return createCameraRigLookAroundSettings(settings);
}

export function areCameraRigLookAroundSettingsEqual(
  left: CameraRigLookAroundSettings,
  right: CameraRigLookAroundSettings
): boolean {
  return (
    left.enabled === right.enabled &&
    left.yawLimitDegrees === right.yawLimitDegrees &&
    left.pitchLimitDegrees === right.pitchLimitDegrees &&
    left.recenterSpeed === right.recenterSpeed
  );
}

function getPrimaryCameraRigDocumentPlayerTarget(
  entities: Record<string, EntityInstance>
): PlayerStartEntity | null {
  return getPrimaryEnabledPlayerStartEntity(entities) ?? getPrimaryPlayerStartEntity(entities);
}

export function resolveCameraRigDocumentTargetPosition(
  target: CameraRigTargetRef,
  entities: Record<string, EntityInstance>
): Vec3 | null {
  switch (target.kind) {
    case "player":
      return getPrimaryCameraRigDocumentPlayerTarget(entities)?.position ?? null;
    case "actor": {
      const enabledNpc =
        getEntityInstances(entities).find(
          (entity): entity is NpcEntity =>
            entity.kind === "npc" &&
            entity.enabled &&
            entity.actorId === target.actorId
        ) ?? null;
      const fallbackNpc =
        enabledNpc ??
        getEntityInstances(entities).find(
          (entity): entity is NpcEntity =>
            entity.kind === "npc" && entity.actorId === target.actorId
        ) ??
        null;
      return fallbackNpc === null ? null : cloneVec3(fallbackNpc.position);
    }
    case "entity": {
      const entity = entities[target.entityId] ?? null;
      return entity === null ? null : cloneVec3(entity.position);
    }
    case "worldPoint":
      return cloneVec3(target.point);
  }
}

export function resolveCameraRigDocumentLookTarget(
  rig: Pick<CameraRigEntity, "target" | "targetOffset">,
  entities: Record<string, EntityInstance>
): Vec3 | null {
  const baseTarget = resolveCameraRigDocumentTargetPosition(rig.target, entities);

  if (baseTarget === null) {
    return null;
  }

  return {
    x: baseTarget.x + rig.targetOffset.x,
    y: baseTarget.y + rig.targetOffset.y,
    z: baseTarget.z + rig.targetOffset.z
  };
}

function clonePlayerStartMovementCapabilities(
  capabilities: PlayerStartMovementCapabilities
): PlayerStartMovementCapabilities {
  return {
    jump: capabilities.jump,
    sprint: capabilities.sprint,
    crouch: capabilities.crouch
  };
}

function clonePlayerStartJumpSettings(
  settings: PlayerStartJumpSettings
): PlayerStartJumpSettings {
  return {
    speed: settings.speed,
    bufferMs: settings.bufferMs,
    coyoteTimeMs: settings.coyoteTimeMs,
    variableHeight: settings.variableHeight,
    maxHoldMs: settings.maxHoldMs,
    moveWhileJumping: settings.moveWhileJumping,
    moveWhileFalling: settings.moveWhileFalling,
    directionOnly: settings.directionOnly,
    bunnyHop: settings.bunnyHop,
    bunnyHopBoost: settings.bunnyHopBoost
  };
}

function clonePlayerStartSprintSettings(
  settings: PlayerStartSprintSettings
): PlayerStartSprintSettings {
  return {
    speedMultiplier: settings.speedMultiplier
  };
}

function clonePlayerStartCrouchSettings(
  settings: PlayerStartCrouchSettings
): PlayerStartCrouchSettings {
  return {
    speedMultiplier: settings.speedMultiplier
  };
}

export function clonePlayerStartMovementTemplate(
  template: PlayerStartMovementTemplate
): PlayerStartMovementTemplate {
  return {
    kind: template.kind,
    moveSpeed: template.moveSpeed,
    maxSpeed: template.maxSpeed,
    maxStepHeight: template.maxStepHeight,
    capabilities: clonePlayerStartMovementCapabilities(template.capabilities),
    jump: clonePlayerStartJumpSettings(template.jump),
    sprint: clonePlayerStartSprintSettings(template.sprint),
    crouch: clonePlayerStartCrouchSettings(template.crouch)
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
      moveRight: bindings.keyboard.moveRight,
      jump: bindings.keyboard.jump,
      sprint: bindings.keyboard.sprint,
      crouch: bindings.keyboard.crouch,
      pauseTime: bindings.keyboard.pauseTime
    },
    gamepad: {
      moveForward: bindings.gamepad.moveForward,
      moveBackward: bindings.gamepad.moveBackward,
      moveLeft: bindings.gamepad.moveLeft,
      moveRight: bindings.gamepad.moveRight,
      jump: bindings.gamepad.jump,
      sprint: bindings.gamepad.sprint,
      crouch: bindings.gamepad.crouch,
      pauseTime: bindings.gamepad.pauseTime,
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
      DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.moveRight,
    jump:
      overrides.keyboard?.jump ?? DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.jump,
    sprint:
      overrides.keyboard?.sprint ??
      DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.sprint,
    crouch:
      overrides.keyboard?.crouch ??
      DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.crouch,
    pauseTime:
      overrides.keyboard?.pauseTime ??
      DEFAULT_PLAYER_START_KEYBOARD_BINDINGS.pauseTime
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
    jump:
      overrides.gamepad?.jump ?? DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.jump,
    sprint:
      overrides.gamepad?.sprint ??
      DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.sprint,
    crouch:
      overrides.gamepad?.crouch ??
      DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.crouch,
    pauseTime:
      overrides.gamepad?.pauseTime ??
      DEFAULT_PLAYER_START_GAMEPAD_BINDINGS.pauseTime,
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

  if (!isPlayerStartKeyboardBindingCode(keyboard.jump)) {
    throw new Error("Player Start jump keyboard binding must be supported.");
  }

  if (!isPlayerStartKeyboardBindingCode(keyboard.sprint)) {
    throw new Error("Player Start sprint keyboard binding must be supported.");
  }

  if (!isPlayerStartKeyboardBindingCode(keyboard.crouch)) {
    throw new Error("Player Start crouch keyboard binding must be supported.");
  }

  if (!isPlayerStartKeyboardBindingCode(keyboard.pauseTime)) {
    throw new Error("Player Start pause keyboard binding must be supported.");
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

  if (!isPlayerStartGamepadActionBinding(gamepad.jump)) {
    throw new Error("Player Start jump gamepad binding must be supported.");
  }

  if (!isPlayerStartGamepadActionBinding(gamepad.sprint)) {
    throw new Error("Player Start sprint gamepad binding must be supported.");
  }

  if (!isPlayerStartGamepadActionBinding(gamepad.crouch)) {
    throw new Error("Player Start crouch gamepad binding must be supported.");
  }

  if (!isPlayerStartGamepadActionBinding(gamepad.pauseTime)) {
    throw new Error("Player Start pause gamepad binding must be supported.");
  }

  if (!isPlayerStartGamepadCameraLookBinding(gamepad.cameraLook)) {
    throw new Error("Player Start camera-look gamepad binding must be supported.");
  }

  return {
    keyboard,
    gamepad
  };
}

export function isPlayerStartMovementTemplateKind(
  value: string
): value is PlayerStartMovementTemplateKind {
  return PLAYER_START_MOVEMENT_TEMPLATE_KINDS.includes(
    value as PlayerStartMovementTemplateKind
  );
}

export function createPlayerStartMovementTemplate(
  overrides: PlayerStartMovementTemplateOverrides = {}
): PlayerStartMovementTemplate {
  const kind =
    overrides.kind ?? DEFAULT_PLAYER_START_MOVEMENT_TEMPLATE_KIND;

  if (!isPlayerStartMovementTemplateKind(kind)) {
    throw new Error(
      "Player Start movement template must be default, responsive, or custom."
    );
  }

  const preset =
    kind === "responsive"
      ? {
          moveSpeed: DEFAULT_PLAYER_START_MOVE_SPEED,
          maxSpeed: DEFAULT_PLAYER_START_MAX_SPEED,
          maxStepHeight: DEFAULT_PLAYER_START_MAX_STEP_HEIGHT,
          capabilities: DEFAULT_PLAYER_START_MOVEMENT_CAPABILITIES,
          jump: RESPONSIVE_PLAYER_START_JUMP_SETTINGS,
          sprint: DEFAULT_PLAYER_START_SPRINT_SETTINGS,
          crouch: DEFAULT_PLAYER_START_CROUCH_SETTINGS
        }
      : {
          moveSpeed: DEFAULT_PLAYER_START_MOVE_SPEED,
          maxSpeed: DEFAULT_PLAYER_START_MAX_SPEED,
          maxStepHeight: DEFAULT_PLAYER_START_MAX_STEP_HEIGHT,
          capabilities: DEFAULT_PLAYER_START_MOVEMENT_CAPABILITIES,
          jump: DEFAULT_PLAYER_START_JUMP_SETTINGS,
          sprint: DEFAULT_PLAYER_START_SPRINT_SETTINGS,
          crouch: DEFAULT_PLAYER_START_CROUCH_SETTINGS
        };
  const moveSpeed = overrides.moveSpeed ?? preset.moveSpeed;
  const maxSpeed = overrides.maxSpeed ?? preset.maxSpeed;
  const maxStepHeight = overrides.maxStepHeight ?? preset.maxStepHeight;
  const capabilities: PlayerStartMovementCapabilities = {
    jump:
      overrides.capabilities?.jump ?? preset.capabilities.jump,
    sprint:
      overrides.capabilities?.sprint ?? preset.capabilities.sprint,
    crouch:
      overrides.capabilities?.crouch ?? preset.capabilities.crouch
  };
  const jump: PlayerStartJumpSettings = {
    speed: overrides.jump?.speed ?? preset.jump.speed,
    bufferMs: overrides.jump?.bufferMs ?? preset.jump.bufferMs,
    coyoteTimeMs:
      overrides.jump?.coyoteTimeMs ?? preset.jump.coyoteTimeMs,
    variableHeight:
      overrides.jump?.variableHeight ?? preset.jump.variableHeight,
    maxHoldMs: overrides.jump?.maxHoldMs ?? preset.jump.maxHoldMs,
    moveWhileJumping:
      overrides.jump?.moveWhileJumping ?? preset.jump.moveWhileJumping,
    moveWhileFalling:
      overrides.jump?.moveWhileFalling ?? preset.jump.moveWhileFalling,
    directionOnly:
      overrides.jump?.directionOnly ?? preset.jump.directionOnly,
    bunnyHop: overrides.jump?.bunnyHop ?? preset.jump.bunnyHop,
    bunnyHopBoost:
      overrides.jump?.bunnyHopBoost ?? preset.jump.bunnyHopBoost
  };
  const sprint: PlayerStartSprintSettings = {
    speedMultiplier:
      overrides.sprint?.speedMultiplier ?? preset.sprint.speedMultiplier
  };
  const crouch: PlayerStartCrouchSettings = {
    speedMultiplier:
      overrides.crouch?.speedMultiplier ?? preset.crouch.speedMultiplier
  };

  assertPositiveFiniteNumber(moveSpeed, "Player Start move speed");
  assertNonNegativeFiniteNumber(maxSpeed, "Player Start max speed");
  assertNonNegativeFiniteNumber(
    maxStepHeight,
    "Player Start max step height"
  );
  assertBoolean(
    capabilities.jump,
    "Player Start movement template jump capability"
  );
  assertBoolean(
    capabilities.sprint,
    "Player Start movement template sprint capability"
  );
  assertBoolean(
    capabilities.crouch,
    "Player Start movement template crouch capability"
  );
  assertPositiveFiniteNumber(jump.speed, "Player Start jump speed");
  assertNonNegativeFiniteNumber(
    jump.bufferMs,
    "Player Start jump buffer milliseconds"
  );
  assertNonNegativeFiniteNumber(
    jump.coyoteTimeMs,
    "Player Start coyote time milliseconds"
  );
  assertBoolean(
    jump.variableHeight,
    "Player Start variable jump height setting"
  );
  assertPositiveFiniteNumber(
    jump.maxHoldMs,
    "Player Start variable jump max hold milliseconds"
  );
  assertBoolean(
    jump.moveWhileJumping,
    "Player Start move while jumping setting"
  );
  assertBoolean(
    jump.moveWhileFalling,
    "Player Start move while falling setting"
  );
  assertBoolean(
    jump.directionOnly,
    "Player Start air direction only setting"
  );
  assertBoolean(jump.bunnyHop, "Player Start bunny hop setting");
  assertNonNegativeFiniteNumber(
    jump.bunnyHopBoost,
    "Player Start bunny hop boost"
  );
  assertPositiveFiniteNumber(
    sprint.speedMultiplier,
    "Player Start sprint speed multiplier"
  );
  assertPositiveFiniteNumber(
    crouch.speedMultiplier,
    "Player Start crouch speed multiplier"
  );

  return {
    kind,
    moveSpeed,
    maxSpeed,
    maxStepHeight,
    capabilities,
    jump,
    sprint,
    crouch
  };
}

export function inferPlayerStartMovementTemplateKind(
  template: Omit<PlayerStartMovementTemplate, "kind"> | PlayerStartMovementTemplate
): PlayerStartMovementTemplateKind {
  const candidate = createPlayerStartMovementTemplate({
    kind: "custom",
    moveSpeed: template.moveSpeed,
    maxSpeed: template.maxSpeed,
    maxStepHeight: template.maxStepHeight,
    capabilities: template.capabilities,
    jump: template.jump,
    sprint: template.sprint,
    crouch: template.crouch
  });

  for (const presetKind of PLAYER_START_MOVEMENT_TEMPLATE_KINDS) {
    if (presetKind === "custom") {
      continue;
    }

    if (
      candidate.moveSpeed ===
        createPlayerStartMovementTemplate({ kind: presetKind }).moveSpeed &&
      candidate.maxSpeed ===
        createPlayerStartMovementTemplate({ kind: presetKind }).maxSpeed &&
      candidate.maxStepHeight ===
        createPlayerStartMovementTemplate({ kind: presetKind }).maxStepHeight &&
      candidate.capabilities.jump ===
        createPlayerStartMovementTemplate({ kind: presetKind }).capabilities.jump &&
      candidate.capabilities.sprint ===
        createPlayerStartMovementTemplate({ kind: presetKind }).capabilities.sprint &&
      candidate.capabilities.crouch ===
        createPlayerStartMovementTemplate({ kind: presetKind }).capabilities.crouch &&
      candidate.jump.speed ===
        createPlayerStartMovementTemplate({ kind: presetKind }).jump.speed &&
      candidate.jump.bufferMs ===
        createPlayerStartMovementTemplate({ kind: presetKind }).jump.bufferMs &&
      candidate.jump.coyoteTimeMs ===
        createPlayerStartMovementTemplate({ kind: presetKind }).jump.coyoteTimeMs &&
      candidate.jump.variableHeight ===
        createPlayerStartMovementTemplate({ kind: presetKind }).jump.variableHeight &&
      candidate.jump.maxHoldMs ===
        createPlayerStartMovementTemplate({ kind: presetKind }).jump.maxHoldMs &&
      candidate.jump.moveWhileJumping ===
        createPlayerStartMovementTemplate({ kind: presetKind }).jump.moveWhileJumping &&
      candidate.jump.moveWhileFalling ===
        createPlayerStartMovementTemplate({ kind: presetKind }).jump.moveWhileFalling &&
      candidate.jump.directionOnly ===
        createPlayerStartMovementTemplate({ kind: presetKind }).jump.directionOnly &&
      candidate.jump.bunnyHop ===
        createPlayerStartMovementTemplate({ kind: presetKind }).jump.bunnyHop &&
      candidate.jump.bunnyHopBoost ===
        createPlayerStartMovementTemplate({ kind: presetKind }).jump.bunnyHopBoost &&
      candidate.sprint.speedMultiplier ===
        createPlayerStartMovementTemplate({ kind: presetKind }).sprint.speedMultiplier &&
      candidate.crouch.speedMultiplier ===
        createPlayerStartMovementTemplate({ kind: presetKind }).crouch.speedMultiplier
    ) {
      return presetKind;
    }
  }

  return "custom";
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
    left.keyboard.jump === right.keyboard.jump &&
    left.keyboard.sprint === right.keyboard.sprint &&
    left.keyboard.crouch === right.keyboard.crouch &&
    left.keyboard.pauseTime === right.keyboard.pauseTime &&
    left.gamepad.moveForward === right.gamepad.moveForward &&
    left.gamepad.moveBackward === right.gamepad.moveBackward &&
    left.gamepad.moveLeft === right.gamepad.moveLeft &&
    left.gamepad.moveRight === right.gamepad.moveRight &&
    left.gamepad.jump === right.gamepad.jump &&
    left.gamepad.sprint === right.gamepad.sprint &&
    left.gamepad.crouch === right.gamepad.crouch &&
    left.gamepad.pauseTime === right.gamepad.pauseTime &&
    left.gamepad.cameraLook === right.gamepad.cameraLook
  );
}

export function arePlayerStartMovementTemplatesEqual(
  left: PlayerStartMovementTemplate,
  right: PlayerStartMovementTemplate
): boolean {
  return (
    left.kind === right.kind &&
    left.moveSpeed === right.moveSpeed &&
    left.maxSpeed === right.maxSpeed &&
    left.maxStepHeight === right.maxStepHeight &&
    left.capabilities.jump === right.capabilities.jump &&
    left.capabilities.sprint === right.capabilities.sprint &&
    left.capabilities.crouch === right.capabilities.crouch &&
    left.jump.speed === right.jump.speed &&
    left.jump.bufferMs === right.jump.bufferMs &&
    left.jump.coyoteTimeMs === right.jump.coyoteTimeMs &&
    left.jump.variableHeight === right.jump.variableHeight &&
    left.jump.maxHoldMs === right.jump.maxHoldMs &&
    left.jump.moveWhileJumping === right.jump.moveWhileJumping &&
    left.jump.moveWhileFalling === right.jump.moveWhileFalling &&
    left.jump.directionOnly === right.jump.directionOnly &&
    left.jump.bunnyHop === right.jump.bunnyHop &&
    left.jump.bunnyHopBoost === right.jump.bunnyHopBoost &&
    left.sprint.speedMultiplier === right.sprint.speedMultiplier &&
    left.crouch.speedMultiplier === right.crouch.speedMultiplier
  );
}

function getCharacterColliderHeight(
  settings: CharacterColliderSettings
): number | null {
  switch (settings.mode) {
    case "capsule":
      return settings.capsuleHeight;
    case "box":
      return settings.boxSize.y;
    case "none":
      return null;
  }
}

export function getPlayerStartColliderHeight(
  settings: PlayerStartColliderSettings
): number | null {
  return getCharacterColliderHeight(settings);
}

export function getNpcColliderHeight(
  settings: NpcColliderSettings
): number | null {
  return getCharacterColliderHeight(settings);
}

function createCharacterColliderSettings(
  label: string,
  overrides: Partial<CharacterColliderSettings> = {},
  defaults: Partial<CharacterColliderSettings> = {}
): CharacterColliderSettings {
  const mode = overrides.mode ?? defaults.mode ?? DEFAULT_PLAYER_START_COLLIDER_MODE;
  const eyeHeight =
    overrides.eyeHeight ?? defaults.eyeHeight ?? DEFAULT_PLAYER_START_EYE_HEIGHT;
  const capsuleRadius =
    overrides.capsuleRadius ??
    defaults.capsuleRadius ??
    DEFAULT_PLAYER_START_CAPSULE_RADIUS;
  const capsuleHeight =
    overrides.capsuleHeight ??
    defaults.capsuleHeight ??
    DEFAULT_PLAYER_START_CAPSULE_HEIGHT;
  const boxSize = cloneVec3(
    overrides.boxSize ?? defaults.boxSize ?? DEFAULT_PLAYER_START_BOX_SIZE
  );

  if (!isPlayerStartColliderMode(mode)) {
    throw new Error(`${label} collider mode must be capsule, box, or none.`);
  }

  assertPositiveFiniteNumber(eyeHeight, `${label} eye height`);
  assertPositiveFiniteNumber(capsuleRadius, `${label} capsule radius`);
  assertPositiveFiniteNumber(capsuleHeight, `${label} capsule height`);
  assertPositiveFiniteVec3(boxSize, `${label} box size`);

  if (capsuleHeight < capsuleRadius * 2) {
    throw new Error(
      `${label} capsule height must be at least twice the capsule radius.`
    );
  }

  if (mode === "capsule" && eyeHeight > capsuleHeight) {
    throw new Error(
      `${label} eye height must be less than or equal to the capsule height.`
    );
  }

  if (mode === "box" && eyeHeight > boxSize.y) {
    throw new Error(
      `${label} eye height must be less than or equal to the box height.`
    );
  }

  return {
    mode,
    eyeHeight,
    capsuleRadius,
    capsuleHeight,
    boxSize
  };
}

export function createPlayerStartColliderSettings(
  overrides: Partial<PlayerStartColliderSettings> = {}
): PlayerStartColliderSettings {
  return createCharacterColliderSettings("Player Start", overrides);
}

export function createNpcColliderSettings(
  overrides: Partial<NpcColliderSettings> = {}
): NpcColliderSettings {
  return createCharacterColliderSettings("NPC", overrides, {
    mode: DEFAULT_NPC_COLLIDER_MODE,
    eyeHeight: DEFAULT_PLAYER_START_EYE_HEIGHT,
    capsuleRadius: DEFAULT_PLAYER_START_CAPSULE_RADIUS,
    capsuleHeight: DEFAULT_PLAYER_START_CAPSULE_HEIGHT,
    boxSize: DEFAULT_PLAYER_START_BOX_SIZE
  });
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

export function normalizeEntityName(name: string | null | undefined): string | undefined {
  if (name === undefined || name === null) {
    return undefined;
  }

  const trimmedName = name.trim();
  return trimmedName.length === 0 ? undefined : trimmedName;
}

function resolveAuthoredEntityVisibility(visible: boolean | undefined): boolean {
  const resolvedVisible = visible ?? DEFAULT_ENTITY_VISIBLE;

  assertBoolean(resolvedVisible, "Entity visible");
  return resolvedVisible;
}

function resolveAuthoredEntityEnabled(enabled: boolean | undefined): boolean {
  const resolvedEnabled = enabled ?? DEFAULT_ENTITY_ENABLED;

  assertBoolean(resolvedEnabled, "Entity enabled");
  return resolvedEnabled;
}

export function normalizeYawDegrees(yawDegrees: number): number {
  const normalizedYaw = yawDegrees % 360;
  return normalizedYaw < 0 ? normalizedYaw + 360 : normalizedYaw;
}

export function createNpcActorId(): string {
  return createOpaqueId("actor");
}

export function isNpcPresenceMode(value: unknown): value is NpcPresenceMode {
  return typeof value === "string" && NPC_PRESENCE_MODES.includes(value as NpcPresenceMode);
}

export function createNpcAlwaysPresence(): NpcAlwaysPresence {
  return {
    mode: "always"
  };
}

export function createNpcTimeWindowPresence(
  overrides: Partial<Pick<NpcTimeWindowPresence, "startHour" | "endHour">> = {}
): NpcTimeWindowPresence {
  const startHour = normalizeTimeOfDayHours(
    overrides.startHour ?? DEFAULT_NPC_TIME_WINDOW_START_HOUR
  );
  const endHour = normalizeTimeOfDayHours(
    overrides.endHour ?? DEFAULT_NPC_TIME_WINDOW_END_HOUR
  );

  if (!Number.isFinite(startHour)) {
    throw new Error("NPC presence window start hour must be a finite number.");
  }

  if (!Number.isFinite(endHour)) {
    throw new Error("NPC presence window end hour must be a finite number.");
  }

  return {
    mode: "timeWindow",
    startHour,
    endHour
  };
}

export function cloneNpcPresence(presence: NpcPresence): NpcPresence {
  switch (presence.mode) {
    case "always":
      return createNpcAlwaysPresence();
    case "timeWindow":
      return createNpcTimeWindowPresence(presence);
  }
}

export function areNpcPresencesEqual(
  left: NpcPresence,
  right: NpcPresence
): boolean {
  if (left.mode !== right.mode) {
    return false;
  }

  if (left.mode === "always") {
    return true;
  }

  return (
    right.mode === "timeWindow" &&
    left.startHour === right.startHour &&
    left.endHour === right.endHour
  );
}

function normalizeNpcPresence(
  presence: NpcPresence | undefined
): NpcPresence {
  if (presence === undefined) {
    return createNpcAlwaysPresence();
  }

  switch (presence.mode) {
    case "always":
      return createNpcAlwaysPresence();
    case "timeWindow":
      return createNpcTimeWindowPresence(presence);
  }
}

function normalizeNpcActorId(actorId: string | undefined): string {
  const resolvedActorId = actorId ?? createNpcActorId();
  const normalizedActorId = resolvedActorId.trim();

  if (normalizedActorId.length === 0) {
    throw new Error("NPC actorId must be a non-empty string.");
  }

  return normalizedActorId;
}

function normalizeNpcModelAssetId(
  modelAssetId: string | null | undefined
): string | null {
  if (modelAssetId === undefined || modelAssetId === null) {
    return null;
  }

  const normalizedModelAssetId = modelAssetId.trim();
  return normalizedModelAssetId.length === 0 ? null : normalizedModelAssetId;
}

function normalizeNpcDialogues(
  dialogues: ProjectDialogue[] | undefined
): ProjectDialogue[] {
  if (dialogues === undefined) {
    return [];
  }

  return dialogues.map(cloneProjectDialogue);
}

function normalizeNpcDefaultDialogueId(
  defaultDialogueId: string | null | undefined,
  dialogues: readonly ProjectDialogue[]
): string | null {
  if (defaultDialogueId === undefined || defaultDialogueId === null) {
    return null;
  }

  const normalizedDefaultDialogueId = defaultDialogueId.trim();

  if (normalizedDefaultDialogueId.length === 0) {
    return null;
  }

  return dialogues.some((dialogue) => dialogue.id === normalizedDefaultDialogueId)
    ? normalizedDefaultDialogueId
    : null;
}

export function normalizeInteractablePrompt(prompt: string): string {
  const normalizedPrompt = prompt.trim();

  if (normalizedPrompt.length === 0) {
    throw new Error("Interactable prompt must be non-empty.");
  }

  return normalizedPrompt;
}

export function createPointLightEntity(
  overrides: Partial<Pick<PointLightEntity, "id" | "name" | "visible" | "enabled" | "position" | "colorHex" | "intensity" | "distance">> = {}
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
    visible: resolveAuthoredEntityVisibility(overrides.visible),
    enabled: resolveAuthoredEntityEnabled(overrides.enabled),
    position,
    colorHex,
    intensity,
    distance
  };
}

export function createSpotLightEntity(
  overrides: Partial<Pick<SpotLightEntity, "id" | "name" | "visible" | "enabled" | "position" | "direction" | "colorHex" | "intensity" | "distance" | "angleDegrees">> = {}
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
    visible: resolveAuthoredEntityVisibility(overrides.visible),
    enabled: resolveAuthoredEntityEnabled(overrides.enabled),
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
      "id" | "name" | "visible" | "enabled" | "position" | "yawDegrees" | "navigationMode"
    >
  > & {
    movementTemplate?: PlayerStartMovementTemplateOverrides;
    inputBindings?: PlayerStartInputBindingOverrides;
    collider?: Partial<PlayerStartColliderSettings>;
  } = {}
): PlayerStartEntity {
  const position = cloneVec3(overrides.position ?? DEFAULT_PLAYER_START_POSITION);
  const yawDegrees = overrides.yawDegrees ?? DEFAULT_PLAYER_START_YAW_DEGREES;
  const navigationMode =
    overrides.navigationMode ?? DEFAULT_PLAYER_START_NAVIGATION_MODE;
  const movementTemplate = createPlayerStartMovementTemplate(
    overrides.movementTemplate
  );
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
    visible: resolveAuthoredEntityVisibility(overrides.visible),
    enabled: resolveAuthoredEntityEnabled(overrides.enabled),
    position,
    yawDegrees: normalizeYawDegrees(yawDegrees),
    navigationMode,
    movementTemplate,
    inputBindings,
    collider
  };
}

export function createSceneEntryEntity(
  overrides: Partial<Pick<SceneEntryEntity, "id" | "name" | "visible" | "enabled" | "position" | "yawDegrees">> = {}
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
    visible: resolveAuthoredEntityVisibility(overrides.visible),
    enabled: resolveAuthoredEntityEnabled(overrides.enabled),
    position,
    yawDegrees: normalizeYawDegrees(yawDegrees)
  };
}

export function createCameraRigEntity(
  overrides: Partial<
    Pick<
      CameraRigEntity,
      | "id"
      | "name"
      | "visible"
      | "enabled"
      | "position"
      | "rigType"
      | "priority"
      | "defaultActive"
      | "target"
      | "targetOffset"
      | "transitionMode"
      | "transitionDurationSeconds"
    >
  > & {
    lookAround?: Partial<CameraRigLookAroundSettings>;
  } = {}
): CameraRigEntity {
  const position = cloneVec3(overrides.position ?? DEFAULT_ENTITY_POSITION);
  const rigType = overrides.rigType ?? "fixed";
  const priority = overrides.priority ?? DEFAULT_CAMERA_RIG_PRIORITY;
  const defaultActive =
    overrides.defaultActive ?? DEFAULT_CAMERA_RIG_DEFAULT_ACTIVE;
  const target = normalizeCameraRigTargetRef(overrides.target);
  const targetOffset = cloneVec3(
    overrides.targetOffset ?? DEFAULT_CAMERA_RIG_TARGET_OFFSET
  );
  const transitionMode =
    overrides.transitionMode ?? DEFAULT_CAMERA_RIG_TRANSITION_MODE;
  const transitionDurationSeconds =
    overrides.transitionDurationSeconds ??
    DEFAULT_CAMERA_RIG_TRANSITION_DURATION_SECONDS;
  const lookAround = createCameraRigLookAroundSettings(overrides.lookAround);

  assertFiniteVec3(position, "Camera Rig position");
  assertFiniteVec3(targetOffset, "Camera Rig target offset");
  assertBoolean(defaultActive, "Camera Rig defaultActive");
  assertNonNegativeFiniteNumber(priority, "Camera Rig priority");
  assertNonNegativeFiniteNumber(
    transitionDurationSeconds,
    "Camera Rig transition duration"
  );

  if (!isCameraRigType(rigType)) {
    throw new Error("Camera Rig type must currently be fixed.");
  }

  if (!isCameraRigTransitionMode(transitionMode)) {
    throw new Error("Camera Rig transition mode must be cut or blend.");
  }

  return {
    id: overrides.id ?? createOpaqueId("entity-camera-rig"),
    kind: "cameraRig",
    name: normalizeEntityName(overrides.name),
    visible: resolveAuthoredEntityVisibility(overrides.visible),
    enabled: resolveAuthoredEntityEnabled(overrides.enabled),
    position,
    rigType,
    priority,
    defaultActive,
    target,
    targetOffset,
    transitionMode,
    transitionDurationSeconds,
    lookAround
  };
}

export function createNpcEntity(
  overrides: Partial<
    Pick<
      NpcEntity,
      | "id"
      | "name"
      | "visible"
      | "enabled"
      | "position"
      | "actorId"
      | "presence"
      | "yawDegrees"
      | "modelAssetId"
      | "dialogues"
      | "defaultDialogueId"
    >
  > & {
    collider?: Partial<NpcColliderSettings>;
  } = {}
): NpcEntity {
  const position = cloneVec3(overrides.position ?? DEFAULT_ENTITY_POSITION);
  const actorId = normalizeNpcActorId(overrides.actorId);
  const presence = normalizeNpcPresence(overrides.presence);
  const yawDegrees = overrides.yawDegrees ?? DEFAULT_NPC_YAW_DEGREES;
  const modelAssetId = normalizeNpcModelAssetId(
    overrides.modelAssetId ?? DEFAULT_NPC_MODEL_ASSET_ID
  );
  const dialogues = normalizeNpcDialogues(overrides.dialogues);
  const defaultDialogueId = normalizeNpcDefaultDialogueId(
    overrides.defaultDialogueId ?? DEFAULT_NPC_DIALOGUE_ID,
    dialogues
  );
  const collider = createNpcColliderSettings(overrides.collider);

  assertFiniteVec3(position, "NPC position");

  if (!Number.isFinite(yawDegrees)) {
    throw new Error("NPC yaw must be a finite number.");
  }

  return {
    id: overrides.id ?? createOpaqueId("entity-npc"),
    kind: "npc",
    name: normalizeEntityName(overrides.name),
    visible: resolveAuthoredEntityVisibility(overrides.visible),
    enabled: resolveAuthoredEntityEnabled(overrides.enabled),
    position,
    actorId,
    presence,
    yawDegrees: normalizeYawDegrees(yawDegrees),
    modelAssetId,
    dialogues,
    defaultDialogueId,
    collider
  };
}

export function createSoundEmitterEntity(
  overrides: Partial<
    Pick<
      SoundEmitterEntity,
      "id" | "name" | "visible" | "enabled" | "position" | "audioAssetId" | "volume" | "refDistance" | "maxDistance" | "autoplay" | "loop"
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
    visible: resolveAuthoredEntityVisibility(overrides.visible),
    enabled: resolveAuthoredEntityEnabled(overrides.enabled),
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
  overrides: Partial<Pick<TriggerVolumeEntity, "id" | "name" | "visible" | "enabled" | "position" | "size" | "triggerOnEnter" | "triggerOnExit">> = {}
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
    visible: resolveAuthoredEntityVisibility(overrides.visible),
    enabled: resolveAuthoredEntityEnabled(overrides.enabled),
    position,
    size,
    triggerOnEnter,
    triggerOnExit
  };
}

export function createTeleportTargetEntity(
  overrides: Partial<Pick<TeleportTargetEntity, "id" | "name" | "visible" | "enabled" | "position" | "yawDegrees">> = {}
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
    visible: resolveAuthoredEntityVisibility(overrides.visible),
    enabled: resolveAuthoredEntityEnabled(overrides.enabled),
    position,
    yawDegrees: normalizeYawDegrees(yawDegrees)
  };
}

export function createInteractableEntity(
  overrides: Partial<Pick<InteractableEntity, "id" | "name" | "visible" | "enabled" | "position" | "radius" | "prompt" | "interactionEnabled">> = {}
): InteractableEntity {
  const position = cloneVec3(overrides.position ?? DEFAULT_ENTITY_POSITION);
  const radius = overrides.radius ?? DEFAULT_INTERACTABLE_RADIUS;
  const prompt = normalizeInteractablePrompt(overrides.prompt ?? DEFAULT_INTERACTABLE_PROMPT);
  const interactionEnabled = overrides.interactionEnabled ?? true;

  assertFiniteVec3(position, "Interactable position");
  assertPositiveFiniteNumber(radius, "Interactable radius");
  assertBoolean(interactionEnabled, "Interactable interactionEnabled");

  return {
    id: overrides.id ?? createOpaqueId("entity-interactable"),
    kind: "interactable",
    name: normalizeEntityName(overrides.name),
    visible: resolveAuthoredEntityVisibility(overrides.visible),
    enabled: resolveAuthoredEntityEnabled(overrides.enabled),
    position,
    radius,
    prompt,
    interactionEnabled
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
  cameraRig: {
    kind: "cameraRig",
    label: "Camera Rig",
    description:
      "Authored runtime camera framing rig that can lock from a fixed world position onto a typed target.",
    createDefaultEntity: createCameraRigEntity
  },
  sceneEntry: {
    kind: "sceneEntry",
    label: "Scene Entry",
    description:
      "Explicit authored scene-transition arrival point with a facing direction.",
    createDefaultEntity: createSceneEntryEntity
  },
  npc: {
    kind: "npc",
    label: "NPC",
    description:
      "Typed actor entity with a stable authored actor id and optional model visual for runner presence.",
    createDefaultEntity: createNpcEntity
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

export function isEntityKind(value: unknown): value is EntityKind {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ENTITY_REGISTRY, value);
}

export function getEntityRegistryEntry<K extends EntityKind>(kind: K): EntityRegistryEntry<Extract<EntityInstance, { kind: K }>> {
  return ENTITY_REGISTRY[kind];
}

export function createDefaultEntityInstance(kind: "playerStart", overrides?: Partial<PlayerStartEntity>): PlayerStartEntity;
export function createDefaultEntityInstance(kind: "cameraRig", overrides?: Partial<CameraRigEntity>): CameraRigEntity;
export function createDefaultEntityInstance(kind: "sceneEntry", overrides?: Partial<SceneEntryEntity>): SceneEntryEntity;
export function createDefaultEntityInstance(kind: "npc", overrides?: Partial<NpcEntity>): NpcEntity;
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
    case "cameraRig":
      return createCameraRigEntity(overrides);
    case "sceneEntry":
      return createSceneEntryEntity(overrides);
    case "npc":
      return createNpcEntity(overrides);
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
    case "cameraRig":
      return createCameraRigEntity(entity);
    case "sceneEntry":
      return createSceneEntryEntity(entity);
    case "npc":
      return createNpcEntity(entity);
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
  if (
    left.kind !== right.kind ||
    left.id !== right.id ||
    left.name !== right.name ||
    left.visible !== right.visible ||
    left.enabled !== right.enabled ||
    !areVec3Equal(left.position, right.position)
  ) {
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
        arePlayerStartMovementTemplatesEqual(
          left.movementTemplate,
          typedRight.movementTemplate
        ) &&
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
    case "cameraRig": {
      const typedRight = right as CameraRigEntity;
      return (
        left.rigType === typedRight.rigType &&
        left.priority === typedRight.priority &&
        left.defaultActive === typedRight.defaultActive &&
        areCameraRigTargetRefsEqual(left.target, typedRight.target) &&
        areVec3Equal(left.targetOffset, typedRight.targetOffset) &&
        left.transitionMode === typedRight.transitionMode &&
        left.transitionDurationSeconds ===
          typedRight.transitionDurationSeconds &&
        areCameraRigLookAroundSettingsEqual(
          left.lookAround,
          typedRight.lookAround
        )
      );
    }
    case "sceneEntry": {
      const typedRight = right as SceneEntryEntity;
      return left.yawDegrees === typedRight.yawDegrees;
    }
    case "npc": {
      const typedRight = right as NpcEntity;
      return (
        left.actorId === typedRight.actorId &&
        areNpcPresencesEqual(left.presence, typedRight.presence) &&
        left.yawDegrees === typedRight.yawDegrees &&
        left.modelAssetId === typedRight.modelAssetId &&
        left.defaultDialogueId === typedRight.defaultDialogueId &&
        left.dialogues.length === typedRight.dialogues.length &&
        left.dialogues.every((dialogue, index) =>
          areProjectDialoguesEqual(dialogue, typedRight.dialogues[index]!)
        ) &&
        left.collider.mode === typedRight.collider.mode &&
        left.collider.eyeHeight === typedRight.collider.eyeHeight &&
        left.collider.capsuleRadius === typedRight.collider.capsuleRadius &&
        left.collider.capsuleHeight === typedRight.collider.capsuleHeight &&
        areVec3Equal(left.collider.boxSize, typedRight.collider.boxSize)
      );
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
      return (
        left.radius === typedRight.radius &&
        left.prompt === typedRight.prompt &&
        left.interactionEnabled === typedRight.interactionEnabled
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

export function getCameraRigEntities(
  entities: Record<string, EntityInstance>
): CameraRigEntity[] {
  return getEntitiesOfKind(entities, "cameraRig");
}

export function getPrimaryPlayerStartEntity(entities: Record<string, EntityInstance>): PlayerStartEntity | null {
  return getPlayerStartEntities(entities)[0] ?? null;
}

export function getPrimaryEnabledPlayerStartEntity(entities: Record<string, EntityInstance>): PlayerStartEntity | null {
  return getPlayerStartEntities(entities).find((entity) => entity.enabled) ?? null;
}

export function getEntityKindLabel(kind: EntityKind): string {
  return getEntityRegistryEntry(kind).label;
}
