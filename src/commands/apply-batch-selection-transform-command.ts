import { cloneModelInstance, type ModelInstance } from "../assets/model-instances";
import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import { cloneBrush, type Brush } from "../document/brushes";
import { cloneEntityInstance, type EntityInstance } from "../entities/entity-instances";

import type { EditorCommand } from "./command";

type BrushBatchSelection = Extract<EditorSelection, { kind: "brushes"; ids: string[] }>;
type EntityBatchSelection = Extract<EditorSelection, { kind: "entities"; ids: string[] }>;
type ModelInstanceBatchSelection = Extract<
  EditorSelection,
  { kind: "modelInstances"; ids: string[] }
>;

type BatchTransformCommandOptions =
  | {
      selection: BrushBatchSelection;
      brushes: Brush[];
      label?: string;
    }
  | {
      selection: EntityBatchSelection;
      entities: EntityInstance[];
      label?: string;
    }
  | {
      selection: ModelInstanceBatchSelection;
      modelInstances: ModelInstance[];
      label?: string;
    };

export function createApplyBatchSelectionTransformCommand(
  options: BatchTransformCommandOptions
): EditorCommand {
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;
  let previousBrushes: Record<string, Brush> | null = null;
  let previousEntities: Record<string, EntityInstance> | null = null;
  let previousModelInstances: Record<string, ModelInstance> | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Apply batch transform",
    execute(context) {
      const currentDocument = context.getDocument();

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      if ("brushes" in options) {
        if (previousBrushes === null) {
          previousBrushes = Object.fromEntries(
            options.brushes.map((brush) => {
              const currentBrush = currentDocument.brushes[brush.id];

              if (currentBrush === undefined) {
                throw new Error(`Whitebox solid ${brush.id} does not exist.`);
              }

              return [brush.id, cloneBrush(currentBrush)];
            })
          );
        }

        context.setDocument({
          ...currentDocument,
          brushes: {
            ...currentDocument.brushes,
            ...Object.fromEntries(
              options.brushes.map((brush) => [brush.id, cloneBrush(brush)])
            )
          }
        });
      } else if ("entities" in options) {
        if (previousEntities === null) {
          previousEntities = Object.fromEntries(
            options.entities.map((entity) => {
              const currentEntity = currentDocument.entities[entity.id];

              if (currentEntity === undefined) {
                throw new Error(`Entity ${entity.id} does not exist.`);
              }

              return [entity.id, cloneEntityInstance(currentEntity)];
            })
          );
        }

        context.setDocument({
          ...currentDocument,
          entities: {
            ...currentDocument.entities,
            ...Object.fromEntries(
              options.entities.map((entity) => [
                entity.id,
                cloneEntityInstance(entity)
              ])
            )
          }
        });
      } else {
        if (previousModelInstances === null) {
          previousModelInstances = Object.fromEntries(
            options.modelInstances.map((modelInstance) => {
              const currentModelInstance =
                currentDocument.modelInstances[modelInstance.id];

              if (currentModelInstance === undefined) {
                throw new Error(
                  `Model instance ${modelInstance.id} does not exist.`
                );
              }

              return [modelInstance.id, cloneModelInstance(currentModelInstance)];
            })
          );
        }

        context.setDocument({
          ...currentDocument,
          modelInstances: {
            ...currentDocument.modelInstances,
            ...Object.fromEntries(
              options.modelInstances.map((modelInstance) => [
                modelInstance.id,
                cloneModelInstance(modelInstance)
              ])
            )
          }
        });
      }

      context.setSelection(cloneEditorSelection(options.selection));
      context.setToolMode("select");
    },
    undo(context) {
      const currentDocument = context.getDocument();

      if (previousBrushes !== null) {
        context.setDocument({
          ...currentDocument,
          brushes: {
            ...currentDocument.brushes,
            ...Object.fromEntries(
              Object.values(previousBrushes).map((brush) => [
                brush.id,
                cloneBrush(brush)
              ])
            )
          }
        });
      } else if (previousEntities !== null) {
        context.setDocument({
          ...currentDocument,
          entities: {
            ...currentDocument.entities,
            ...Object.fromEntries(
              Object.values(previousEntities).map((entity) => [
                entity.id,
                cloneEntityInstance(entity)
              ])
            )
          }
        });
      } else if (previousModelInstances !== null) {
        context.setDocument({
          ...currentDocument,
          modelInstances: {
            ...currentDocument.modelInstances,
            ...Object.fromEntries(
              Object.values(previousModelInstances).map((modelInstance) => [
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
