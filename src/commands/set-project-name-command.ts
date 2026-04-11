import { createOpaqueId } from "../core/ids";
import { DEFAULT_PROJECT_NAME } from "../document/scene-document";

import type { EditorCommand } from "./command";

export function createSetProjectNameCommand(nextName: string): EditorCommand {
  const normalizedName = nextName.trim() || DEFAULT_PROJECT_NAME;
  let previousName: string | null = null;

  return {
    id: createOpaqueId("command"),
    label: `Rename project to ${normalizedName}`,
    execute(context) {
      const currentProjectDocument = context.getProjectDocument();

      if (previousName === null) {
        previousName = currentProjectDocument.name;
      }

      context.setProjectDocument({
        ...currentProjectDocument,
        name: normalizedName
      });
    },
    undo(context) {
      if (previousName === null) {
        return;
      }

      const currentProjectDocument = context.getProjectDocument();
      context.setProjectDocument({
        ...currentProjectDocument,
        name: previousName
      });
    }
  };
}
