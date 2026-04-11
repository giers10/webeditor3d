import { createOpaqueId } from "../core/ids";

import type { EditorCommand } from "./command";

export function createSetActiveSceneCommand(nextSceneId: string): EditorCommand {
  let previousSceneId: string | null = null;

  return {
    id: createOpaqueId("command"),
    label: "Switch active scene",
    execute(context) {
      const currentProjectDocument = context.getProjectDocument();

      if (currentProjectDocument.scenes[nextSceneId] === undefined) {
        throw new Error(`Cannot activate missing scene ${nextSceneId}.`);
      }

      if (previousSceneId === null) {
        previousSceneId = currentProjectDocument.activeSceneId;
      }

      context.setProjectDocument({
        ...currentProjectDocument,
        activeSceneId: nextSceneId
      });
      context.setSelection({ kind: "none" });
      context.setToolMode("select");
    },
    undo(context) {
      if (previousSceneId === null) {
        return;
      }

      const currentProjectDocument = context.getProjectDocument();

      if (currentProjectDocument.scenes[previousSceneId] === undefined) {
        throw new Error(`Cannot restore missing scene ${previousSceneId}.`);
      }

      context.setProjectDocument({
        ...currentProjectDocument,
        activeSceneId: previousSceneId
      });
      context.setSelection({ kind: "none" });
      context.setToolMode("select");
    }
  };
}
