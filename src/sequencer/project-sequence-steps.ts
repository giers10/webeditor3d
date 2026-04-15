import {
  cloneControlEffect,
  getControlEffectLabel,
  type ControlEffect
} from "../controls/control-surface";
import {
  getInteractionActionControlEffect,
  type InteractionLink
} from "../interactions/interaction-links";
import type { ProjectScheduleRoutine } from "../scheduler/project-scheduler";

export interface HeldControlSequenceEffect {
  stepClass: "held";
  type: "controlEffect";
  effect: ControlEffect;
}

export interface ImpulseControlSequenceEffect {
  stepClass: "impulse";
  type: "controlEffect";
  effect: ControlEffect;
}

export interface StartDialogueSequenceEffect {
  stepClass: "impulse";
  type: "startDialogue";
  dialogueId: string;
}

export interface MakeNpcTalkSequenceEffect {
  stepClass: "impulse";
  type: "makeNpcTalk";
  npcEntityId: string;
  dialogueId: string | null;
}

export interface TeleportPlayerSequenceEffect {
  stepClass: "impulse";
  type: "teleportPlayer";
  targetEntityId: string;
}

export interface StartSceneTransitionSequenceEffect {
  stepClass: "impulse";
  type: "startSceneTransition";
  targetSceneId: string;
  targetEntryEntityId: string;
}

export const SEQUENCE_VISIBILITY_MODES = ["toggle", "show", "hide"] as const;
export type SequenceVisibilityMode = (typeof SEQUENCE_VISIBILITY_MODES)[number];

export interface BrushSequenceVisibilityTarget {
  kind: "brush";
  brushId: string;
}

export interface ModelInstanceSequenceVisibilityTarget {
  kind: "modelInstance";
  modelInstanceId: string;
}

export type SequenceVisibilityTarget =
  | BrushSequenceVisibilityTarget
  | ModelInstanceSequenceVisibilityTarget;

export interface SetVisibilitySequenceEffect {
  stepClass: "impulse";
  type: "setVisibility";
  target: SequenceVisibilityTarget;
  mode: SequenceVisibilityMode;
}

type SequenceDefinitionLike = {
  id: string;
  effects: SequenceEffect[];
};

type SequenceLibraryLike = {
  sequences: Record<string, SequenceDefinitionLike>;
};

export type HeldSequenceStep = HeldControlSequenceEffect;

export type ImpulseSequenceStep =
  | ImpulseControlSequenceEffect
  | MakeNpcTalkSequenceEffect
  | StartDialogueSequenceEffect
  | TeleportPlayerSequenceEffect
  | StartSceneTransitionSequenceEffect
  | SetVisibilitySequenceEffect;

export type SequenceEffect = HeldSequenceStep | ImpulseSequenceStep;
export type SequenceClip = SequenceEffect;
export type SequenceStep = SequenceEffect;

export function cloneSequenceEffect(effect: SequenceEffect): SequenceEffect {
  switch (effect.type) {
    case "controlEffect":
      return {
        stepClass: effect.stepClass,
        type: "controlEffect",
        effect: cloneControlEffect(effect.effect)
      };
    case "startDialogue":
      return {
        stepClass: "impulse",
        type: "startDialogue",
        dialogueId: effect.dialogueId
      };
    case "makeNpcTalk":
      return {
        stepClass: "impulse",
        type: "makeNpcTalk",
        npcEntityId: effect.npcEntityId,
        dialogueId: effect.dialogueId
      };
    case "teleportPlayer":
      return {
        stepClass: "impulse",
        type: "teleportPlayer",
        targetEntityId: effect.targetEntityId
      };
    case "startSceneTransition":
      return {
        stepClass: "impulse",
        type: "startSceneTransition",
        targetSceneId: effect.targetSceneId,
        targetEntryEntityId: effect.targetEntryEntityId
      };
    case "setVisibility":
      return {
        stepClass: "impulse",
        type: "setVisibility",
        target:
          effect.target.kind === "brush"
            ? {
                kind: "brush",
                brushId: effect.target.brushId
              }
            : {
                kind: "modelInstance",
                modelInstanceId: effect.target.modelInstanceId
              },
        mode: effect.mode
      };
  }
}

export function cloneSequenceClip(clip: SequenceClip): SequenceClip {
  return cloneSequenceEffect(clip);
}

export function cloneSequenceStep(step: SequenceStep): SequenceStep {
  return cloneSequenceEffect(step);
}

export function cloneSequenceEffects(effects: SequenceEffect[]): SequenceEffect[] {
  return effects.map(cloneSequenceEffect);
}

export function cloneSequenceClips(clips: SequenceClip[]): SequenceClip[] {
  return cloneSequenceEffects(clips);
}

export function cloneSequenceSteps(steps: SequenceStep[]): SequenceStep[] {
  return cloneSequenceEffects(steps);
}

export function getSequenceEffectLabel(effect: SequenceEffect): string {
  switch (effect.type) {
    case "controlEffect":
      return getControlEffectLabel(effect.effect);
    case "startDialogue":
      return "Start Dialogue";
    case "makeNpcTalk":
      return "Make NPC Talk";
    case "teleportPlayer":
      return "Teleport Player";
    case "startSceneTransition":
      return "Change Scene";
    case "setVisibility":
      switch (effect.mode) {
        case "show":
          return "Show";
        case "hide":
          return "Hide";
        case "toggle":
          return "Toggle Visibility";
      }
  }
}

export function getSequenceClipLabel(clip: SequenceClip): string {
  return getSequenceEffectLabel(clip);
}

export function getSequenceStepLabel(step: SequenceStep): string {
  return getSequenceEffectLabel(step);
}

export function getHeldSequenceEffects(
  effects: readonly SequenceEffect[]
): HeldSequenceStep[] {
  return effects
    .filter((effect): effect is HeldSequenceStep => effect.stepClass === "held")
    .map(cloneSequenceEffect) as HeldSequenceStep[];
}

export function getHeldSequenceClips(
  clips: readonly SequenceClip[]
): HeldSequenceStep[] {
  return getHeldSequenceEffects(clips);
}

export function getHeldSequenceSteps(
  steps: readonly SequenceStep[]
): HeldSequenceStep[] {
  return getHeldSequenceEffects(steps);
}

export function getImpulseSequenceEffects(
  effects: readonly SequenceEffect[]
): ImpulseSequenceStep[] {
  return effects
    .filter((effect): effect is ImpulseSequenceStep => effect.stepClass === "impulse")
    .map(cloneSequenceEffect) as ImpulseSequenceStep[];
}

export function getImpulseSequenceClips(
  clips: readonly SequenceClip[]
): ImpulseSequenceStep[] {
  return getImpulseSequenceEffects(clips);
}

export function getImpulseSequenceSteps(
  steps: readonly SequenceStep[]
): ImpulseSequenceStep[] {
  return getImpulseSequenceEffects(steps);
}

export function getProjectSequenceHeldEffects(
  sequence: SequenceDefinitionLike
): HeldSequenceStep[] {
  return getHeldSequenceEffects(sequence.effects);
}

export function getProjectSequenceHeldClips(
  sequence: SequenceDefinitionLike
): HeldSequenceStep[] {
  return getProjectSequenceHeldEffects(sequence);
}

export function getProjectSequenceHeldSteps(
  sequence: SequenceDefinitionLike
): HeldSequenceStep[] {
  return getProjectSequenceHeldEffects(sequence);
}

export function getProjectSequenceImpulseEffects(
  sequence: SequenceDefinitionLike
): ImpulseSequenceStep[] {
  return getImpulseSequenceEffects(sequence.effects);
}

export function getProjectSequenceImpulseClips(
  sequence: SequenceDefinitionLike
): ImpulseSequenceStep[] {
  return getProjectSequenceImpulseEffects(sequence);
}

export function getProjectSequenceImpulseSteps(
  sequence: SequenceDefinitionLike
): ImpulseSequenceStep[] {
  return getProjectSequenceImpulseEffects(sequence);
}

export function getInteractionLinkImpulseEffects(
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
          type: "setVisibility",
          target: {
            kind: "brush",
            brushId: link.action.targetBrushId
          },
          mode:
            link.action.visible === undefined
              ? "toggle"
              : link.action.visible
                ? "show"
                : "hide"
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
      return sequence === null ? [] : getProjectSequenceImpulseEffects(sequence);
    }
    case "playAnimation":
    case "stopAnimation":
    case "playSound":
    case "stopSound":
    case "control":
      throw new Error(
        `Interaction action ${link.action.type} should have normalized to a controlEffect sequence effect.`
      );
  }
}

export function getInteractionLinkImpulseClips(
  link: InteractionLink,
  sequenceLibrary?: SequenceLibraryLike | null
): ImpulseSequenceStep[] {
  return getInteractionLinkImpulseEffects(link, sequenceLibrary);
}

export function getInteractionLinkImpulseSteps(
  link: InteractionLink,
  sequenceLibrary?: SequenceLibraryLike | null
): ImpulseSequenceStep[] {
  return getInteractionLinkImpulseEffects(link, sequenceLibrary);
}

export function getInteractionLinkSequenceEffects(
  link: InteractionLink,
  sequenceLibrary?: SequenceLibraryLike | null
): SequenceEffect[] {
  return getInteractionLinkImpulseEffects(link, sequenceLibrary);
}

export function getInteractionLinkSequenceClips(
  link: InteractionLink,
  sequenceLibrary?: SequenceLibraryLike | null
): SequenceClip[] {
  return getInteractionLinkSequenceEffects(link, sequenceLibrary);
}

export function getInteractionLinkSequenceSteps(
  link: InteractionLink,
  sequenceLibrary?: SequenceLibraryLike | null
): SequenceStep[] {
  return getInteractionLinkSequenceEffects(link, sequenceLibrary);
}

export function getProjectScheduleRoutineHeldEffects(
  routine: ProjectScheduleRoutine,
  sequenceLibrary?: SequenceLibraryLike | null
): HeldSequenceStep[] {
  if (routine.sequenceId !== null) {
    const sequence = sequenceLibrary?.sequences[routine.sequenceId] ?? null;

    if (sequence !== null) {
      return getProjectSequenceHeldEffects(sequence);
    }
  }

  return routine.effects.map((effect) => ({
    stepClass: "held" as const,
    type: "controlEffect" as const,
    effect: cloneControlEffect(effect)
  }));
}

export function getProjectScheduleRoutineHeldClips(
  routine: ProjectScheduleRoutine,
  sequenceLibrary?: SequenceLibraryLike | null
): HeldSequenceStep[] {
  return getProjectScheduleRoutineHeldEffects(routine, sequenceLibrary);
}

export function getProjectScheduleRoutineHeldSteps(
  routine: ProjectScheduleRoutine,
  sequenceLibrary?: SequenceLibraryLike | null
): HeldSequenceStep[] {
  return getProjectScheduleRoutineHeldEffects(routine, sequenceLibrary);
}

export function getProjectScheduleRoutineSequenceEffects(
  routine: ProjectScheduleRoutine,
  sequenceLibrary?: SequenceLibraryLike | null
): SequenceEffect[] {
  return getProjectScheduleRoutineHeldEffects(routine, sequenceLibrary);
}

export function getProjectScheduleRoutineSequenceClips(
  routine: ProjectScheduleRoutine,
  sequenceLibrary?: SequenceLibraryLike | null
): SequenceClip[] {
  return getProjectScheduleRoutineSequenceEffects(routine, sequenceLibrary);
}

export function getProjectScheduleRoutineSequenceSteps(
  routine: ProjectScheduleRoutine,
  sequenceLibrary?: SequenceLibraryLike | null
): SequenceStep[] {
  return getProjectScheduleRoutineSequenceEffects(routine, sequenceLibrary);
}

export function getHeldSequenceControlEffects(
  steps: readonly HeldSequenceStep[]
): ControlEffect[] {
  return steps
    .filter((step): step is HeldControlSequenceEffect => step.type === "controlEffect")
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
