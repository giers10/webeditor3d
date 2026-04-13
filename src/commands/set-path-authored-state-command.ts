import { createOpaqueId } from "../core/ids";
import { cloneScenePath } from "../document/paths";

import type { EditorCommand } from "./command";

interface SetPathAuthoredStateCommandOptions {
  pathId: string;
  visible?: boolean;
  enabled?: boolean;
}

function createCommandLabel(options: SetPathAuthoredStateCommandOptions): string {
  if (options.enabled !== undefined && options.visible === undefined) {
    return options.enabled ? "Enable path" : "Disable path";
  }

  if (options.visible !== undefined && options.enabled === undefined) {
    return options.visible ? "Show path" : "Hide path";
  }

  return "Update path state";
}

export function createSetPathAuthoredStateCommand(
  options: SetPathAuthoredStateCommandOptions
): EditorCommand {
  if (options.visible === undefined && options.enabled === undefined) {
    throw new Error("Path authored state command requires at least one change.");
  }

  let previousVisible: boolean | null = null;
  let previousEnabled: boolean | null = null;

  return {
    id: createOpaqueId("command"),
    label: createCommandLabel(options),
    execute(context) {
      const currentDocument = context.getDocument();
      const path = currentDocument.paths[options.pathId];

      if (path === undefined) {
        throw new Error(`Path ${options.pathId} does not exist.`);
      }

      if (previousVisible === null) {
        previousVisible = path.visible;
      }

      if (previousEnabled === null) {
        previousEnabled = path.enabled;
      }

      context.setDocument({
        ...currentDocument,
        paths: {
          ...currentDocument.paths,
          [path.id]: cloneScenePath({
            ...path,
            visible: options.visible ?? path.visible,
            enabled: options.enabled ?? path.enabled
          })
        }
      });
    },
    undo(context) {
      if (previousVisible === null || previousEnabled === null) {
        return;
      }

      const currentDocument = context.getDocument();
      const path = currentDocument.paths[options.pathId];

      if (path === undefined) {
        return;
      }

      context.setDocument({
        ...currentDocument,
        paths: {
          ...currentDocument.paths,
          [path.id]: cloneScenePath({
            ...path,
            visible: previousVisible,
            enabled: previousEnabled
          })
        }
      });
    }
  };
}
