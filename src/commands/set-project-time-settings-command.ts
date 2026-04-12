import { createOpaqueId } from "../core/ids";
import {
  cloneProjectTimeSettings,
  type ProjectTimeSettings
} from "../document/project-time-settings";

import type { EditorCommand } from "./command";

interface SetProjectTimeSettingsCommandOptions {
  label: string;
  time: ProjectTimeSettings;
}

export function createSetProjectTimeSettingsCommand(
  options: SetProjectTimeSettingsCommandOptions
): EditorCommand {
  const nextTime = cloneProjectTimeSettings(options.time);
  let previousTime: ProjectTimeSettings | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label,
    execute(context) {
      const currentProjectDocument = context.getProjectDocument();

      if (previousTime === null) {
        previousTime = cloneProjectTimeSettings(currentProjectDocument.time);
      }

      context.setProjectDocument({
        ...currentProjectDocument,
        time: cloneProjectTimeSettings(nextTime)
      });
    },
    undo(context) {
      if (previousTime === null) {
        return;
      }

      const currentProjectDocument = context.getProjectDocument();
      context.setProjectDocument({
        ...currentProjectDocument,
        time: cloneProjectTimeSettings(previousTime)
      });
    }
  };
}