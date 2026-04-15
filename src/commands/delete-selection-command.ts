import { cloneModelInstance, type ModelInstance } from "../assets/model-instances";
import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import { cloneBrush, type Brush } from "../document/brushes";
import { cloneEntityInstance, type EntityInstance } from "../entities/entity-instances";

import type { EditorCommand } from "./command";

export function createDeleteSelectionCommand(
  selection: Extract<
    EditorSelection,
    | { kind: "brushes"; ids: string[] }
    | { kind: "entities"; ids: string[] }
    | { kind: "modelInstances"; ids: string[] }
  >,
  label = "Delete selection"
): EditorCommand {
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;
  let deletedBrushes: Brush[] | null = null;
  let deletedEntities: EntityInstance[] | null = null;
  let deletedModelInstances: ModelInstance[] | null = null;

  return {
    id: createOpaqueId("command"),
    label,
    execute(context) {
      const currentDocument = context.getDocument();

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      if (selection.kind === "brushes") {
        if (deletedBrushes === null) {
          deletedBrushes = selection.ids.map((brushId) => {
            const brush = currentDocument.brushes[brushId];

            if (brush === undefined) {
              throw new Error(`Whitebox solid ${brushId} does not exist.`);
            }

            return cloneBrush(brush);
          });
        }

        const nextBrushes = {
          ...currentDocument.brushes
        };

        for (const brushId of selection.ids) {
          delete nextBrushes[brushId];
        }

        context.setDocument({
          ...currentDocument,
          brushes: nextBrushes
        });
      } else if (selection.kind === "entities") {
        if (deletedEntities === null) {
          deletedEntities = selection.ids.map((entityId) => {
            const entity = currentDocument.entities[entityId];

            if (entity === undefined) {
              throw new Error(`Entity ${entityId} does not exist.`);
            }

            return cloneEntityInstance(entity);
          });
        }

        const nextEntities = {
          ...currentDocument.entities
        };

        for (const entityId of selection.ids) {
          delete nextEntities[entityId];
        }

        context.setDocument({
          ...currentDocument,
          entities: nextEntities
        });
      } else {
        if (deletedModelInstances === null) {
          deletedModelInstances = selection.ids.map((modelInstanceId) => {
            const modelInstance = currentDocument.modelInstances[modelInstanceId];

            if (modelInstance === undefined) {
              throw new Error(
                `Model instance ${modelInstanceId} does not exist.`
              );
            }

            return cloneModelInstance(modelInstance);
          });
        }

        const nextModelInstances = {
          ...currentDocument.modelInstances
        };

        for (const modelInstanceId of selection.ids) {
          delete nextModelInstances[modelInstanceId];
        }

        context.setDocument({
          ...currentDocument,
          modelInstances: nextModelInstances
        });
      }

      context.setSelection({
        kind: "none"
      });
      context.setToolMode("select");
    },
    undo(context) {
      const currentDocument = context.getDocument();

      if (deletedBrushes !== null) {
        context.setDocument({
          ...currentDocument,
          brushes: {
            ...currentDocument.brushes,
            ...Object.fromEntries(
              deletedBrushes.map((brush) => [brush.id, cloneBrush(brush)])
            )
          }
        });
      } else if (deletedEntities !== null) {
        context.setDocument({
          ...currentDocument,
          entities: {
            ...currentDocument.entities,
            ...Object.fromEntries(
              deletedEntities.map((entity) => [
                entity.id,
                cloneEntityInstance(entity)
              ])
            )
          }
        });
      } else if (deletedModelInstances !== null) {
        context.setDocument({
          ...currentDocument,
          modelInstances: {
            ...currentDocument.modelInstances,
            ...Object.fromEntries(
              deletedModelInstances.map((modelInstance) => [
                modelInstance.id,
                cloneModelInstance(modelInstance)
              ])
            )
          }
        });
      }

      if (previousSelection !== null) {
        context.setSelection(previousSelection);
      }

      if (previousToolMode !== null) {
        context.setToolMode(previousToolMode);
      }
    }
  };
}
