import { createOpaqueId } from "../core/ids";
import { cloneEntityInstance } from "../entities/entity-instances";

import type { EditorCommand } from "./command";

interface SetEntityAuthoredStateCommandOptions {
  entityId: string;
  visible?: boolean;
  enabled?: boolean;
}

function createCommandLabel(options: SetEntityAuthoredStateCommandOptions): string {
  if (options.enabled !== undefined && options.visible === undefined) {
    return options.enabled ? "Enable entity" : "Disable entity";
  }

  if (options.visible !== undefined && options.enabled === undefined) {
    return options.visible ? "Show entity" : "Hide entity";
  }

  return "Update entity state";
}

export function createSetEntityAuthoredStateCommand(
  options: SetEntityAuthoredStateCommandOptions
): EditorCommand {
  if (options.visible === undefined && options.enabled === undefined) {
    throw new Error("Entity authored state command requires at least one change.");
  }

  let previousVisible: boolean | null = null;
  let previousEnabled: boolean | null = null;

  return {
    id: createOpaqueId("command"),
    label: createCommandLabel(options),
    execute(context) {
      const currentDocument = context.getDocument();
      const entity = currentDocument.entities[options.entityId];

      if (entity === undefined) {
        throw new Error(`Entity ${options.entityId} does not exist.`);
      }

      if (previousVisible === null) {
        previousVisible = entity.visible;
      }

      if (previousEnabled === null) {
        previousEnabled = entity.enabled;
      }

      context.setDocument({
        ...currentDocument,
        entities: {
          ...currentDocument.entities,
          [entity.id]: cloneEntityInstance({
            ...entity,
            visible: options.visible ?? entity.visible,
            enabled: options.enabled ?? entity.enabled
          })
        }
      });
    },
    undo(context) {
      if (previousVisible === null || previousEnabled === null) {
        return;
      }

      const currentDocument = context.getDocument();
      const entity = currentDocument.entities[options.entityId];

      if (entity === undefined) {
        return;
      }

      context.setDocument({
        ...currentDocument,
        entities: {
          ...currentDocument.entities,
          [entity.id]: cloneEntityInstance({
            ...entity,
            visible: previousVisible,
            enabled: previousEnabled
          })
        }
      });
    }
  };
}