import { createOpaqueId } from "../core/ids";
import { cloneModelInstance, normalizeModelInstanceName } from "../assets/model-instances";

import type { EditorCommand } from "./command";

interface SetModelInstanceNameCommandOptions {
  modelInstanceId: string;
  name: string | null;
}

export function createSetModelInstanceNameCommand(options: SetModelInstanceNameCommandOptions): EditorCommand {
  const normalizedName = normalizeModelInstanceName(options.name);
  let previousName: string | undefined;

  return {
    id: createOpaqueId("command"),
    label: normalizedName === undefined ? "Clear model instance name" : `Rename model instance to ${normalizedName}`,
    execute(context) {
      const currentDocument = context.getDocument();
      const modelInstance = currentDocument.modelInstances[options.modelInstanceId];

      if (modelInstance === undefined) {
        throw new Error(`Model instance ${options.modelInstanceId} does not exist.`);
      }

      if (previousName === undefined) {
        previousName = modelInstance.name;
      }

      context.setDocument({
        ...currentDocument,
        modelInstances: {
          ...currentDocument.modelInstances,
          [modelInstance.id]: cloneModelInstance({
            ...modelInstance,
            name: normalizedName
          })
        }
      });
    },
    undo(context) {
      const currentDocument = context.getDocument();
      const modelInstance = currentDocument.modelInstances[options.modelInstanceId];

      if (modelInstance === undefined) {
        throw new Error(`Model instance ${options.modelInstanceId} does not exist.`);
      }

      context.setDocument({
        ...currentDocument,
        modelInstances: {
          ...currentDocument.modelInstances,
          [modelInstance.id]: cloneModelInstance({
            ...modelInstance,
            name: previousName
          })
        }
      });
    }
  };
}
