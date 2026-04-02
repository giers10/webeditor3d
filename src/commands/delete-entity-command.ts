import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import { cloneEntityInstance, type EntityInstance } from "../entities/entity-instances";

import type { EditorCommand } from "./command";

function selectionIncludesEntity(selection: EditorSelection, entityId: string): boolean {
  return selection.kind === "entities" && selection.ids.includes(entityId);
}

export function createDeleteEntityCommand(entityId: string): EditorCommand {
  let previousEntity: EntityInstance | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: "Delete entity",
    execute(context) {
      const currentDocument = context.getDocument();
      const currentEntity = currentDocument.entities[entityId];

      if (currentEntity === undefined) {
        throw new Error(`Entity ${entityId} does not exist.`);
      }

      if (previousEntity === null) {
        previousEntity = cloneEntityInstance(currentEntity);
      }

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      const nextEntities = {
        ...currentDocument.entities
      };
      delete nextEntities[entityId];

      context.setDocument({
        ...currentDocument,
        entities: nextEntities
      });

      if (selectionIncludesEntity(context.getSelection(), entityId)) {
        context.setSelection({
          kind: "none"
        });
      }

      context.setToolMode("select");
    },
    undo(context) {
      if (previousEntity === null) {
        return;
      }

      const currentDocument = context.getDocument();

      context.setDocument({
        ...currentDocument,
        entities: {
          ...currentDocument.entities,
          [previousEntity.id]: cloneEntityInstance(previousEntity)
        }
      });

      if (previousSelection !== null) {
        context.setSelection(previousSelection);
      }

      if (previousToolMode !== null) {
        context.setToolMode(previousToolMode);
      }
    }
  };
}
