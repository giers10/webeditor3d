import { cloneModelInstance, type ModelInstance } from "../assets/model-instances";
import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import type { Vec3 } from "../core/vector";
import { cloneBoxBrush, type BoxBrush } from "../document/brushes";
import { cloneEntityInstance, type EntityInstance } from "../entities/entity-instances";

import type { EditorCommand } from "./command";

export const DUPLICATE_SELECTION_OFFSET: Vec3 = {
  x: 1,
  y: 0,
  z: 1
};

interface DuplicateSelectionResult {
  selection: EditorSelection;
  brushes: BoxBrush[] | null;
  entities: EntityInstance[] | null;
  modelInstances: ModelInstance[] | null;
}

function applyDuplicateSelectionOffset(position: Vec3): Vec3 {
  return {
    x: position.x + DUPLICATE_SELECTION_OFFSET.x,
    y: position.y + DUPLICATE_SELECTION_OFFSET.y,
    z: position.z + DUPLICATE_SELECTION_OFFSET.z
  };
}

function duplicateBrush(brush: BoxBrush): BoxBrush {
  const duplicatedBrush = cloneBoxBrush(brush);
  duplicatedBrush.id = createOpaqueId("brush");
  duplicatedBrush.center = applyDuplicateSelectionOffset(duplicatedBrush.center);
  return duplicatedBrush;
}

function duplicateEntity(entity: EntityInstance): EntityInstance {
  const duplicatedEntity = cloneEntityInstance(entity);
  duplicatedEntity.id = createOpaqueId(`entity-${duplicatedEntity.kind}`);
  duplicatedEntity.position = applyDuplicateSelectionOffset(duplicatedEntity.position);
  return duplicatedEntity;
}

function duplicateModelInstance(modelInstance: ModelInstance): ModelInstance {
  const duplicatedModelInstance = cloneModelInstance(modelInstance);
  duplicatedModelInstance.id = createOpaqueId("model-instance");
  duplicatedModelInstance.position = applyDuplicateSelectionOffset(duplicatedModelInstance.position);
  return duplicatedModelInstance;
}

function resolveDuplicatableBrushIds(selection: EditorSelection): string[] | null {
  switch (selection.kind) {
    case "brushes":
      return selection.ids;
    case "brushFace":
    case "brushEdge":
    case "brushVertex":
      return [selection.brushId];
    default:
      return null;
  }
}

function createDuplicateSelectionResult(currentDocument: ReturnType<Parameters<EditorCommand["execute"]>[0]["getDocument"]>, selection: EditorSelection): DuplicateSelectionResult {
  const duplicatableBrushIds = resolveDuplicatableBrushIds(selection);

  if (duplicatableBrushIds !== null) {
    if (duplicatableBrushIds.length === 0) {
      throw new Error("Select at least one whitebox solid to duplicate.");
    }

    const duplicatedBrushes = duplicatableBrushIds.map((brushId) => {
      const sourceBrush = currentDocument.brushes[brushId];

      if (sourceBrush === undefined) {
        throw new Error(`Box brush ${brushId} does not exist.`);
      }

      if (sourceBrush.kind !== "box") {
        throw new Error(`Brush ${brushId} is not a supported box brush.`);
      }

      return duplicateBrush(sourceBrush);
    });

    return {
      selection: {
        kind: "brushes",
        ids: duplicatedBrushes.map((brush) => brush.id)
      },
      brushes: duplicatedBrushes,
      entities: null,
      modelInstances: null
    };
  }

  if (selection.kind === "entities") {
    if (selection.ids.length === 0) {
      throw new Error("Select at least one entity to duplicate.");
    }

    const duplicatedEntities = selection.ids.map((entityId) => {
      const sourceEntity = currentDocument.entities[entityId];

      if (sourceEntity === undefined) {
        throw new Error(`Entity ${entityId} does not exist.`);
      }

      return duplicateEntity(sourceEntity);
    });

    return {
      selection: {
        kind: "entities",
        ids: duplicatedEntities.map((entity) => entity.id)
      },
      brushes: null,
      entities: duplicatedEntities,
      modelInstances: null
    };
  }

  if (selection.kind === "modelInstances") {
    if (selection.ids.length === 0) {
      throw new Error("Select at least one model instance to duplicate.");
    }

    const duplicatedModelInstances = selection.ids.map((modelInstanceId) => {
      const sourceModelInstance = currentDocument.modelInstances[modelInstanceId];

      if (sourceModelInstance === undefined) {
        throw new Error(`Model instance ${modelInstanceId} does not exist.`);
      }

      return duplicateModelInstance(sourceModelInstance);
    });

    return {
      selection: {
        kind: "modelInstances",
        ids: duplicatedModelInstances.map((modelInstance) => modelInstance.id)
      },
      brushes: null,
      entities: null,
      modelInstances: duplicatedModelInstances
    };
  }

  throw new Error("Selection must contain whitebox solids, entities, or model instances to duplicate.");
}

export function createDuplicateSelectionCommand(): EditorCommand {
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;
  let duplicateSelectionResult: DuplicateSelectionResult | null = null;

  return {
    id: createOpaqueId("command"),
    label: "Duplicate selection",
    execute(context) {
      const currentDocument = context.getDocument();

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      if (duplicateSelectionResult === null) {
        duplicateSelectionResult = createDuplicateSelectionResult(currentDocument, context.getSelection());
      }

      if (duplicateSelectionResult.brushes !== null) {
        context.setDocument({
          ...currentDocument,
          brushes: {
            ...currentDocument.brushes,
            ...Object.fromEntries(duplicateSelectionResult.brushes.map((brush) => [brush.id, cloneBoxBrush(brush)]))
          }
        });
      } else if (duplicateSelectionResult.entities !== null) {
        context.setDocument({
          ...currentDocument,
          entities: {
            ...currentDocument.entities,
            ...Object.fromEntries(duplicateSelectionResult.entities.map((entity) => [entity.id, cloneEntityInstance(entity)]))
          }
        });
      } else if (duplicateSelectionResult.modelInstances !== null) {
        context.setDocument({
          ...currentDocument,
          modelInstances: {
            ...currentDocument.modelInstances,
            ...Object.fromEntries(
              duplicateSelectionResult.modelInstances.map((modelInstance) => [modelInstance.id, cloneModelInstance(modelInstance)])
            )
          }
        });
      }

      context.setSelection(cloneEditorSelection(duplicateSelectionResult.selection));
      context.setToolMode("select");
    },
    undo(context) {
      if (duplicateSelectionResult === null) {
        return;
      }

      const currentDocument = context.getDocument();

      if (duplicateSelectionResult.brushes !== null) {
        const nextBrushes = {
          ...currentDocument.brushes
        };

        for (const duplicatedBrush of duplicateSelectionResult.brushes) {
          delete nextBrushes[duplicatedBrush.id];
        }

        context.setDocument({
          ...currentDocument,
          brushes: nextBrushes
        });
      } else if (duplicateSelectionResult.entities !== null) {
        const nextEntities = {
          ...currentDocument.entities
        };

        for (const duplicatedEntity of duplicateSelectionResult.entities) {
          delete nextEntities[duplicatedEntity.id];
        }

        context.setDocument({
          ...currentDocument,
          entities: nextEntities
        });
      } else if (duplicateSelectionResult.modelInstances !== null) {
        const nextModelInstances = {
          ...currentDocument.modelInstances
        };

        for (const duplicatedModelInstance of duplicateSelectionResult.modelInstances) {
          delete nextModelInstances[duplicatedModelInstance.id];
        }

        context.setDocument({
          ...currentDocument,
          modelInstances: nextModelInstances
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