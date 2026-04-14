import { createOpaqueId } from "../core/ids";
import {
  cloneProjectSequenceLibrary,
  type ProjectSequenceLibrary
} from "../sequencer/project-sequences";

import type { EditorCommand } from "./command";

interface SetProjectSequencesCommandOptions {
  label: string;
  sequences: ProjectSequenceLibrary;
}

export function createSetProjectSequencesCommand(
  options: SetProjectSequencesCommandOptions
): EditorCommand {
  const nextSequences = cloneProjectSequenceLibrary(options.sequences);
  let previousSequences: ProjectSequenceLibrary | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label,
    execute(context) {
      const currentProjectDocument = context.getProjectDocument();

      if (previousSequences === null) {
        previousSequences = cloneProjectSequenceLibrary(
          currentProjectDocument.sequences
        );
      }

      context.setProjectDocument({
        ...currentProjectDocument,
        sequences: cloneProjectSequenceLibrary(nextSequences)
      });
    },
    undo(context) {
      if (previousSequences === null) {
        return;
      }

      const currentProjectDocument = context.getProjectDocument();
      context.setProjectDocument({
        ...currentProjectDocument,
        sequences: cloneProjectSequenceLibrary(previousSequences)
      });
    }
  };
}
