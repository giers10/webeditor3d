import {
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

export function getInteractionLinkImpulseSteps(
  link: InteractionLink
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
  link: InteractionLink
): SequenceStep[] {
  return getInteractionLinkImpulseSteps(link);
}

export function getProjectScheduleRoutineHeldSteps(
  routine: ProjectScheduleRoutine
): HeldSequenceStep[] {
  return routine.effects.map((effect) => ({
    stepClass: "held" as const,
    type: "controlEffect" as const,
    effect: cloneControlEffect(effect)
  }));
}

export function getProjectScheduleRoutineSequenceSteps(
  routine: ProjectScheduleRoutine
): SequenceStep[] {
  return getProjectScheduleRoutineHeldSteps(routine);
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
