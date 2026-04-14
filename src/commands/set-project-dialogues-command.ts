import { createOpaqueId } from "../core/ids";
import {
  cloneProjectDialogueLibrary,
  type ProjectDialogueLibrary
} from "../dialogues/project-dialogues";

import type { EditorCommand } from "./command";

interface SetProjectDialoguesCommandOptions {
  label: string;
  dialogues: ProjectDialogueLibrary;
}

export function createSetProjectDialoguesCommand(
  options: SetProjectDialoguesCommandOptions
): EditorCommand {
  const nextDialogues = cloneProjectDialogueLibrary(options.dialogues);
  let previousDialogues: ProjectDialogueLibrary | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label,
    execute(context) {
      const currentProjectDocument = context.getProjectDocument();

      if (previousDialogues === null) {
        previousDialogues = cloneProjectDialogueLibrary(
          currentProjectDocument.dialogues
        );
      }

      context.setProjectDocument({
        ...currentProjectDocument,
        dialogues: cloneProjectDialogueLibrary(nextDialogues)
      });
    },
    undo(context) {
      if (previousDialogues === null) {
        return;
      }

      const currentProjectDocument = context.getProjectDocument();
      context.setProjectDocument({
        ...currentProjectDocument,
        dialogues: cloneProjectDialogueLibrary(previousDialogues)
      });
    }
  };
}
