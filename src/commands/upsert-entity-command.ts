import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import { createOpaqueId } from "../core/ids";
import { cloneEntityInstance, getEntityKindLabel, type EntityInstance } from "../entities/entity-instances";

import type { EditorCommand } from "./command";

interface UpsertEntityCommandOptions {
  entity: EntityInstance;
  label?: string;
}

function setSingleEntitySelection(entityId: string): EditorSelection {
  return {
    kind: "entities",
    ids: [entityId]
  };
}

function createDefaultEntityCommandLabel(entity: EntityInstance, isNewEntity: boolean): string {
  const action = isNewEntity ? "Place" : "Update";
  return `${action} ${getEntityKindLabel(entity.kind).toLowerCase()}`;
}

export function createUpsertEntityCommand(options: UpsertEntityCommandOptions): EditorCommand {
  const nextEntity = cloneEntityInstance(options.entity);
  let previousEntity = null as EntityInstance | null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? createDefaultEntityCommandLabel(nextEntity, true),
    execute(context) {
      const currentDocument = context.getDocument();
      const currentEntity = currentDocument.entities[nextEntity.id];
      const isNewEntity = currentEntity === undefined;

      if (currentEntity !== undefined && currentEntity.kind !== nextEntity.kind) {
        throw new Error(`Entity ${nextEntity.id} is a ${currentEntity.kind}, not a ${nextEntity.kind}.`);
      }

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      if (previousEntity === null && currentEntity !== undefined) {
        previousEntity = cloneEntityInstance(currentEntity);
      }

      context.setDocument({
        ...currentDocument,
        entities: {
          ...currentDocument.entities,
          [nextEntity.id]: cloneEntityInstance(nextEntity)
        }
      });
      context.setSelection(setSingleEntitySelection(nextEntity.id));
      context.setToolMode("select");

      if (options.label === undefined) {
        this.label = createDefaultEntityCommandLabel(nextEntity, isNewEntity);
      }
    },
    undo(context) {
      const currentDocument = context.getDocument();
      const nextEntities = {
        ...currentDocument.entities
      };

      if (previousEntity === null) {
        delete nextEntities[nextEntity.id];
      } else {
        nextEntities[nextEntity.id] = cloneEntityInstance(previousEntity);
      }

      context.setDocument({
        ...currentDocument,
        entities: nextEntities
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
