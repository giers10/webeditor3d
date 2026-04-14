import type { ProjectDialogue } from "../dialogues/project-dialogues";
import type {
  InteractableEntity,
  TriggerVolumeEntity
} from "../entities/entity-instances";
import {
  createProjectScheduleEffectFromOption,
  listProjectScheduleEffectOptions,
  type ProjectScheduleTargetOption
} from "../scheduler/project-schedule-control-options";

import { createProjectSequence, type ProjectSequence } from "./project-sequences";

type SequenceInteractionSource =
  | Pick<InteractableEntity, "id" | "kind" | "name">
  | Pick<TriggerVolumeEntity, "id" | "kind" | "name">;

function formatSequenceSourceLabel(source: SequenceInteractionSource): string {
  const normalizedName = source.name?.trim() ?? "";

  if (normalizedName.length > 0) {
    return normalizedName;
  }

  return source.kind === "interactable" ? "Interactable" : "Trigger Volume";
}

function resolvePreferredInteractionTargetOption(
  source: SequenceInteractionSource,
  targetOptions: ProjectScheduleTargetOption[]
): ProjectScheduleTargetOption | null {
  if (source.kind !== "interactable") {
    return null;
  }

  return (
    targetOptions.find(
      (targetOption) =>
        targetOption.target.kind === "interaction" &&
        targetOption.target.interactionKind === "interactable" &&
        targetOption.target.entityId === source.id
    ) ?? null
  );
}

function resolveFallbackImpulseTargetOption(
  source: SequenceInteractionSource,
  targetOptions: ProjectScheduleTargetOption[]
): ProjectScheduleTargetOption | null {
  const preferredTargetOption = resolvePreferredInteractionTargetOption(
    source,
    targetOptions
  );

  if (preferredTargetOption !== null) {
    return preferredTargetOption;
  }

  return (
    targetOptions.find(
      (targetOption) => listProjectScheduleEffectOptions(targetOption).length > 0
    ) ?? null
  );
}

export function createDefaultInteractionProjectSequence(options: {
  source: SequenceInteractionSource;
  dialogues: ProjectDialogue[];
  targetOptions: ProjectScheduleTargetOption[];
}): ProjectSequence {
  const sourceLabel = formatSequenceSourceLabel(options.source);
  const defaultDialogue = options.dialogues[0] ?? null;

  if (defaultDialogue !== null) {
    return createProjectSequence({
      title: `${sourceLabel} Dialogue`,
      steps: [
        {
          stepClass: "impulse",
          type: "startDialogue",
          dialogueId: defaultDialogue.id
        }
      ]
    });
  }

  const targetOption = resolveFallbackImpulseTargetOption(
    options.source,
    options.targetOptions
  );

  if (targetOption === null) {
    throw new Error(
      "Author a project dialogue or a sequencer-addressable control target before creating a sequence link."
    );
  }

  const effectOption = listProjectScheduleEffectOptions(targetOption)[0] ?? null;

  if (effectOption === null) {
    throw new Error(
      "The selected control target does not expose a sequence-editable effect yet."
    );
  }

  return createProjectSequence({
    title: `${sourceLabel} Sequence`,
    steps: [
      {
        stepClass: "impulse",
        type: "controlEffect",
        effect: createProjectScheduleEffectFromOption({
          targetOption,
          effectOptionId: effectOption.id
        })
      }
    ]
  });
}
