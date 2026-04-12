import { createOpaqueId } from "../core/ids";
import { cloneModelInstance } from "../assets/model-instances";

import type { EditorCommand } from "./command";

interface SetModelInstanceAuthoredStateCommandOptions {
  modelInstanceId: string;
  visible?: boolean;
  enabled?: boolean;
}

function createCommandLabel(
  options: SetModelInstanceAuthoredStateCommandOptions
): string {
  if (options.enabled !== undefined && options.visible === undefined) {
    return options.enabled ? "Enable model instance" : "Disable model instance";
  }

  if (options.visible !== undefined && options.enabled === undefined) {
    return options.visible ? "Show model instance" : "Hide model instance";
  }

  return "Update model instance state";
}

export function createSetModelInstanceAuthoredStateCommand(
  options: SetModelInstanceAuthoredStateCommandOptions
): EditorCommand {
  if (options.visible === undefined && options.enabled === undefined) {
    throw new Error("Model instance authored state command requires at least one change.");
  }

  let previousVisible: boolean | null = null;
  let previousEnabled: boolean | null = null;

  return {
    id: createOpaqueId("command"),
    label: createCommandLabel(options),
    execute(context) {
      const currentDocument = context.getDocument();
      const modelInstance = currentDocument.modelInstances[options.modelInstanceId];

      if (modelInstance === undefined) {
        throw new Error(`Model instance ${options.modelInstanceId} does not exist.`);
      }

      if (previousVisible === null) {
        previousVisible = modelInstance.visible;
      }

      if (previousEnabled === null) {
        previousEnabled = modelInstance.enabled;
      }

      context.setDocument({
        ...currentDocument,
        modelInstances: {
          ...currentDocument.modelInstances,
          [modelInstance.id]: cloneModelInstance({
            ...modelInstance,
            visible: options.visible ?? modelInstance.visible,
            enabled: options.enabled ?? modelInstance.enabled
          })
        }
      });
    },
    undo(context) {
      if (previousVisible === null || previousEnabled === null) {
        return;
      }

      const currentDocument = context.getDocument();
      const modelInstance = currentDocument.modelInstances[options.modelInstanceId];

      if (modelInstance === undefined) {
        return;
      }

      context.setDocument({
        ...currentDocument,
        modelInstances: {
          ...currentDocument.modelInstances,
          [modelInstance.id]: cloneModelInstance({
            ...modelInstance,
            visible: previousVisible,
            enabled: previousEnabled
          })
        }
      });
    }
  };
}