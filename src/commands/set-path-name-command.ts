import { createOpaqueId } from "../core/ids";
import {
  cloneScenePath,
  normalizeScenePathName
} from "../document/paths";

import type { EditorCommand } from "./command";

interface SetPathNameCommandOptions {
  pathId: string;
  name: string | null;
}

export function createSetPathNameCommand(
  options: SetPathNameCommandOptions
): EditorCommand {
  const normalizedName = normalizeScenePathName(options.name);
  let previousName: string | undefined;

  return {
    id: createOpaqueId("command"),
    label:
      normalizedName === undefined
        ? "Clear path name"
        : `Rename path to ${normalizedName}`,
    execute(context) {
      const currentDocument = context.getDocument();
      const path = currentDocument.paths[options.pathId];

      if (path === undefined) {
        throw new Error(`Path ${options.pathId} does not exist.`);
      }

      if (previousName === undefined) {
        previousName = path.name;
      }

      context.setDocument({
        ...currentDocument,
        paths: {
          ...currentDocument.paths,
          [path.id]: cloneScenePath({
            ...path,
            name: normalizedName
          })
        }
      });
    },
    undo(context) {
      const currentDocument = context.getDocument();
      const path = currentDocument.paths[options.pathId];

      if (path === undefined) {
        throw new Error(`Path ${options.pathId} does not exist.`);
      }

      context.setDocument({
        ...currentDocument,
        paths: {
          ...currentDocument.paths,
          [path.id]: cloneScenePath({
            ...path,
            name: previousName
          })
        }
      });
    }
  };
}
