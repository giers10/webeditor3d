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
  "animationPlayback",
  "soundPlayback",
  "interactionAvailability",
  "lightEnabled",
  "lightIntensity"
] as const;

export type ControlEntityTargetKind =
  (typeof CONTROL_ENTITY_TARGET_KINDS)[number];
export type ControlInteractionTargetKind =
  (typeof CONTROL_INTERACTION_TARGET_KINDS)[number];
export type ControlCapabilityKind = (typeof CONTROL_CAPABILITY_KINDS)[number];

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

export interface PlaySoundControlEffect {
  type: "playSound";
  target: SoundEmitterControlTargetRef;
}

export interface StopSoundControlEffect {
  type: "stopSound";
  target: SoundEmitterControlTargetRef;
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

export type ControlEffect =
  | PlayModelAnimationControlEffect
  | StopModelAnimationControlEffect
  | PlaySoundControlEffect
  | StopSoundControlEffect
  | SetInteractionEnabledControlEffect
  | SetLightEnabledControlEffect
  | SetLightIntensityControlEffect;

export interface LightIntensityControlChannelDescriptor {
  channel: "light.intensity";
  target: LightControlTargetRef;
  minValue: number;
  defaultValue: number;
}

export type ControlChannelDescriptor = LightIntensityControlChannelDescriptor;

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

export interface RuntimeResolvedInteractionEnabledState {
  type: "interactionEnabled";
  target: InteractionControlTargetRef;
  value: boolean;
  source: RuntimeResolvedControlSource;
}

export type RuntimeResolvedDiscreteControlState =
  | RuntimeResolvedLightEnabledState
  | RuntimeResolvedInteractionEnabledState;

export interface RuntimeResolvedLightIntensityChannelValue {
  type: "lightIntensity";
  descriptor: LightIntensityControlChannelDescriptor;
  value: number;
  source: RuntimeResolvedControlSource;
}

export type RuntimeResolvedControlChannelValue =
  RuntimeResolvedLightIntensityChannelValue;

export interface RuntimeResolvedControlState {
  discrete: RuntimeResolvedDiscreteControlState[];
  channels: RuntimeResolvedControlChannelValue[];
}

export interface RuntimeControlSurfaceDefinition {
  targets: ControlTargetDescriptor[];
  channels: ControlChannelDescriptor[];
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

export function createDefaultResolvedControlSource(): DefaultResolvedControlSource {
  return {
    kind: "default"
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
    resolved: createEmptyRuntimeResolvedControlState()
  };
}

export function createRuntimeControlSurfaceDefinition(options: {
  targets: ControlTargetDescriptor[];
  channels?: ControlChannelDescriptor[];
  resolved?: RuntimeResolvedControlState;
}): RuntimeControlSurfaceDefinition {
  return {
    targets: options.targets.map(cloneControlTargetDescriptor),
    channels: (options.channels ?? []).map(cloneControlChannelDescriptor),
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
  switch (descriptor.channel) {
    case "light.intensity":
      return `channel:${descriptor.channel}:${getControlTargetRefKey(
        descriptor.target
      )}`;
  }
}

function getResolvedDiscreteControlStateKey(
  state: RuntimeResolvedDiscreteControlState
): string {
  switch (state.type) {
    case "lightEnabled":
      return `state:${state.type}:${getControlTargetRefKey(state.target)}`;
    case "interactionEnabled":
      return `state:${state.type}:${getControlTargetRefKey(state.target)}`;
  }
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
  }
}

export function cloneRuntimeResolvedDiscreteControlState<
  TState extends RuntimeResolvedDiscreteControlState
>(state: TState): TState {
  switch (state.type) {
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
    case "playModelAnimation":
      return (
        left.clipName === (right as PlayModelAnimationControlEffect).clipName &&
        left.loop === (right as PlayModelAnimationControlEffect).loop
      );
    case "stopModelAnimation":
    case "playSound":
    case "stopSound":
      return true;
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
  }
}

export function getControlEffectLabel(effect: ControlEffect): string {
  switch (effect.type) {
    case "playModelAnimation":
      return "Play Animation";
    case "stopModelAnimation":
      return "Stop Animation";
    case "playSound":
      return "Play Sound";
    case "stopSound":
      return "Stop Sound";
    case "setInteractionEnabled":
      return "Set Interaction Enabled";
    case "setLightEnabled":
      return "Set Light Enabled";
    case "setLightIntensity":
      return "Set Light Intensity";
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
    case "playModelAnimation":
      return effect.loop === false
        ? `${effect.clipName} (Once)`
        : `${effect.clipName} (Loop)`;
    case "stopModelAnimation":
      return "Stop";
    case "playSound":
      return "Play";
    case "stopSound":
      return "Stop";
    case "setInteractionEnabled":
    case "setLightEnabled":
      return effect.enabled ? "Enabled" : "Disabled";
    case "setLightIntensity":
      return String(effect.intensity);
  }
}

export function applyControlEffectToResolvedState(
  resolved: RuntimeResolvedControlState,
  effect: ControlEffect,
  source: RuntimeResolvedControlSource
): RuntimeResolvedControlState {
  const nextResolved = cloneRuntimeResolvedControlState(resolved);

  switch (effect.type) {
    case "setLightEnabled": {
      const nextState = createResolvedLightEnabledState({
        target: effect.target,
        value: effect.enabled,
        source
      });
      const stateKey = getResolvedDiscreteControlStateKey(nextState);
      const existingIndex = nextResolved.discrete.findIndex(
        (candidate) =>
          getResolvedDiscreteControlStateKey(candidate) === stateKey
      );

      if (existingIndex >= 0) {
        nextResolved.discrete[existingIndex] = nextState;
      } else {
        nextResolved.discrete.push(nextState);
      }
      return nextResolved;
    }
    case "setInteractionEnabled": {
      const nextState = createResolvedInteractionEnabledState({
        target: effect.target,
        value: effect.enabled,
        source
      });
      const stateKey = getResolvedDiscreteControlStateKey(nextState);
      const existingIndex = nextResolved.discrete.findIndex(
        (candidate) =>
          getResolvedDiscreteControlStateKey(candidate) === stateKey
      );

      if (existingIndex >= 0) {
        nextResolved.discrete[existingIndex] = nextState;
      } else {
        nextResolved.discrete.push(nextState);
      }
      return nextResolved;
    }
    case "setLightIntensity": {
      const nextDescriptor = createLightIntensityControlChannelDescriptor({
        target: effect.target,
        defaultValue: effect.intensity
      });
      const descriptorKey = getControlChannelDescriptorKey(nextDescriptor);
      const existingIndex = nextResolved.channels.findIndex(
        (candidate) =>
          getControlChannelDescriptorKey(candidate.descriptor) === descriptorKey
      );
      const nextValue = createResolvedLightIntensityChannelValue({
        descriptor:
          existingIndex >= 0
            ? nextResolved.channels[existingIndex].descriptor
            : nextDescriptor,
        value: effect.intensity,
        source
      });

      if (existingIndex >= 0) {
        nextResolved.channels[existingIndex] = nextValue;
      } else {
        nextResolved.channels.push(nextValue);
      }
      return nextResolved;
    }
    case "playModelAnimation":
    case "stopModelAnimation":
    case "playSound":
    case "stopSound":
      return nextResolved;
  }
}
