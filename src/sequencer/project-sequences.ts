import { createOpaqueId } from "../core/ids";

import {
  cloneSequenceStep,
  type SequenceStep
} from "./project-sequence-steps";

export interface ProjectSequence {
  id: string;
  title: string;
  steps: SequenceStep[];
}

export interface ProjectSequenceLibrary {
  sequences: Record<string, ProjectSequence>;
}

function normalizeProjectSequenceTitle(title: string | undefined): string {
  const normalizedTitle = title?.trim() ?? "";

  if (normalizedTitle.length === 0) {
    throw new Error("Project sequence title must be non-empty.");
  }

  return normalizedTitle;
}

export function createEmptyProjectSequenceLibrary(): ProjectSequenceLibrary {
  return {
    sequences: {}
  };
}

export function createProjectSequence(
  overrides: Partial<Pick<ProjectSequence, "id" | "title">> & {
    steps?: SequenceStep[];
  } = {}
): ProjectSequence {
  return {
    id: overrides.id ?? createOpaqueId("sequence"),
    title: normalizeProjectSequenceTitle(overrides.title ?? "Sequence"),
    steps: overrides.steps?.map(cloneSequenceStep) ?? []
  };
}

export function cloneProjectSequence(
  sequence: ProjectSequence
): ProjectSequence {
  return {
    id: sequence.id,
    title: sequence.title,
    steps: sequence.steps.map(cloneSequenceStep)
  };
}

export function cloneProjectSequenceLibrary(
  library: ProjectSequenceLibrary
): ProjectSequenceLibrary {
  return {
    sequences: Object.fromEntries(
      Object.entries(library.sequences).map(([sequenceId, sequence]) => [
        sequenceId,
        cloneProjectSequence(sequence)
      ])
    )
  };
}

export function areProjectSequencesEqual(
  left: ProjectSequence,
  right: ProjectSequence
): boolean {
  if (
    left.id !== right.id ||
    left.title !== right.title ||
    left.steps.length !== right.steps.length
  ) {
    return false;
  }

  return left.steps.every((step, index) => {
    const rightStep = right.steps[index];

    if (rightStep === undefined) {
      return false;
    }

    return JSON.stringify(step) === JSON.stringify(rightStep);
  });
}

export function areProjectSequenceLibrariesEqual(
  left: ProjectSequenceLibrary,
  right: ProjectSequenceLibrary
): boolean {
  const leftIds = Object.keys(left.sequences);
  const rightIds = Object.keys(right.sequences);

  if (leftIds.length !== rightIds.length) {
    return false;
  }

  return leftIds.every((sequenceId) => {
    const rightSequence = right.sequences[sequenceId];

    return (
      rightSequence !== undefined &&
      areProjectSequencesEqual(left.sequences[sequenceId]!, rightSequence)
    );
  });
}

export function getProjectSequences(
  library: ProjectSequenceLibrary
): ProjectSequence[] {
  return Object.values(library.sequences).sort((left, right) => {
    const titleCompare = left.title.localeCompare(right.title);

    if (titleCompare !== 0) {
      return titleCompare;
    }

    return left.id.localeCompare(right.id);
  });
}
