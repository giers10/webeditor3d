import {
  getControlEffectLabel,
  cloneControlEffect,
  type ControlEffect
} from "../controls/control-surface";
import {
  getInteractionActionControlEffect,
  type InteractionLink
} from "../interactions/interaction-links";
import type { ProjectScheduleRoutine } from "../scheduler/project-scheduler";

export interface HeldControlSequenceStep {
  stepClass: "held";
  type: "controlEffect";
  effect: ControlEffect;
}

export interface ImpulseControlSequenceStep {
  stepClass: "impulse";
  type: "controlEffect";
  effect: ControlEffect;
}

export interface StartDialogueSequenceStep {
  stepClass: "impulse";
  type: "startDialogue";
  dialogueId: string;
}

export interface TeleportPlayerSequenceStep {
  stepClass: "impulse";
  type: "teleportPlayer";
  targetEntityId: string;
}

export interface ToggleVisibilitySequenceStep {
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

export function cloneSequenceClip(clip: SequenceClip): SequenceClip {
  switch (clip.type) {
    case "controlEffect":
      return {
        stepClass: clip.stepClass,
        type: "controlEffect",
        effect: cloneControlEffect(clip.effect)
      };
    case "startDialogue":
      return {
        stepClass: "impulse",
        type: "startDialogue",
        dialogueId: clip.dialogueId
      };
    case "teleportPlayer":
      return {
        stepClass: "impulse",
        type: "teleportPlayer",
        targetEntityId: clip.targetEntityId
      };
    case "toggleVisibility":
      return {
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
          stepClass: "impulse",
          type: "teleportPlayer",
          targetEntityId: link.action.targetEntityId
        }
      ];
    case "toggleVisibility":
      return [
        {
          stepClass: "impulse",
          type: "toggleVisibility",
          targetBrushId: link.action.targetBrushId,
          visible: link.action.visible
        }
      ];
    case "startDialogue":
      return [
        {
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
