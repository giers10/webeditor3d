import { isHexColorString } from "../document/world-settings";

export const CONTROL_ENTITY_TARGET_KINDS = [
  "pointLight",
  "spotLight",
  "soundEmitter"
] as const;
export const CONTROL_INTERACTION_TARGET_KINDS = [
  "interactable",
  "sceneExit"
] as const;
export const CONTROL_CAPABILITY_KINDS = [
  "actorPresence",
  "actorAnimationPlayback",
  "actorPathFollow",
  "animationPlayback",
  "modelVisibility",
  "soundPlayback",
  "soundVolume",
  "interactionAvailability",
  "lightEnabled",
  "lightIntensity",
  "lightColor",
  "ambientLightIntensity",
  "ambientLightColor",
  "sunLightIntensity",
  "sunLightColor"
] as const;

export type ControlEntityTargetKind =
  (typeof CONTROL_ENTITY_TARGET_KINDS)[number];
export type ControlInteractionTargetKind =
  (typeof CONTROL_INTERACTION_TARGET_KINDS)[number];
export type ControlCapabilityKind = (typeof CONTROL_CAPABILITY_KINDS)[number];

export const ACTOR_PATH_PROGRESS_MODES = ["deriveFromTime"] as const;
export type ActorPathProgressMode = (typeof ACTOR_PATH_PROGRESS_MODES)[number];

export interface ActorControlTargetRef {
  kind: "actor";
  actorId: string;
}

export interface EntityControlTargetRef<
  TKind extends ControlEntityTargetKind = ControlEntityTargetKind
> {
  kind: "entity";
  entityId: string;
  entityKind: TKind;
}

export interface InteractionControlTargetRef<
  TKind extends ControlInteractionTargetKind = ControlInteractionTargetKind
> {
  kind: "interaction";
  entityId: string;
  interactionKind: TKind;
}

export interface SceneControlTargetRef {
  kind: "scene";
  scope: "activeScene";
}

export interface GlobalControlTargetRef {
  kind: "global";
  scope: "project";
}

export interface ModelInstanceControlTargetRef {
  kind: "modelInstance";
  modelInstanceId: string;
}

export type LightControlTargetRef = EntityControlTargetRef<
  "pointLight" | "spotLight"
>;
export type SoundEmitterControlTargetRef =
  EntityControlTargetRef<"soundEmitter">;
export type ControlTargetRef =
  | ActorControlTargetRef
  | EntityControlTargetRef
  | InteractionControlTargetRef
  | SceneControlTargetRef
  | GlobalControlTargetRef
  | ModelInstanceControlTargetRef;

export interface ControlTargetDescriptor {
  target: ControlTargetRef;
  capabilities: ControlCapabilityKind[];
}

export interface SetActorPresenceControlEffect {
  type: "setActorPresence";
  target: ActorControlTargetRef;
  active: boolean;
}

export interface PlayActorAnimationControlEffect {
  type: "playActorAnimation";
  target: ActorControlTargetRef;
  clipName: string;
  loop?: boolean;
}

export interface FollowActorPathControlEffect {
  type: "followActorPath";
  target: ActorControlTargetRef;
  pathId: string;
  speed: number;
  loop: boolean;
  progressMode: ActorPathProgressMode;
}

export interface PlayModelAnimationControlEffect {
  type: "playModelAnimation";
  target: ModelInstanceControlTargetRef;
  clipName: string;
  loop?: boolean;
}

export interface StopModelAnimationControlEffect {
  type: "stopModelAnimation";
  target: ModelInstanceControlTargetRef;
}

export interface SetModelInstanceVisibleControlEffect {
  type: "setModelInstanceVisible";
  target: ModelInstanceControlTargetRef;
  visible: boolean;
}

export interface PlaySoundControlEffect {
  type: "playSound";
  target: SoundEmitterControlTargetRef;
}

export interface StopSoundControlEffect {
  type: "stopSound";
  target: SoundEmitterControlTargetRef;
}

export interface SetSoundVolumeControlEffect {
  type: "setSoundVolume";
  target: SoundEmitterControlTargetRef;
  volume: number;
}

export interface SetInteractionEnabledControlEffect {
  type: "setInteractionEnabled";
  target: InteractionControlTargetRef;
  enabled: boolean;
}

export interface SetLightEnabledControlEffect {
  type: "setLightEnabled";
  target: LightControlTargetRef;
  enabled: boolean;
}

export interface SetLightIntensityControlEffect {
  type: "setLightIntensity";
  target: LightControlTargetRef;
  intensity: number;
}

export interface SetLightColorControlEffect {
  type: "setLightColor";
  target: LightControlTargetRef;
  colorHex: string;
}

export interface SetAmbientLightIntensityControlEffect {
  type: "setAmbientLightIntensity";
  target: SceneControlTargetRef;
  intensity: number;
}

export interface SetAmbientLightColorControlEffect {
  type: "setAmbientLightColor";
  target: SceneControlTargetRef;
  colorHex: string;
}

export interface SetSunLightIntensityControlEffect {
  type: "setSunLightIntensity";
  target: SceneControlTargetRef;
  intensity: number;
}

export interface SetSunLightColorControlEffect {
  type: "setSunLightColor";
  target: SceneControlTargetRef;
  colorHex: string;
}

export type ControlEffect =
  | SetActorPresenceControlEffect
  | PlayActorAnimationControlEffect
  | FollowActorPathControlEffect
  | PlayModelAnimationControlEffect
  | StopModelAnimationControlEffect
  | SetModelInstanceVisibleControlEffect
  | PlaySoundControlEffect
  | StopSoundControlEffect
  | SetSoundVolumeControlEffect
  | SetInteractionEnabledControlEffect
  | SetLightEnabledControlEffect
  | SetLightIntensityControlEffect
  | SetLightColorControlEffect
  | SetAmbientLightIntensityControlEffect
  | SetAmbientLightColorControlEffect
  | SetSunLightIntensityControlEffect
  | SetSunLightColorControlEffect;

export type ActorControlEffect =
  | SetActorPresenceControlEffect
  | PlayActorAnimationControlEffect
  | FollowActorPathControlEffect;

export interface LightIntensityControlChannelDescriptor {
  channel: "light.intensity";
  target: LightControlTargetRef;
  minValue: number;
  defaultValue: number;
}

export interface SoundVolumeControlChannelDescriptor {
  channel: "sound.volume";
  target: SoundEmitterControlTargetRef;
  minValue: number;
  defaultValue: number;
}

export interface AmbientLightIntensityControlChannelDescriptor {
  channel: "ambientLight.intensity";
  target: SceneControlTargetRef;
  minValue: number;
  defaultValue: number;
}

export interface SunLightIntensityControlChannelDescriptor {
  channel: "sunLight.intensity";
  target: SceneControlTargetRef;
  minValue: number;
  defaultValue: number;
}

export type ControlChannelDescriptor =
  | LightIntensityControlChannelDescriptor
  | SoundVolumeControlChannelDescriptor
  | AmbientLightIntensityControlChannelDescriptor
  | SunLightIntensityControlChannelDescriptor;

export interface DefaultResolvedControlSource {
  kind: "default";
}

export interface InteractionLinkResolvedControlSource {
  kind: "interactionLink";
  linkId: string;
}

export interface SchedulerResolvedControlSource {
  kind: "scheduler";
  scheduleId: string;
}

export type RuntimeResolvedControlSource =
  | DefaultResolvedControlSource
  | InteractionLinkResolvedControlSource
  | SchedulerResolvedControlSource;

export interface RuntimeResolvedLightEnabledState {
  type: "lightEnabled";
  target: LightControlTargetRef;
  value: boolean;
  source: RuntimeResolvedControlSource;
}

export interface RuntimeResolvedActorPresenceState {
  type: "actorPresence";
  target: ActorControlTargetRef;
  value: boolean;
  source: RuntimeResolvedControlSource;
}

export interface RuntimeResolvedActorAnimationPlaybackState {
  type: "actorAnimationPlayback";
  target: ActorControlTargetRef;
  clipName: string | null;
  loop: boolean | undefined;
  source: RuntimeResolvedControlSource;
}

export interface RuntimeResolvedActorPathAssignmentState {
  type: "actorPathAssignment";
  target: ActorControlTargetRef;
  pathId: string | null;
  speed: number | null;
  loop: boolean;
  progressMode: ActorPathProgressMode | null;
  source: RuntimeResolvedControlSource;
}

export interface RuntimeResolvedInteractionEnabledState {
  type: "interactionEnabled";
  target: InteractionControlTargetRef;
  value: boolean;
  source: RuntimeResolvedControlSource;
}

export interface RuntimeResolvedModelInstanceVisibilityState {
  type: "modelVisibility";
  target: ModelInstanceControlTargetRef;
  value: boolean;
  source: RuntimeResolvedControlSource;
}

export interface RuntimeResolvedSoundPlaybackState {
  type: "soundPlayback";
  target: SoundEmitterControlTargetRef;
  value: boolean;
  source: RuntimeResolvedControlSource;
}

export interface RuntimeResolvedModelAnimationPlaybackState {
  type: "modelAnimationPlayback";
  target: ModelInstanceControlTargetRef;
  clipName: string | null;
  loop: boolean | undefined;
  source: RuntimeResolvedControlSource;
}

export interface RuntimeResolvedLightColorState {
  type: "lightColor";
  target: LightControlTargetRef;
  value: string;
  source: RuntimeResolvedControlSource;
}

export interface RuntimeResolvedAmbientLightColorState {
  type: "ambientLightColor";
  target: SceneControlTargetRef;
  value: string;
  source: RuntimeResolvedControlSource;
}

export interface RuntimeResolvedSunLightColorState {
  type: "sunLightColor";
  target: SceneControlTargetRef;
  value: string;
  source: RuntimeResolvedControlSource;
}

export type RuntimeResolvedDiscreteControlState =
  | RuntimeResolvedActorPresenceState
  | RuntimeResolvedActorAnimationPlaybackState
  | RuntimeResolvedActorPathAssignmentState
  | RuntimeResolvedLightEnabledState
  | RuntimeResolvedInteractionEnabledState
  | RuntimeResolvedModelInstanceVisibilityState
  | RuntimeResolvedSoundPlaybackState
  | RuntimeResolvedModelAnimationPlaybackState
  | RuntimeResolvedLightColorState
  | RuntimeResolvedAmbientLightColorState
  | RuntimeResolvedSunLightColorState;

export interface RuntimeResolvedLightIntensityChannelValue {
  type: "lightIntensity";
  descriptor: LightIntensityControlChannelDescriptor;
  value: number;
  source: RuntimeResolvedControlSource;
}

export interface RuntimeResolvedSoundVolumeChannelValue {
  type: "soundVolume";
  descriptor: SoundVolumeControlChannelDescriptor;
  value: number;
  source: RuntimeResolvedControlSource;
}

export interface RuntimeResolvedAmbientLightIntensityChannelValue {
  type: "ambientLightIntensity";
  descriptor: AmbientLightIntensityControlChannelDescriptor;
  value: number;
  source: RuntimeResolvedControlSource;
}

export interface RuntimeResolvedSunLightIntensityChannelValue {
  type: "sunLightIntensity";
  descriptor: SunLightIntensityControlChannelDescriptor;
  value: number;
  source: RuntimeResolvedControlSource;
}

export type RuntimeResolvedControlChannelValue =
  | RuntimeResolvedLightIntensityChannelValue
  | RuntimeResolvedSoundVolumeChannelValue
  | RuntimeResolvedAmbientLightIntensityChannelValue
  | RuntimeResolvedSunLightIntensityChannelValue;

export interface RuntimeResolvedControlState {
  discrete: RuntimeResolvedDiscreteControlState[];
  channels: RuntimeResolvedControlChannelValue[];
}

export interface RuntimeControlSurfaceDefinition {
  targets: ControlTargetDescriptor[];
  channels: ControlChannelDescriptor[];
  baselineResolved: RuntimeResolvedControlState;
  resolved: RuntimeResolvedControlState;
}

function assertNonEmptyString(value: string, label: string) {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be non-empty.`);
  }
}

function assertNonNegativeFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      `${label} must be a finite number greater than or equal to zero.`
    );
  }
}

function assertBoolean(value: boolean, label: string) {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean.`);
  }
}

function assertHexColor(value: string, label: string) {
  if (!isHexColorString(value)) {
    throw new Error(`${label} must be a valid hex color string.`);
  }
}

function upsertResolvedDiscreteState(
  resolved: RuntimeResolvedControlState,
  state: RuntimeResolvedDiscreteControlState
) {
  const stateKey = getResolvedDiscreteControlStateKey(state);
  const existingIndex = resolved.discrete.findIndex(
    (candidate) => getResolvedDiscreteControlStateKey(candidate) === stateKey
  );

  if (existingIndex >= 0) {
    resolved.discrete[existingIndex] = state;
  } else {
    resolved.discrete.push(state);
  }
}

function upsertResolvedChannelValue(
  resolved: RuntimeResolvedControlState,
  value: RuntimeResolvedControlChannelValue
) {
  const channelKey = getControlChannelDescriptorKey(value.descriptor);
  const existingIndex = resolved.channels.findIndex(
    (candidate) =>
      getControlChannelDescriptorKey(candidate.descriptor) === channelKey
  );

  if (existingIndex >= 0) {
    resolved.channels[existingIndex] = value;
  } else {
    resolved.channels.push(value);
  }
}

export function isControlEntityTargetKind(
  value: unknown
): value is ControlEntityTargetKind {
  return CONTROL_ENTITY_TARGET_KINDS.includes(value as ControlEntityTargetKind);
}

export function isControlInteractionTargetKind(
  value: unknown
): value is ControlInteractionTargetKind {
  return CONTROL_INTERACTION_TARGET_KINDS.includes(
    value as ControlInteractionTargetKind
  );
}

export function isActorControlEffect(
  effect: ControlEffect
): effect is ActorControlEffect {
  switch (effect.type) {
    case "setActorPresence":
    case "playActorAnimation":
    case "followActorPath":
      return true;
    default:
      return false;
  }
}

export function createActorControlTargetRef(
  actorId: string
): ActorControlTargetRef {
  assertNonEmptyString(actorId, "Control actor id");

  return {
    kind: "actor",
    actorId
  };
}

export function createEntityControlTargetRef<
  TKind extends ControlEntityTargetKind
>(entityKind: TKind, entityId: string): EntityControlTargetRef<TKind> {
  assertNonEmptyString(entityId, "Control entity id");

  return {
    kind: "entity",
    entityId,
    entityKind
  };
}

export function createInteractionControlTargetRef<
  TKind extends ControlInteractionTargetKind
>(
  interactionKind: TKind,
  entityId: string
): InteractionControlTargetRef<TKind> {
  assertNonEmptyString(entityId, "Control interaction entity id");

  return {
    kind: "interaction",
    entityId,
    interactionKind
  };
}

export function createActiveSceneControlTargetRef(): SceneControlTargetRef {
  return {
    kind: "scene",
    scope: "activeScene"
  };
}

export function createProjectGlobalControlTargetRef(): GlobalControlTargetRef {
  return {
    kind: "global",
    scope: "project"
  };
}

export function createModelInstanceControlTargetRef(
  modelInstanceId: string
): ModelInstanceControlTargetRef {
  assertNonEmptyString(modelInstanceId, "Control model instance id");

  return {
    kind: "modelInstance",
    modelInstanceId
  };
}

export function createLightControlTargetRef(
  lightKind: "pointLight" | "spotLight",
  entityId: string
): LightControlTargetRef {
  return createEntityControlTargetRef(lightKind, entityId);
}

export function createSoundEmitterControlTargetRef(
  entityId: string
): SoundEmitterControlTargetRef {
  return createEntityControlTargetRef("soundEmitter", entityId);
}

export function createControlTargetDescriptor(
  target: ControlTargetRef,
  capabilities: ControlCapabilityKind[]
): ControlTargetDescriptor {
  return {
    target: cloneControlTargetRef(target),
    capabilities: [...capabilities]
  };
}

export function createSetActorPresenceControlEffect(options: {
  target: ActorControlTargetRef;
  active: boolean;
}): SetActorPresenceControlEffect {
  assertBoolean(options.active, "Control actor active");

  return {
    type: "setActorPresence",
    target: cloneControlTargetRef(options.target) as ActorControlTargetRef,
    active: options.active
  };
}

export function isActorPathProgressMode(
  value: unknown
): value is ActorPathProgressMode {
  return ACTOR_PATH_PROGRESS_MODES.includes(value as ActorPathProgressMode);
}

export function createPlayActorAnimationControlEffect(options: {
  target: ActorControlTargetRef;
  clipName: string;
  loop?: boolean;
}): PlayActorAnimationControlEffect {
  assertNonEmptyString(options.clipName, "Control actor animation clip name");

  return {
    type: "playActorAnimation",
    target: cloneControlTargetRef(options.target) as ActorControlTargetRef,
    clipName: options.clipName,
    loop: options.loop
  };
}

export function createFollowActorPathControlEffect(options: {
  target: ActorControlTargetRef;
  pathId: string;
  speed: number;
  loop?: boolean;
  progressMode?: ActorPathProgressMode;
}): FollowActorPathControlEffect {
  assertNonEmptyString(options.pathId, "Control actor path id");

  if (!Number.isFinite(options.speed) || options.speed <= 0) {
    throw new Error(
      "Control actor path speed must be a finite number greater than zero."
    );
  }

  return {
    type: "followActorPath",
    target: cloneControlTargetRef(options.target) as ActorControlTargetRef,
    pathId: options.pathId,
    speed: options.speed,
    loop: options.loop ?? false,
    progressMode: options.progressMode ?? "deriveFromTime"
  };
}

export function createPlayModelAnimationControlEffect(options: {
  target: ModelInstanceControlTargetRef;
  clipName: string;
  loop?: boolean;
}): PlayModelAnimationControlEffect {
  assertNonEmptyString(options.clipName, "Control animation clip name");

  return {
    type: "playModelAnimation",
    target: cloneControlTargetRef(
      options.target
    ) as ModelInstanceControlTargetRef,
    clipName: options.clipName,
    loop: options.loop
  };
}

export function createStopModelAnimationControlEffect(options: {
  target: ModelInstanceControlTargetRef;
}): StopModelAnimationControlEffect {
  return {
    type: "stopModelAnimation",
    target: cloneControlTargetRef(
      options.target
    ) as ModelInstanceControlTargetRef
  };
}

export function createSetModelInstanceVisibleControlEffect(options: {
  target: ModelInstanceControlTargetRef;
  visible: boolean;
}): SetModelInstanceVisibleControlEffect {
  assertBoolean(options.visible, "Control model instance visible");

  return {
    type: "setModelInstanceVisible",
    target: cloneControlTargetRef(
      options.target
    ) as ModelInstanceControlTargetRef,
    visible: options.visible
  };
}

export function createPlaySoundControlEffect(options: {
  target: SoundEmitterControlTargetRef;
}): PlaySoundControlEffect {
  return {
    type: "playSound",
    target: cloneControlTargetRef(
      options.target
    ) as SoundEmitterControlTargetRef
  };
}

export function createStopSoundControlEffect(options: {
  target: SoundEmitterControlTargetRef;
}): StopSoundControlEffect {
  return {
    type: "stopSound",
    target: cloneControlTargetRef(
      options.target
    ) as SoundEmitterControlTargetRef
  };
}

export function createSetSoundVolumeControlEffect(options: {
  target: SoundEmitterControlTargetRef;
  volume: number;
}): SetSoundVolumeControlEffect {
  assertNonNegativeFiniteNumber(options.volume, "Control sound volume");

  return {
    type: "setSoundVolume",
    target: cloneControlTargetRef(
      options.target
    ) as SoundEmitterControlTargetRef,
    volume: options.volume
  };
}

export function createSetInteractionEnabledControlEffect(options: {
  target: InteractionControlTargetRef;
  enabled: boolean;
}): SetInteractionEnabledControlEffect {
  assertBoolean(options.enabled, "Control interaction enabled");

  return {
    type: "setInteractionEnabled",
    target: cloneControlTargetRef(
      options.target
    ) as InteractionControlTargetRef,
    enabled: options.enabled
  };
}

export function createSetLightEnabledControlEffect(options: {
  target: LightControlTargetRef;
  enabled: boolean;
}): SetLightEnabledControlEffect {
  assertBoolean(options.enabled, "Control light enabled");

  return {
    type: "setLightEnabled",
    target: cloneControlTargetRef(options.target) as LightControlTargetRef,
    enabled: options.enabled
  };
}

export function createSetLightIntensityControlEffect(options: {
  target: LightControlTargetRef;
  intensity: number;
}): SetLightIntensityControlEffect {
  assertNonNegativeFiniteNumber(options.intensity, "Control light intensity");

  return {
    type: "setLightIntensity",
    target: cloneControlTargetRef(options.target) as LightControlTargetRef,
    intensity: options.intensity
  };
}

export function createSetLightColorControlEffect(options: {
  target: LightControlTargetRef;
  colorHex: string;
}): SetLightColorControlEffect {
  assertHexColor(options.colorHex, "Control light color");

  return {
    type: "setLightColor",
    target: cloneControlTargetRef(options.target) as LightControlTargetRef,
    colorHex: options.colorHex
  };
}

export function createSetAmbientLightIntensityControlEffect(options: {
  target: SceneControlTargetRef;
  intensity: number;
}): SetAmbientLightIntensityControlEffect {
  assertNonNegativeFiniteNumber(options.intensity, "Control ambient light intensity");

  return {
    type: "setAmbientLightIntensity",
    target: cloneControlTargetRef(options.target) as SceneControlTargetRef,
    intensity: options.intensity
  };
}

export function createSetAmbientLightColorControlEffect(options: {
  target: SceneControlTargetRef;
  colorHex: string;
}): SetAmbientLightColorControlEffect {
  assertHexColor(options.colorHex, "Control ambient light color");

  return {
    type: "setAmbientLightColor",
    target: cloneControlTargetRef(options.target) as SceneControlTargetRef,
    colorHex: options.colorHex
  };
}

export function createSetSunLightIntensityControlEffect(options: {
  target: SceneControlTargetRef;
  intensity: number;
}): SetSunLightIntensityControlEffect {
  assertNonNegativeFiniteNumber(options.intensity, "Control sun light intensity");

  return {
    type: "setSunLightIntensity",
    target: cloneControlTargetRef(options.target) as SceneControlTargetRef,
    intensity: options.intensity
  };
}

export function createSetSunLightColorControlEffect(options: {
  target: SceneControlTargetRef;
  colorHex: string;
}): SetSunLightColorControlEffect {
  assertHexColor(options.colorHex, "Control sun light color");

  return {
    type: "setSunLightColor",
    target: cloneControlTargetRef(options.target) as SceneControlTargetRef,
    colorHex: options.colorHex
  };
}

export function createLightIntensityControlChannelDescriptor(options: {
  target: LightControlTargetRef;
  defaultValue: number;
  minValue?: number;
}): LightIntensityControlChannelDescriptor {
  const minValue = options.minValue ?? 0;
  assertNonNegativeFiniteNumber(
    options.defaultValue,
    "Control light intensity default"
  );
  assertNonNegativeFiniteNumber(minValue, "Control light intensity minimum");

  return {
    channel: "light.intensity",
    target: cloneControlTargetRef(options.target) as LightControlTargetRef,
    minValue,
    defaultValue: options.defaultValue
  };
}

export function createSoundVolumeControlChannelDescriptor(options: {
  target: SoundEmitterControlTargetRef;
  defaultValue: number;
  minValue?: number;
}): SoundVolumeControlChannelDescriptor {
  const minValue = options.minValue ?? 0;
  assertNonNegativeFiniteNumber(options.defaultValue, "Control sound volume default");
  assertNonNegativeFiniteNumber(minValue, "Control sound volume minimum");

  return {
    channel: "sound.volume",
    target: cloneControlTargetRef(options.target) as SoundEmitterControlTargetRef,
    minValue,
    defaultValue: options.defaultValue
  };
}

export function createAmbientLightIntensityControlChannelDescriptor(options: {
  target: SceneControlTargetRef;
  defaultValue: number;
  minValue?: number;
}): AmbientLightIntensityControlChannelDescriptor {
  const minValue = options.minValue ?? 0;
  assertNonNegativeFiniteNumber(
    options.defaultValue,
    "Control ambient light intensity default"
  );
  assertNonNegativeFiniteNumber(
    minValue,
    "Control ambient light intensity minimum"
  );

  return {
    channel: "ambientLight.intensity",
    target: cloneControlTargetRef(options.target) as SceneControlTargetRef,
    minValue,
    defaultValue: options.defaultValue
  };
}

export function createSunLightIntensityControlChannelDescriptor(options: {
  target: SceneControlTargetRef;
  defaultValue: number;
  minValue?: number;
}): SunLightIntensityControlChannelDescriptor {
  const minValue = options.minValue ?? 0;
  assertNonNegativeFiniteNumber(
    options.defaultValue,
    "Control sun light intensity default"
  );
  assertNonNegativeFiniteNumber(minValue, "Control sun light intensity minimum");

  return {
    channel: "sunLight.intensity",
    target: cloneControlTargetRef(options.target) as SceneControlTargetRef,
    minValue,
    defaultValue: options.defaultValue
  };
}

export function createDefaultResolvedControlSource(): DefaultResolvedControlSource {
  return {
    kind: "default"
  };
}

export function createSchedulerResolvedControlSource(
  scheduleId: string
): SchedulerResolvedControlSource {
  assertNonEmptyString(scheduleId, "Resolved control scheduler id");

  return {
    kind: "scheduler",
    scheduleId
  };
}

export function createInteractionLinkResolvedControlSource(
  linkId: string
): InteractionLinkResolvedControlSource {
  assertNonEmptyString(linkId, "Resolved control interaction link id");

  return {
    kind: "interactionLink",
    linkId
  };
}

export function createResolvedLightEnabledState(options: {
  target: LightControlTargetRef;
  value: boolean;
  source: RuntimeResolvedControlSource;
}): RuntimeResolvedLightEnabledState {
  assertBoolean(options.value, "Resolved control light enabled");

  return {
    type: "lightEnabled",
    target: cloneControlTargetRef(options.target) as LightControlTargetRef,
    value: options.value,
    source: cloneResolvedControlSource(options.source)
  };
}

export function createResolvedActorPresenceState(options: {
  target: ActorControlTargetRef;
  value: boolean;
  source: RuntimeResolvedControlSource;
}): RuntimeResolvedActorPresenceState {
  assertBoolean(options.value, "Resolved control actor active");

  return {
    type: "actorPresence",
    target: cloneControlTargetRef(options.target) as ActorControlTargetRef,
    value: options.value,
    source: cloneResolvedControlSource(options.source)
  };
}

export function createResolvedActorAnimationPlaybackState(options: {
  target: ActorControlTargetRef;
  clipName: string | null;
  loop: boolean | undefined;
  source: RuntimeResolvedControlSource;
}): RuntimeResolvedActorAnimationPlaybackState {
  if (options.clipName !== null) {
    assertNonEmptyString(options.clipName, "Resolved control actor animation clip");
  }

  return {
    type: "actorAnimationPlayback",
    target: cloneControlTargetRef(options.target) as ActorControlTargetRef,
    clipName: options.clipName,
    loop: options.loop,
    source: cloneResolvedControlSource(options.source)
  };
}

export function createResolvedActorPathAssignmentState(options: {
  target: ActorControlTargetRef;
  pathId: string | null;
  speed: number | null;
  loop: boolean;
  progressMode: ActorPathProgressMode | null;
  source: RuntimeResolvedControlSource;
}): RuntimeResolvedActorPathAssignmentState {
  if (options.pathId !== null) {
    assertNonEmptyString(options.pathId, "Resolved control actor path id");
  }

  if (
    options.speed !== null &&
    (!Number.isFinite(options.speed) || options.speed <= 0)
  ) {
    throw new Error(
      "Resolved control actor path speed must be a finite number greater than zero."
    );
  }

  if (
    (options.pathId === null) !== (options.speed === null) ||
    (options.pathId === null) !== (options.progressMode === null)
  ) {
    throw new Error(
      "Resolved actor path assignments must either define path, speed, and progress mode together or clear all of them."
    );
  }

  return {
    type: "actorPathAssignment",
    target: cloneControlTargetRef(options.target) as ActorControlTargetRef,
    pathId: options.pathId,
    speed: options.speed,
    loop: options.loop,
    progressMode: options.progressMode,
    source: cloneResolvedControlSource(options.source)
  };
}

export function createResolvedInteractionEnabledState(options: {
  target: InteractionControlTargetRef;
  value: boolean;
  source: RuntimeResolvedControlSource;
}): RuntimeResolvedInteractionEnabledState {
  assertBoolean(options.value, "Resolved control interaction enabled");

  return {
    type: "interactionEnabled",
    target: cloneControlTargetRef(
      options.target
    ) as InteractionControlTargetRef,
    value: options.value,
    source: cloneResolvedControlSource(options.source)
  };
}

export function createResolvedModelInstanceVisibilityState(options: {
  target: ModelInstanceControlTargetRef;
  value: boolean;
  source: RuntimeResolvedControlSource;
}): RuntimeResolvedModelInstanceVisibilityState {
  assertBoolean(options.value, "Resolved control model instance visible");

  return {
    type: "modelVisibility",
    target: cloneControlTargetRef(
      options.target
    ) as ModelInstanceControlTargetRef,
    value: options.value,
    source: cloneResolvedControlSource(options.source)
  };
}

export function createResolvedSoundPlaybackState(options: {
  target: SoundEmitterControlTargetRef;
  value: boolean;
  source: RuntimeResolvedControlSource;
}): RuntimeResolvedSoundPlaybackState {
  assertBoolean(options.value, "Resolved control sound playback");

  return {
    type: "soundPlayback",
    target: cloneControlTargetRef(options.target) as SoundEmitterControlTargetRef,
    value: options.value,
    source: cloneResolvedControlSource(options.source)
  };
}

export function createResolvedModelAnimationPlaybackState(options: {
  target: ModelInstanceControlTargetRef;
  clipName: string | null;
  loop: boolean | undefined;
  source: RuntimeResolvedControlSource;
}): RuntimeResolvedModelAnimationPlaybackState {
  if (options.clipName !== null) {
    assertNonEmptyString(options.clipName, "Resolved control animation clip");
  }

  return {
    type: "modelAnimationPlayback",
    target: cloneControlTargetRef(
      options.target
    ) as ModelInstanceControlTargetRef,
    clipName: options.clipName,
    loop: options.loop,
    source: cloneResolvedControlSource(options.source)
  };
}

export function createResolvedLightColorState(options: {
  target: LightControlTargetRef;
  value: string;
  source: RuntimeResolvedControlSource;
}): RuntimeResolvedLightColorState {
  assertHexColor(options.value, "Resolved control light color");

  return {
    type: "lightColor",
    target: cloneControlTargetRef(options.target) as LightControlTargetRef,
    value: options.value,
    source: cloneResolvedControlSource(options.source)
  };
}

export function createResolvedAmbientLightColorState(options: {
  target: SceneControlTargetRef;
  value: string;
  source: RuntimeResolvedControlSource;
}): RuntimeResolvedAmbientLightColorState {
  assertHexColor(options.value, "Resolved control ambient light color");

  return {
    type: "ambientLightColor",
    target: cloneControlTargetRef(options.target) as SceneControlTargetRef,
    value: options.value,
    source: cloneResolvedControlSource(options.source)
  };
}

export function createResolvedSunLightColorState(options: {
  target: SceneControlTargetRef;
  value: string;
  source: RuntimeResolvedControlSource;
}): RuntimeResolvedSunLightColorState {
  assertHexColor(options.value, "Resolved control sun light color");

  return {
    type: "sunLightColor",
    target: cloneControlTargetRef(options.target) as SceneControlTargetRef,
    value: options.value,
    source: cloneResolvedControlSource(options.source)
  };
}

export function createResolvedLightIntensityChannelValue(options: {
  descriptor: LightIntensityControlChannelDescriptor;
  value: number;
  source: RuntimeResolvedControlSource;
}): RuntimeResolvedLightIntensityChannelValue {
  assertNonNegativeFiniteNumber(
    options.value,
    "Resolved control light intensity"
  );

  return {
    type: "lightIntensity",
    descriptor: cloneControlChannelDescriptor(
      options.descriptor
    ) as LightIntensityControlChannelDescriptor,
    value: options.value,
    source: cloneResolvedControlSource(options.source)
  };
}

export function createResolvedSoundVolumeChannelValue(options: {
  descriptor: SoundVolumeControlChannelDescriptor;
  value: number;
  source: RuntimeResolvedControlSource;
}): RuntimeResolvedSoundVolumeChannelValue {
  assertNonNegativeFiniteNumber(options.value, "Resolved control sound volume");

  return {
    type: "soundVolume",
    descriptor: cloneControlChannelDescriptor(
      options.descriptor
    ) as SoundVolumeControlChannelDescriptor,
    value: options.value,
    source: cloneResolvedControlSource(options.source)
  };
}

export function createResolvedAmbientLightIntensityChannelValue(options: {
  descriptor: AmbientLightIntensityControlChannelDescriptor;
  value: number;
  source: RuntimeResolvedControlSource;
}): RuntimeResolvedAmbientLightIntensityChannelValue {
  assertNonNegativeFiniteNumber(
    options.value,
    "Resolved control ambient light intensity"
  );

  return {
    type: "ambientLightIntensity",
    descriptor: cloneControlChannelDescriptor(
      options.descriptor
    ) as AmbientLightIntensityControlChannelDescriptor,
    value: options.value,
    source: cloneResolvedControlSource(options.source)
  };
}

export function createResolvedSunLightIntensityChannelValue(options: {
  descriptor: SunLightIntensityControlChannelDescriptor;
  value: number;
  source: RuntimeResolvedControlSource;
}): RuntimeResolvedSunLightIntensityChannelValue {
  assertNonNegativeFiniteNumber(
    options.value,
    "Resolved control sun light intensity"
  );

  return {
    type: "sunLightIntensity",
    descriptor: cloneControlChannelDescriptor(
      options.descriptor
    ) as SunLightIntensityControlChannelDescriptor,
    value: options.value,
    source: cloneResolvedControlSource(options.source)
  };
}

export function createEmptyRuntimeResolvedControlState(): RuntimeResolvedControlState {
  return {
    discrete: [],
    channels: []
  };
}

export function createEmptyRuntimeControlSurfaceDefinition(): RuntimeControlSurfaceDefinition {
  return {
    targets: [],
    channels: [],
    baselineResolved: createEmptyRuntimeResolvedControlState(),
    resolved: createEmptyRuntimeResolvedControlState()
  };
}

export function createRuntimeControlSurfaceDefinition(options: {
  targets: ControlTargetDescriptor[];
  channels?: ControlChannelDescriptor[];
  baselineResolved?: RuntimeResolvedControlState;
  resolved?: RuntimeResolvedControlState;
}): RuntimeControlSurfaceDefinition {
  return {
    targets: options.targets.map(cloneControlTargetDescriptor),
    channels: (options.channels ?? []).map(cloneControlChannelDescriptor),
    baselineResolved: cloneRuntimeResolvedControlState(
      options.baselineResolved ?? options.resolved ?? createEmptyRuntimeResolvedControlState()
    ),
    resolved: cloneRuntimeResolvedControlState(
      options.resolved ?? createEmptyRuntimeResolvedControlState()
    )
  };
}

export function getControlTargetRefKey(target: ControlTargetRef): string {
  switch (target.kind) {
    case "actor":
      return `actor:${target.actorId}`;
    case "entity":
      return `entity:${target.entityKind}:${target.entityId}`;
    case "interaction":
      return `interaction:${target.interactionKind}:${target.entityId}`;
    case "scene":
      return `scene:${target.scope}`;
    case "global":
      return `global:${target.scope}`;
    case "modelInstance":
      return `modelInstance:${target.modelInstanceId}`;
  }
}

export function getControlChannelDescriptorKey(
  descriptor: ControlChannelDescriptor
): string {
  return `channel:${descriptor.channel}:${getControlTargetRefKey(
    descriptor.target
  )}`;
}

export function getControlEffectResolutionKey(effect: ControlEffect): string {
  switch (effect.type) {
    case "setActorPresence":
      return `state:actorPresence:${getControlTargetRefKey(effect.target)}`;
    case "playModelAnimation":
    case "stopModelAnimation":
      return `state:modelAnimationPlayback:${getControlTargetRefKey(effect.target)}`;
    case "setModelInstanceVisible":
      return `state:modelVisibility:${getControlTargetRefKey(effect.target)}`;
    case "playSound":
    case "stopSound":
      return `state:soundPlayback:${getControlTargetRefKey(effect.target)}`;
    case "setSoundVolume":
      return `channel:sound.volume:${getControlTargetRefKey(effect.target)}`;
    case "setInteractionEnabled":
      return `state:interactionEnabled:${getControlTargetRefKey(effect.target)}`;
    case "setLightEnabled":
      return `state:lightEnabled:${getControlTargetRefKey(effect.target)}`;
    case "setLightIntensity":
      return `channel:light.intensity:${getControlTargetRefKey(effect.target)}`;
    case "setLightColor":
      return `state:lightColor:${getControlTargetRefKey(effect.target)}`;
    case "setAmbientLightIntensity":
      return `channel:ambientLight.intensity:${getControlTargetRefKey(effect.target)}`;
    case "setAmbientLightColor":
      return `state:ambientLightColor:${getControlTargetRefKey(effect.target)}`;
    case "setSunLightIntensity":
      return `channel:sunLight.intensity:${getControlTargetRefKey(effect.target)}`;
    case "setSunLightColor":
      return `state:sunLightColor:${getControlTargetRefKey(effect.target)}`;
  }
}

function getResolvedDiscreteControlStateKey(
  state: RuntimeResolvedDiscreteControlState
): string {
  return `state:${state.type}:${getControlTargetRefKey(state.target)}`;
}

export function cloneControlTargetRef<TTarget extends ControlTargetRef>(
  target: TTarget
): TTarget {
  switch (target.kind) {
    case "actor":
      return {
        kind: "actor",
        actorId: target.actorId
      } as TTarget;
    case "entity":
      return {
        kind: "entity",
        entityId: target.entityId,
        entityKind: target.entityKind
      } as TTarget;
    case "interaction":
      return {
        kind: "interaction",
        entityId: target.entityId,
        interactionKind: target.interactionKind
      } as TTarget;
    case "scene":
      return {
        kind: "scene",
        scope: target.scope
      } as TTarget;
    case "global":
      return {
        kind: "global",
        scope: target.scope
      } as TTarget;
    case "modelInstance":
      return {
        kind: "modelInstance",
        modelInstanceId: target.modelInstanceId
      } as TTarget;
  }
}

export function cloneControlTargetDescriptor(
  descriptor: ControlTargetDescriptor
): ControlTargetDescriptor {
  return {
    target: cloneControlTargetRef(descriptor.target),
    capabilities: [...descriptor.capabilities]
  };
}

export function cloneResolvedControlSource(
  source: RuntimeResolvedControlSource
): RuntimeResolvedControlSource {
  switch (source.kind) {
    case "default":
      return {
        kind: "default"
      };
    case "interactionLink":
      return {
        kind: "interactionLink",
        linkId: source.linkId
      };
    case "scheduler":
      return {
        kind: "scheduler",
        scheduleId: source.scheduleId
      };
  }
}

export function cloneControlEffect<TEffect extends ControlEffect>(
  effect: TEffect
): TEffect {
  switch (effect.type) {
    case "setActorPresence":
      return {
        type: "setActorPresence",
        target: cloneControlTargetRef(effect.target),
        active: effect.active
      } as TEffect;
    case "playModelAnimation":
      return {
        type: "playModelAnimation",
        target: cloneControlTargetRef(effect.target),
        clipName: effect.clipName,
        loop: effect.loop
      } as TEffect;
    case "stopModelAnimation":
      return {
        type: "stopModelAnimation",
        target: cloneControlTargetRef(effect.target)
      } as TEffect;
    case "setModelInstanceVisible":
      return {
        type: "setModelInstanceVisible",
        target: cloneControlTargetRef(effect.target),
        visible: effect.visible
      } as TEffect;
    case "playSound":
      return {
        type: "playSound",
        target: cloneControlTargetRef(effect.target)
      } as TEffect;
    case "stopSound":
      return {
        type: "stopSound",
        target: cloneControlTargetRef(effect.target)
      } as TEffect;
    case "setSoundVolume":
      return {
        type: "setSoundVolume",
        target: cloneControlTargetRef(effect.target),
        volume: effect.volume
      } as TEffect;
    case "setInteractionEnabled":
      return {
        type: "setInteractionEnabled",
        target: cloneControlTargetRef(effect.target),
        enabled: effect.enabled
      } as TEffect;
    case "setLightEnabled":
      return {
        type: "setLightEnabled",
        target: cloneControlTargetRef(effect.target),
        enabled: effect.enabled
      } as TEffect;
    case "setLightIntensity":
      return {
        type: "setLightIntensity",
        target: cloneControlTargetRef(effect.target),
        intensity: effect.intensity
      } as TEffect;
    case "setLightColor":
      return {
        type: "setLightColor",
        target: cloneControlTargetRef(effect.target),
        colorHex: effect.colorHex
      } as TEffect;
    case "setAmbientLightIntensity":
      return {
        type: "setAmbientLightIntensity",
        target: cloneControlTargetRef(effect.target),
        intensity: effect.intensity
      } as TEffect;
    case "setAmbientLightColor":
      return {
        type: "setAmbientLightColor",
        target: cloneControlTargetRef(effect.target),
        colorHex: effect.colorHex
      } as TEffect;
    case "setSunLightIntensity":
      return {
        type: "setSunLightIntensity",
        target: cloneControlTargetRef(effect.target),
        intensity: effect.intensity
      } as TEffect;
    case "setSunLightColor":
      return {
        type: "setSunLightColor",
        target: cloneControlTargetRef(effect.target),
        colorHex: effect.colorHex
      } as TEffect;
  }
}

export function cloneControlChannelDescriptor<
  TDescriptor extends ControlChannelDescriptor
>(descriptor: TDescriptor): TDescriptor {
  switch (descriptor.channel) {
    case "light.intensity":
      return {
        channel: "light.intensity",
        target: cloneControlTargetRef(descriptor.target),
        minValue: descriptor.minValue,
        defaultValue: descriptor.defaultValue
      } as TDescriptor;
    case "sound.volume":
      return {
        channel: "sound.volume",
        target: cloneControlTargetRef(descriptor.target),
        minValue: descriptor.minValue,
        defaultValue: descriptor.defaultValue
      } as TDescriptor;
    case "ambientLight.intensity":
      return {
        channel: "ambientLight.intensity",
        target: cloneControlTargetRef(descriptor.target),
        minValue: descriptor.minValue,
        defaultValue: descriptor.defaultValue
      } as TDescriptor;
    case "sunLight.intensity":
      return {
        channel: "sunLight.intensity",
        target: cloneControlTargetRef(descriptor.target),
        minValue: descriptor.minValue,
        defaultValue: descriptor.defaultValue
      } as TDescriptor;
  }
}

export function cloneRuntimeResolvedDiscreteControlState<
  TState extends RuntimeResolvedDiscreteControlState
>(state: TState): TState {
  switch (state.type) {
    case "actorPresence":
      return createResolvedActorPresenceState({
        target: state.target,
        value: state.value,
        source: state.source
      }) as TState;
    case "lightEnabled":
      return createResolvedLightEnabledState({
        target: state.target,
        value: state.value,
        source: state.source
      }) as TState;
    case "interactionEnabled":
      return createResolvedInteractionEnabledState({
        target: state.target,
        value: state.value,
        source: state.source
      }) as TState;
    case "modelVisibility":
      return createResolvedModelInstanceVisibilityState({
        target: state.target,
        value: state.value,
        source: state.source
      }) as TState;
    case "soundPlayback":
      return createResolvedSoundPlaybackState({
        target: state.target,
        value: state.value,
        source: state.source
      }) as TState;
    case "modelAnimationPlayback":
      return createResolvedModelAnimationPlaybackState({
        target: state.target,
        clipName: state.clipName,
        loop: state.loop,
        source: state.source
      }) as TState;
    case "lightColor":
      return createResolvedLightColorState({
        target: state.target,
        value: state.value,
        source: state.source
      }) as TState;
    case "ambientLightColor":
      return createResolvedAmbientLightColorState({
        target: state.target,
        value: state.value,
        source: state.source
      }) as TState;
    case "sunLightColor":
      return createResolvedSunLightColorState({
        target: state.target,
        value: state.value,
        source: state.source
      }) as TState;
  }
}

export function cloneRuntimeResolvedControlChannelValue<
  TValue extends RuntimeResolvedControlChannelValue
>(value: TValue): TValue {
  switch (value.type) {
    case "lightIntensity":
      return createResolvedLightIntensityChannelValue({
        descriptor: value.descriptor,
        value: value.value,
        source: value.source
      }) as TValue;
    case "soundVolume":
      return createResolvedSoundVolumeChannelValue({
        descriptor: value.descriptor,
        value: value.value,
        source: value.source
      }) as TValue;
    case "ambientLightIntensity":
      return createResolvedAmbientLightIntensityChannelValue({
        descriptor: value.descriptor,
        value: value.value,
        source: value.source
      }) as TValue;
    case "sunLightIntensity":
      return createResolvedSunLightIntensityChannelValue({
        descriptor: value.descriptor,
        value: value.value,
        source: value.source
      }) as TValue;
  }
}

export function cloneRuntimeResolvedControlState(
  state: RuntimeResolvedControlState
): RuntimeResolvedControlState {
  return {
    discrete: state.discrete.map(cloneRuntimeResolvedDiscreteControlState),
    channels: state.channels.map(cloneRuntimeResolvedControlChannelValue)
  };
}

export function cloneRuntimeControlSurfaceDefinition(
  controlSurface: RuntimeControlSurfaceDefinition
): RuntimeControlSurfaceDefinition {
  return {
    targets: controlSurface.targets.map(cloneControlTargetDescriptor),
    channels: controlSurface.channels.map(cloneControlChannelDescriptor),
    baselineResolved: cloneRuntimeResolvedControlState(
      controlSurface.baselineResolved
    ),
    resolved: cloneRuntimeResolvedControlState(controlSurface.resolved)
  };
}

export function areControlEffectsEqual(
  left: ControlEffect,
  right: ControlEffect
): boolean {
  if (left.type !== right.type) {
    return false;
  }

  if (
    getControlTargetRefKey(left.target) !== getControlTargetRefKey(right.target)
  ) {
    return false;
  }

  switch (left.type) {
    case "setActorPresence":
      return left.active === (right as SetActorPresenceControlEffect).active;
    case "playModelAnimation":
      return (
        left.clipName === (right as PlayModelAnimationControlEffect).clipName &&
        left.loop === (right as PlayModelAnimationControlEffect).loop
      );
    case "stopModelAnimation":
    case "playSound":
    case "stopSound":
      return true;
    case "setModelInstanceVisible":
      return (
        left.visible ===
        (right as SetModelInstanceVisibleControlEffect).visible
      );
    case "setSoundVolume":
      return left.volume === (right as SetSoundVolumeControlEffect).volume;
    case "setInteractionEnabled":
      return (
        left.enabled === (right as SetInteractionEnabledControlEffect).enabled
      );
    case "setLightEnabled":
      return left.enabled === (right as SetLightEnabledControlEffect).enabled;
    case "setLightIntensity":
      return (
        left.intensity === (right as SetLightIntensityControlEffect).intensity
      );
    case "setLightColor":
      return left.colorHex === (right as SetLightColorControlEffect).colorHex;
    case "setAmbientLightIntensity":
      return (
        left.intensity ===
        (right as SetAmbientLightIntensityControlEffect).intensity
      );
    case "setAmbientLightColor":
      return (
        left.colorHex ===
        (right as SetAmbientLightColorControlEffect).colorHex
      );
    case "setSunLightIntensity":
      return (
        left.intensity === (right as SetSunLightIntensityControlEffect).intensity
      );
    case "setSunLightColor":
      return left.colorHex === (right as SetSunLightColorControlEffect).colorHex;
  }
}

export function getControlEffectLabel(effect: ControlEffect): string {
  switch (effect.type) {
    case "setActorPresence":
      return "Set Actor Presence";
    case "playModelAnimation":
      return "Play Animation";
    case "stopModelAnimation":
      return "Stop Animation";
    case "setModelInstanceVisible":
      return "Set Model Visibility";
    case "playSound":
      return "Play Sound";
    case "stopSound":
      return "Stop Sound";
    case "setSoundVolume":
      return "Set Sound Volume";
    case "setInteractionEnabled":
      return "Set Interaction Enabled";
    case "setLightEnabled":
      return "Set Light Enabled";
    case "setLightIntensity":
      return "Set Light Intensity";
    case "setLightColor":
      return "Set Light Color";
    case "setAmbientLightIntensity":
      return "Set Ambient Light Intensity";
    case "setAmbientLightColor":
      return "Set Ambient Light Color";
    case "setSunLightIntensity":
      return "Set Sun Light Intensity";
    case "setSunLightColor":
      return "Set Sun Light Color";
  }
}

export function formatControlTargetRef(target: ControlTargetRef): string {
  switch (target.kind) {
    case "actor":
      return `Actor ${target.actorId}`;
    case "entity":
      return `${formatTargetKindLabel(target.entityKind)} ${target.entityId}`;
    case "interaction":
      return `${formatTargetKindLabel(target.interactionKind)} ${target.entityId}`;
    case "scene":
      return "Active Scene";
    case "global":
      return "Project";
    case "modelInstance":
      return `Model Instance ${target.modelInstanceId}`;
  }
}

function formatTargetKindLabel(
  kind: ControlEntityTargetKind | ControlInteractionTargetKind
): string {
  switch (kind) {
    case "pointLight":
      return "Point Light";
    case "spotLight":
      return "Spot Light";
    case "soundEmitter":
      return "Sound Emitter";
    case "interactable":
      return "Interactable";
    case "sceneExit":
      return "Scene Exit";
  }
}

export function formatControlEffectValue(effect: ControlEffect): string {
  switch (effect.type) {
    case "setActorPresence":
      return effect.active ? "Present" : "Hidden";
    case "playModelAnimation":
      return effect.loop === false
        ? `${effect.clipName} (Once)`
        : `${effect.clipName} (Loop)`;
    case "stopModelAnimation":
      return "Stop";
    case "setModelInstanceVisible":
      return effect.visible ? "Visible" : "Hidden";
    case "playSound":
      return "Play";
    case "stopSound":
      return "Stop";
    case "setSoundVolume":
      return String(effect.volume);
    case "setInteractionEnabled":
    case "setLightEnabled":
      return effect.enabled ? "Enabled" : "Disabled";
    case "setLightIntensity":
    case "setAmbientLightIntensity":
    case "setSunLightIntensity":
      return String(effect.intensity);
    case "setLightColor":
    case "setAmbientLightColor":
    case "setSunLightColor":
      return effect.colorHex;
  }
}

export function applyControlEffectToResolvedState(
  resolved: RuntimeResolvedControlState,
  effect: ControlEffect,
  source: RuntimeResolvedControlSource
): RuntimeResolvedControlState {
  const nextResolved = cloneRuntimeResolvedControlState(resolved);

  switch (effect.type) {
    case "setActorPresence":
      upsertResolvedDiscreteState(
        nextResolved,
        createResolvedActorPresenceState({
          target: effect.target,
          value: effect.active,
          source
        })
      );
      return nextResolved;
    case "playModelAnimation":
      upsertResolvedDiscreteState(
        nextResolved,
        createResolvedModelAnimationPlaybackState({
          target: effect.target,
          clipName: effect.clipName,
          loop: effect.loop,
          source
        })
      );
      return nextResolved;
    case "stopModelAnimation":
      upsertResolvedDiscreteState(
        nextResolved,
        createResolvedModelAnimationPlaybackState({
          target: effect.target,
          clipName: null,
          loop: undefined,
          source
        })
      );
      return nextResolved;
    case "setModelInstanceVisible":
      upsertResolvedDiscreteState(
        nextResolved,
        createResolvedModelInstanceVisibilityState({
          target: effect.target,
          value: effect.visible,
          source
        })
      );
      return nextResolved;
    case "playSound":
      upsertResolvedDiscreteState(
        nextResolved,
        createResolvedSoundPlaybackState({
          target: effect.target,
          value: true,
          source
        })
      );
      return nextResolved;
    case "stopSound":
      upsertResolvedDiscreteState(
        nextResolved,
        createResolvedSoundPlaybackState({
          target: effect.target,
          value: false,
          source
        })
      );
      return nextResolved;
    case "setSoundVolume": {
      const descriptor =
        nextResolved.channels.find(
          (
            candidate
          ): candidate is RuntimeResolvedSoundVolumeChannelValue =>
            candidate.type === "soundVolume" &&
            getControlTargetRefKey(candidate.descriptor.target) ===
              getControlTargetRefKey(effect.target)
        )?.descriptor ??
        createSoundVolumeControlChannelDescriptor({
          target: effect.target,
          defaultValue: effect.volume
        });

      upsertResolvedChannelValue(
        nextResolved,
        createResolvedSoundVolumeChannelValue({
          descriptor,
          value: effect.volume,
          source
        })
      );
      return nextResolved;
    }
    case "setInteractionEnabled":
      upsertResolvedDiscreteState(
        nextResolved,
        createResolvedInteractionEnabledState({
          target: effect.target,
          value: effect.enabled,
          source
        })
      );
      return nextResolved;
    case "setLightEnabled":
      upsertResolvedDiscreteState(
        nextResolved,
        createResolvedLightEnabledState({
          target: effect.target,
          value: effect.enabled,
          source
        })
      );
      return nextResolved;
    case "setLightIntensity": {
      const descriptor =
        nextResolved.channels.find(
          (
            candidate
          ): candidate is RuntimeResolvedLightIntensityChannelValue =>
            candidate.type === "lightIntensity" &&
            getControlTargetRefKey(candidate.descriptor.target) ===
              getControlTargetRefKey(effect.target)
        )?.descriptor ??
        createLightIntensityControlChannelDescriptor({
          target: effect.target,
          defaultValue: effect.intensity
        });

      upsertResolvedChannelValue(
        nextResolved,
        createResolvedLightIntensityChannelValue({
          descriptor,
          value: effect.intensity,
          source
        })
      );
      return nextResolved;
    }
    case "setLightColor":
      upsertResolvedDiscreteState(
        nextResolved,
        createResolvedLightColorState({
          target: effect.target,
          value: effect.colorHex,
          source
        })
      );
      return nextResolved;
    case "setAmbientLightIntensity": {
      const descriptor =
        nextResolved.channels.find(
          (
            candidate
          ): candidate is RuntimeResolvedAmbientLightIntensityChannelValue =>
            candidate.type === "ambientLightIntensity" &&
            getControlTargetRefKey(candidate.descriptor.target) ===
              getControlTargetRefKey(effect.target)
        )?.descriptor ??
        createAmbientLightIntensityControlChannelDescriptor({
          target: effect.target,
          defaultValue: effect.intensity
        });

      upsertResolvedChannelValue(
        nextResolved,
        createResolvedAmbientLightIntensityChannelValue({
          descriptor,
          value: effect.intensity,
          source
        })
      );
      return nextResolved;
    }
    case "setAmbientLightColor":
      upsertResolvedDiscreteState(
        nextResolved,
        createResolvedAmbientLightColorState({
          target: effect.target,
          value: effect.colorHex,
          source
        })
      );
      return nextResolved;
    case "setSunLightIntensity": {
      const descriptor =
        nextResolved.channels.find(
          (
            candidate
          ): candidate is RuntimeResolvedSunLightIntensityChannelValue =>
            candidate.type === "sunLightIntensity" &&
            getControlTargetRefKey(candidate.descriptor.target) ===
              getControlTargetRefKey(effect.target)
        )?.descriptor ??
        createSunLightIntensityControlChannelDescriptor({
          target: effect.target,
          defaultValue: effect.intensity
        });

      upsertResolvedChannelValue(
        nextResolved,
        createResolvedSunLightIntensityChannelValue({
          descriptor,
          value: effect.intensity,
          source
        })
      );
      return nextResolved;
    }
    case "setSunLightColor":
      upsertResolvedDiscreteState(
        nextResolved,
        createResolvedSunLightColorState({
          target: effect.target,
          value: effect.colorHex,
          source
        })
      );
      return nextResolved;
  }
}
