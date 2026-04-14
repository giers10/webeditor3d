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
  steps: SequenceStep[];
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

export type SequenceStep = HeldSequenceStep | ImpulseSequenceStep;

export function cloneSequenceStep(step: SequenceStep): SequenceStep {
  switch (step.type) {
    case "controlEffect":
      return {
        stepClass: step.stepClass,
        type: "controlEffect",
        effect: cloneControlEffect(step.effect)
      };
    case "startDialogue":
      return {
        stepClass: "impulse",
        type: "startDialogue",
        dialogueId: step.dialogueId
      };
    case "teleportPlayer":
      return {
        stepClass: "impulse",
        type: "teleportPlayer",
        targetEntityId: step.targetEntityId
      };
    case "toggleVisibility":
      return {
        stepClass: "impulse",
        type: "toggleVisibility",
        targetBrushId: step.targetBrushId,
        visible: step.visible
      };
  }
}

export function cloneSequenceSteps(steps: SequenceStep[]): SequenceStep[] {
  return steps.map(cloneSequenceStep);
}

export function getSequenceStepLabel(step: SequenceStep): string {
  switch (step.type) {
    case "controlEffect":
      return `${step.stepClass === "held" ? "Held" : "Impulse"}: ${getControlEffectLabel(step.effect)}`;
    case "startDialogue":
      return "Impulse: Start Dialogue";
    case "teleportPlayer":
      return "Impulse: Teleport Player";
    case "toggleVisibility":
      return "Impulse: Toggle Visibility";
  }
}

export function getHeldSequenceSteps(
  steps: readonly SequenceStep[]
): HeldSequenceStep[] {
  return steps
    .filter((step): step is HeldSequenceStep => step.stepClass === "held")
    .map(cloneSequenceStep) as HeldSequenceStep[];
}

export function getImpulseSequenceSteps(
  steps: readonly SequenceStep[]
): ImpulseSequenceStep[] {
  return steps
    .filter((step): step is ImpulseSequenceStep => step.stepClass === "impulse")
    .map(cloneSequenceStep) as ImpulseSequenceStep[];
}

export function getProjectSequenceHeldSteps(
  sequence: SequenceDefinitionLike
): HeldSequenceStep[] {
  return getHeldSequenceSteps(sequence.steps);
}

export function getProjectSequenceImpulseSteps(
  sequence: SequenceDefinitionLike
): ImpulseSequenceStep[] {
  return getImpulseSequenceSteps(sequence.steps);
}

export function getInteractionLinkImpulseSteps(
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
      return sequence === null ? [] : getProjectSequenceImpulseSteps(sequence);
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
  return getInteractionLinkImpulseSteps(link, sequenceLibrary);
}

export function getProjectScheduleRoutineHeldSteps(
  routine: ProjectScheduleRoutine,
  sequenceLibrary?: SequenceLibraryLike | null
): HeldSequenceStep[] {
  if (routine.sequenceId !== null) {
    const sequence = sequenceLibrary?.sequences[routine.sequenceId] ?? null;

    if (sequence !== null) {
      return getProjectSequenceHeldSteps(sequence);
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
  return getProjectScheduleRoutineHeldSteps(routine, sequenceLibrary);
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
