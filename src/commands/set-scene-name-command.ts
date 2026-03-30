import { createOpaqueId } from "../core/ids";

import type { EditorCommand } from "./command";

export function createSetSceneNameCommand(nextName: string): EditorCommand {
  const normalizedName = nextName.trim() || "Untitled Scene";
  let previousName: string | null = null;

  return {
    id: createOpaqueId("command"),
    label: `Rename scene to ${normalizedName}`,
    execute(context) {
      const currentDocument = context.getDocument();

      if (previousName === null) {
        previousName = currentDocument.name;
      }

      context.setDocument({
        ...currentDocument,
        name: normalizedName
      });
    },
    undo(context) {
      if (previousName === null) {
        return;
      }

      const currentDocument = context.getDocument();
      context.setDocument({
        ...currentDocument,
        name: previousName
      });
    }
  };
}
