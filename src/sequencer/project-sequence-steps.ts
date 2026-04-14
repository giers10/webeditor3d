import {
  cloneControlEffect,
  type ControlEffect
} from "../controls/control-surface";
import {
  getInteractionActionControlEffect,
  type InteractionLink
} from "../interactions/interaction-links";
import type { ProjectScheduleRoutine } from "../scheduler/project-scheduler";

export interface ControlSequenceStep {
  type: "controlEffect";
  effect: ControlEffect;
}

export interface StartDialogueSequenceStep {
  type: "startDialogue";
  dialogueId: string;
}

export interface TeleportPlayerSequenceStep {
  type: "teleportPlayer";
  targetEntityId: string;
}

export interface ToggleVisibilitySequenceStep {
  type: "toggleVisibility";
  targetBrushId: string;
  visible?: boolean;
}

export type SequenceStep =
  | ControlSequenceStep
  | StartDialogueSequenceStep
  | TeleportPlayerSequenceStep
  | ToggleVisibilitySequenceStep;

export function cloneSequenceStep(step: SequenceStep): SequenceStep {
  switch (step.type) {
    case "controlEffect":
      return {
        type: "controlEffect",
        effect: cloneControlEffect(step.effect)
      };
    case "startDialogue":
      return {
        type: "startDialogue",
        dialogueId: step.dialogueId
      };
    case "teleportPlayer":
      return {
        type: "teleportPlayer",
        targetEntityId: step.targetEntityId
      };
    case "toggleVisibility":
      return {
        type: "toggleVisibility",
        targetBrushId: step.targetBrushId,
        visible: step.visible
      };
  }
}

export function cloneSequenceSteps(steps: SequenceStep[]): SequenceStep[] {
  return steps.map(cloneSequenceStep);
}

export function getInteractionLinkSequenceSteps(
  link: InteractionLink
): SequenceStep[] {
  const controlEffect = getInteractionActionControlEffect(link.action);

  if (controlEffect !== null) {
    return [
      {
        type: "controlEffect",
        effect: controlEffect
      }
    ];
  }

  switch (link.action.type) {
    case "teleportPlayer":
      return [
        {
          type: "teleportPlayer",
          targetEntityId: link.action.targetEntityId
        }
      ];
    case "toggleVisibility":
      return [
        {
          type: "toggleVisibility",
          targetBrushId: link.action.targetBrushId,
          visible: link.action.visible
        }
      ];
    case "startDialogue":
      return [
        {
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

export function getProjectScheduleRoutineSequenceSteps(
  routine: ProjectScheduleRoutine
): SequenceStep[] {
  return routine.effects.map((effect) => ({
    type: "controlEffect" as const,
    effect: cloneControlEffect(effect)
  }));
}
