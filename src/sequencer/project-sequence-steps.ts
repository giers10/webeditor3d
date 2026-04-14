import {
  getControlEffectLabel,
  cloneControlEffect,
  getControlEffectResolutionKey,
  type ControlEffect
} from "../controls/control-surface";
import { HOURS_PER_DAY } from "../document/project-time-settings";
import {
  getInteractionActionControlEffect,
  type InteractionLink
} from "../interactions/interaction-links";
import type { ProjectScheduleRoutine } from "../scheduler/project-scheduler";

export const DEFAULT_PROJECT_SEQUENCE_DURATION_MINUTES = 240 as const;
export const LEGACY_PROJECT_SEQUENCE_DURATION_MINUTES = HOURS_PER_DAY * 60;
export const DEFAULT_HELD_SEQUENCE_CLIP_DURATION_MINUTES = 60 as const;
export const DEFAULT_IMPULSE_SEQUENCE_CLIP_DURATION_MINUTES = 1 as const;
export const MIN_PROJECT_SEQUENCE_CLIP_DURATION_MINUTES = 1 as const;

export interface SequenceClipTiming {
  startMinute: number;
  durationMinutes: number;
  lane: number;
}

interface BaseSequenceClip extends SequenceClipTiming {
  stepClass: "held" | "impulse";
}

export interface HeldControlSequenceStep extends BaseSequenceClip {
  stepClass: "held";
  type: "controlEffect";
  effect: ControlEffect;
}

export interface ImpulseControlSequenceStep extends BaseSequenceClip {
  stepClass: "impulse";
  type: "controlEffect";
  effect: ControlEffect;
}

export interface StartDialogueSequenceStep extends BaseSequenceClip {
  stepClass: "impulse";
  type: "startDialogue";
  dialogueId: string;
}

export interface TeleportPlayerSequenceStep extends BaseSequenceClip {
  stepClass: "impulse";
  type: "teleportPlayer";
  targetEntityId: string;
}

export interface ToggleVisibilitySequenceStep extends BaseSequenceClip {
  stepClass: "impulse";
  type: "toggleVisibility";
  targetBrushId: string;
  visible?: boolean;
}

type SequenceDefinitionLike = {
  id: string;
  clips: SequenceClip[];
};

type SequenceLibraryLike = {
  sequences: Record<string, SequenceDefinitionLike>;
};

export type HeldSequenceStep = HeldControlSequenceStep;

export type ImpulseSequenceStep =
  | ImpulseControlSequenceStep
  | StartDialogueSequenceStep
  | TeleportPlayerSequenceStep
  | ToggleVisibilitySequenceStep;

export type SequenceClip = HeldSequenceStep | ImpulseSequenceStep;
export type SequenceStep = SequenceClip;

function normalizeSequenceClipStartMinute(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

function getDefaultSequenceClipDurationMinutes(
  stepClass: SequenceClip["stepClass"]
): number {
  return stepClass === "held"
    ? LEGACY_PROJECT_SEQUENCE_DURATION_MINUTES
    : DEFAULT_IMPULSE_SEQUENCE_CLIP_DURATION_MINUTES;
}

function normalizeSequenceClipDurationMinutes(
  value: number | undefined,
  stepClass: SequenceClip["stepClass"]
): number {
  if (value === undefined || !Number.isFinite(value)) {
    return getDefaultSequenceClipDurationMinutes(stepClass);
  }

  return Math.max(
    MIN_PROJECT_SEQUENCE_CLIP_DURATION_MINUTES,
    Math.trunc(value)
  );
}

function normalizeSequenceClipLane(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

function cloneSequenceClipTiming(
  clip: Pick<SequenceClip, "stepClass" | "startMinute" | "durationMinutes" | "lane">
): SequenceClipTiming {
  return {
    startMinute: normalizeSequenceClipStartMinute(clip.startMinute),
    durationMinutes: normalizeSequenceClipDurationMinutes(
      clip.durationMinutes,
      clip.stepClass
    ),
    lane: normalizeSequenceClipLane(clip.lane)
  };
}

export function cloneSequenceClip(clip: SequenceClip): SequenceClip {
  const timing = cloneSequenceClipTiming(clip);

  switch (clip.type) {
    case "controlEffect":
      return {
        ...timing,
        stepClass: clip.stepClass,
        type: "controlEffect",
        effect: cloneControlEffect(clip.effect)
      };
    case "startDialogue":
      return {
        ...timing,
        stepClass: "impulse",
        type: "startDialogue",
        dialogueId: clip.dialogueId
      };
    case "teleportPlayer":
      return {
        ...timing,
        stepClass: "impulse",
        type: "teleportPlayer",
        targetEntityId: clip.targetEntityId
      };
    case "toggleVisibility":
      return {
        ...timing,
        stepClass: "impulse",
        type: "toggleVisibility",
        targetBrushId: clip.targetBrushId,
        visible: clip.visible
      };
  }
}

export function cloneSequenceStep(step: SequenceStep): SequenceStep {
  return cloneSequenceClip(step);
}

export function cloneSequenceClips(clips: SequenceClip[]): SequenceClip[] {
  return clips.map(cloneSequenceClip);
}

export function cloneSequenceSteps(steps: SequenceStep[]): SequenceStep[] {
  return cloneSequenceClips(steps);
}

export function getSequenceClipLabel(clip: SequenceClip): string {
  switch (clip.type) {
    case "controlEffect":
      return `${clip.stepClass === "held" ? "Held" : "Impulse"}: ${getControlEffectLabel(clip.effect)}`;
    case "startDialogue":
      return "Impulse: Start Dialogue";
    case "teleportPlayer":
      return "Impulse: Teleport Player";
    case "toggleVisibility":
      return "Impulse: Toggle Visibility";
  }
}

export function getSequenceStepLabel(step: SequenceStep): string {
  return getSequenceClipLabel(step);
}

export function getHeldSequenceSteps(
  steps: readonly SequenceStep[]
): HeldSequenceStep[] {
  return getHeldSequenceClips(steps);
}

export function getImpulseSequenceSteps(
  steps: readonly SequenceStep[]
): ImpulseSequenceStep[] {
  return getImpulseSequenceClips(steps);
}

export function getHeldSequenceClips(
  clips: readonly SequenceClip[]
): HeldSequenceStep[] {
  return clips
    .filter((clip): clip is HeldSequenceStep => clip.stepClass === "held")
    .map(cloneSequenceClip) as HeldSequenceStep[];
}

export function getImpulseSequenceClips(
  clips: readonly SequenceClip[]
): ImpulseSequenceStep[] {
  return clips
    .filter((clip): clip is ImpulseSequenceStep => clip.stepClass === "impulse")
    .map(cloneSequenceClip) as ImpulseSequenceStep[];
}

export function getProjectSequenceHeldSteps(
  sequence: SequenceDefinitionLike
): HeldSequenceStep[] {
  return getProjectSequenceHeldClips(sequence);
}

export function getProjectSequenceImpulseSteps(
  sequence: SequenceDefinitionLike
): ImpulseSequenceStep[] {
  return getProjectSequenceImpulseClips(sequence);
}

export function getProjectSequenceHeldClips(
  sequence: SequenceDefinitionLike
): HeldSequenceStep[] {
  return getHeldSequenceClips(sequence.clips);
}

export function getProjectSequenceImpulseClips(
  sequence: SequenceDefinitionLike
): ImpulseSequenceStep[] {
  return getImpulseSequenceClips(sequence.clips);
}

export function getSequenceClipEndMinute(
  clip: Pick<SequenceClip, "startMinute" | "durationMinutes">
): number {
  return clip.startMinute + clip.durationMinutes;
}

export function getProjectSequenceDurationMinutes(sequence: SequenceDefinitionLike): number {
  return sequence.clips.reduce((maxDuration, clip) => {
    return Math.max(maxDuration, getSequenceClipEndMinute(clip));
  }, DEFAULT_PROJECT_SEQUENCE_DURATION_MINUTES);
}

export function isHeldSequenceClipActiveAtMinute(
  clip: HeldSequenceStep,
  minute: number
): boolean {
  if (!Number.isFinite(minute) || minute < 0) {
    return false;
  }

  return minute >= clip.startMinute && minute < getSequenceClipEndMinute(clip);
}

export interface ActiveHeldSequenceClip<
  TClip extends HeldSequenceStep = HeldSequenceStep
> {
  clip: TClip;
  elapsedMinutes: number;
  clipIndex: number;
}

export function getActiveHeldSequenceClipsAtMinute(
  sequence: SequenceDefinitionLike,
  minute: number
): ActiveHeldSequenceClip[] {
  if (!Number.isFinite(minute) || minute < 0) {
    return [];
  }

  const active: ActiveHeldSequenceClip[] = [];

  for (const [clipIndex, clip] of sequence.clips.entries()) {
    if (clip.stepClass !== "held" || !isHeldSequenceClipActiveAtMinute(clip, minute)) {
      continue;
    }

    active.push({
      clip,
      elapsedMinutes: minute - clip.startMinute,
      clipIndex
    });
  }

  return active;
}

export interface ResolvedHeldControlSequenceEffect {
  effect: ControlEffect;
  elapsedMinutes: number;
  source: "inline" | "sequence";
  clipIndex: number | null;
}

export function getProjectScheduleRoutineResolvedHeldControlEffectsAtMinute(
  routine: ProjectScheduleRoutine,
  sequenceLibrary: SequenceLibraryLike | null | undefined,
  routineElapsedMinutes: number | null
): ResolvedHeldControlSequenceEffect[] {
  const resolvedByKey = new Map<string, ResolvedHeldControlSequenceEffect>();

  for (const effect of routine.effects) {
    resolvedByKey.set(getControlEffectResolutionKey(effect), {
      effect: cloneControlEffect(effect),
      elapsedMinutes: Math.max(0, routineElapsedMinutes ?? 0),
      source: "inline",
      clipIndex: null
    });
  }

  if (routine.sequenceId === null || routineElapsedMinutes === null) {
    return [...resolvedByKey.values()];
  }

  const sequence = sequenceLibrary?.sequences[routine.sequenceId] ?? null;

  if (sequence === null) {
    return [...resolvedByKey.values()];
  }

  for (const activeClip of getActiveHeldSequenceClipsAtMinute(
    sequence,
    routineElapsedMinutes
  )) {
    if (activeClip.clip.type !== "controlEffect") {
      continue;
    }

    resolvedByKey.set(
      getControlEffectResolutionKey(activeClip.clip.effect),
      {
        effect: cloneControlEffect(activeClip.clip.effect),
        elapsedMinutes: activeClip.elapsedMinutes,
        source: "sequence",
        clipIndex: activeClip.clipIndex
      }
    );
  }

  return [...resolvedByKey.values()];
}

export function getInteractionLinkImpulseSteps(
  link: InteractionLink,
  sequenceLibrary?: SequenceLibraryLike | null
): ImpulseSequenceStep[] {
  return getInteractionLinkImpulseClips(link, sequenceLibrary);
}

export function getInteractionLinkImpulseClips(
  link: InteractionLink,
  sequenceLibrary?: SequenceLibraryLike | null
): ImpulseSequenceStep[] {
  const controlEffect = getInteractionActionControlEffect(link.action);

  if (controlEffect !== null) {
    return [
      {
        startMinute: 0,
        durationMinutes: DEFAULT_IMPULSE_SEQUENCE_CLIP_DURATION_MINUTES,
        lane: 0,
        stepClass: "impulse",
        type: "controlEffect",
        effect: controlEffect
      }
    ];
  }

  switch (link.action.type) {
    case "teleportPlayer":
      return [
        {
          startMinute: 0,
          durationMinutes: DEFAULT_IMPULSE_SEQUENCE_CLIP_DURATION_MINUTES,
          lane: 0,
          stepClass: "impulse",
          type: "teleportPlayer",
          targetEntityId: link.action.targetEntityId
        }
      ];
    case "toggleVisibility":
      return [
        {
          startMinute: 0,
          durationMinutes: DEFAULT_IMPULSE_SEQUENCE_CLIP_DURATION_MINUTES,
          lane: 0,
          stepClass: "impulse",
          type: "toggleVisibility",
          targetBrushId: link.action.targetBrushId,
          visible: link.action.visible
        }
      ];
    case "startDialogue":
      return [
        {
          startMinute: 0,
          durationMinutes: DEFAULT_IMPULSE_SEQUENCE_CLIP_DURATION_MINUTES,
          lane: 0,
          stepClass: "impulse",
          type: "startDialogue",
          dialogueId: link.action.dialogueId
        }
      ];
    case "runSequence": {
      const sequence =
        sequenceLibrary?.sequences[link.action.sequenceId] ?? null;
      return sequence === null ? [] : getProjectSequenceImpulseClips(sequence);
    }
    case "playAnimation":
    case "stopAnimation":
    case "playSound":
    case "stopSound":
    case "control":
      throw new Error(
        `Interaction action ${link.action.type} should have normalized to a controlEffect sequence step.`
      );
  }
}

export function getInteractionLinkSequenceSteps(
  link: InteractionLink,
  sequenceLibrary?: SequenceLibraryLike | null
): SequenceStep[] {
  return getInteractionLinkSequenceClips(link, sequenceLibrary);
}

export function getInteractionLinkSequenceClips(
  link: InteractionLink,
  sequenceLibrary?: SequenceLibraryLike | null
): SequenceClip[] {
  return getInteractionLinkImpulseClips(link, sequenceLibrary);
}

export function getProjectScheduleRoutineHeldSteps(
  routine: ProjectScheduleRoutine,
  sequenceLibrary?: SequenceLibraryLike | null
): HeldSequenceStep[] {
  return getProjectScheduleRoutineHeldClips(routine, sequenceLibrary);
}

export function getProjectScheduleRoutineHeldClips(
  routine: ProjectScheduleRoutine,
  sequenceLibrary?: SequenceLibraryLike | null
): HeldSequenceStep[] {
  if (routine.sequenceId !== null) {
    const sequence = sequenceLibrary?.sequences[routine.sequenceId] ?? null;

    if (sequence !== null) {
      return getProjectSequenceHeldClips(sequence);
    }
  }

  return routine.effects.map((effect) => ({
    startMinute: 0,
    durationMinutes: LEGACY_PROJECT_SEQUENCE_DURATION_MINUTES,
    lane: 0,
    stepClass: "held" as const,
    type: "controlEffect" as const,
    effect: cloneControlEffect(effect)
  }));
}

export function getProjectScheduleRoutineSequenceSteps(
  routine: ProjectScheduleRoutine,
  sequenceLibrary?: SequenceLibraryLike | null
): SequenceStep[] {
  return getProjectScheduleRoutineSequenceClips(routine, sequenceLibrary);
}

export function getProjectScheduleRoutineSequenceClips(
  routine: ProjectScheduleRoutine,
  sequenceLibrary?: SequenceLibraryLike | null
): SequenceClip[] {
  return getProjectScheduleRoutineHeldClips(routine, sequenceLibrary);
}

export function getHeldSequenceControlEffects(
  steps: readonly HeldSequenceStep[]
): ControlEffect[] {
  return steps
    .filter((step): step is HeldControlSequenceStep => step.type === "controlEffect")
    .map((step) => cloneControlEffect(step.effect));
}

export function findHeldSequenceControlEffect<
  TType extends ControlEffect["type"]
>(
  steps: readonly HeldSequenceStep[],
  type: TType
): Extract<ControlEffect, { type: TType }> | null {
  return (
    getHeldSequenceControlEffects(steps).find(
      (effect): effect is Extract<ControlEffect, { type: TType }> =>
        effect.type === type
    ) ?? null
  );
}
