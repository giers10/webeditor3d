import { createOpaqueId } from "../core/ids";
import {
  cloneProjectScheduler,
  type ProjectScheduler
} from "../scheduler/project-scheduler";
import {
  cloneProjectSequenceLibrary,
  type ProjectSequenceLibrary
} from "../sequencer/project-sequences";

import type { EditorCommand } from "./command";

interface SetProjectSequencerCommandOptions {
  label: string;
  scheduler: ProjectScheduler;
  sequences: ProjectSequenceLibrary;
}

export function createSetProjectSequencerCommand(
  options: SetProjectSequencerCommandOptions
): EditorCommand {
  const nextScheduler = cloneProjectScheduler(options.scheduler);
  const nextSequences = cloneProjectSequenceLibrary(options.sequences);
  let previousScheduler: ProjectScheduler | null = null;
  let previousSequences: ProjectSequenceLibrary | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label,
    execute(context) {
      const currentProjectDocument = context.getProjectDocument();

      if (previousScheduler === null) {
        previousScheduler = cloneProjectScheduler(
          currentProjectDocument.scheduler
        );
      }

      if (previousSequences === null) {
        previousSequences = cloneProjectSequenceLibrary(
          currentProjectDocument.sequences
        );
      }

      context.setProjectDocument({
        ...currentProjectDocument,
        scheduler: cloneProjectScheduler(nextScheduler),
        sequences: cloneProjectSequenceLibrary(nextSequences)
      });
    },
    undo(context) {
      if (previousScheduler === null || previousSequences === null) {
        return;
      }

      const currentProjectDocument = context.getProjectDocument();
      context.setProjectDocument({
        ...currentProjectDocument,
        scheduler: cloneProjectScheduler(previousScheduler),
        sequences: cloneProjectSequenceLibrary(previousSequences)
      });
    }
  };
}
