import { cloneModelInstance, type ModelInstance } from "../assets/model-instances";
import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import { cloneBoxBrush, type BoxBrush } from "../document/brushes";
import { cloneScenePath, type ScenePath } from "../document/paths";
import type { SceneDocument } from "../document/scene-document";
import {
  cloneEntityInstance,
  createNpcActorId,
  type EntityInstance
} from "../entities/entity-instances";

import type { EditorCommand } from "./command";

interface DuplicateSelectionResult {
  selection: EditorSelection;
  brushes: BoxBrush[] | null;
  paths: ScenePath[] | null;
  entities: EntityInstance[] | null;
  modelInstances: ModelInstance[] | null;
}

function duplicateBrush(brush: BoxBrush): BoxBrush {
  const duplicatedBrush = cloneBoxBrush(brush);
  duplicatedBrush.id = createOpaqueId("brush");
  return duplicatedBrush;
}

function duplicatePath(path: ScenePath): ScenePath {
  const duplicatedPath = cloneScenePath(path);
  duplicatedPath.id = createOpaqueId("path");
  duplicatedPath.points = duplicatedPath.points.map((point) => ({
    ...point,
    id: createOpaqueId("path-point")
  }));
  return duplicatedPath;
}

function duplicateEntity(entity: EntityInstance): EntityInstance {
  const duplicatedEntity = cloneEntityInstance(entity);
  duplicatedEntity.id = createOpaqueId(`entity-${duplicatedEntity.kind}`);

  if (duplicatedEntity.kind === "npc") {
    duplicatedEntity.actorId = createNpcActorId();
  }

  return duplicatedEntity;
}

function duplicateModelInstance(modelInstance: ModelInstance): ModelInstance {
  const duplicatedModelInstance = cloneModelInstance(modelInstance);
  duplicatedModelInstance.id = createOpaqueId("model-instance");
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

function createDuplicateSelectionResult(currentDocument: SceneDocument, selection: EditorSelection): DuplicateSelectionResult {
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
      paths: null,
      entities: null,
      modelInstances: null
    };
  }

  if (selection.kind === "paths") {
    if (selection.ids.length === 0) {
      throw new Error("Select at least one path to duplicate.");
    }

    const duplicatedPaths = selection.ids.map((pathId) => {
      const sourcePath = currentDocument.paths[pathId];

      if (sourcePath === undefined) {
        throw new Error(`Path ${pathId} does not exist.`);
      }

      return duplicatePath(sourcePath);
    });

    return {
      selection: {
        kind: "paths",
        ids: duplicatedPaths.map((path) => path.id)
      },
      brushes: null,
      paths: duplicatedPaths,
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
      paths: null,
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
      paths: null,
      entities: null,
      modelInstances: duplicatedModelInstances
    };
  }

  throw new Error("Selection must contain whitebox solids, paths, entities, or model instances to duplicate.");
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
      } else if (duplicateSelectionResult.paths !== null) {
        context.setDocument({
          ...currentDocument,
          paths: {
            ...currentDocument.paths,
            ...Object.fromEntries(
              duplicateSelectionResult.paths.map((path) => [path.id, cloneScenePath(path)])
            )
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
      } else if (duplicateSelectionResult.paths !== null) {
        const nextPaths = {
          ...currentDocument.paths
        };

        for (const duplicatedPath of duplicateSelectionResult.paths) {
          delete nextPaths[duplicatedPath.id];
        }

        context.setDocument({
          ...currentDocument,
          paths: nextPaths
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
