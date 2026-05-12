import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import {
  cloneTerrain,
  createTerrainWithAddedLayer,
  getTerrainLayerLabel,
  type Terrain
} from "../document/terrains";

import type { EditorCommand } from "./command";

interface AddTerrainLayerCommandOptions {
  terrainId: string;
  materialId?: string | null;
  label?: string;
}

function setSingleTerrainSelection(terrainId: string): EditorSelection {
  return {
    kind: "terrains",
    ids: [terrainId]
  };
}

export function createAddTerrainLayerCommand(
  options: AddTerrainLayerCommandOptions
): EditorCommand {
  let previousTerrain: Terrain | null = null;
  let nextTerrain: Terrain | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Add terrain material layer",
    execute(context) {
      const currentDocument = context.getDocument();
      const terrain = currentDocument.terrains[options.terrainId];

      if (terrain === undefined) {
        throw new Error(`Terrain ${options.terrainId} does not exist.`);
      }

      if (previousTerrain === null) {
        previousTerrain = cloneTerrain(terrain);
      }

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      if (nextTerrain === null) {
        nextTerrain = createTerrainWithAddedLayer(
          terrain,
          options.materialId ?? null
        );
      }

      context.setDocument({
        ...currentDocument,
        terrains: {
          ...currentDocument.terrains,
          [options.terrainId]: cloneTerrain(nextTerrain)
        }
      });
      context.setSelection(setSingleTerrainSelection(options.terrainId));
      context.setToolMode("select");
    },
    undo(context) {
      if (previousTerrain === null) {
        return;
      }

      const currentDocument = context.getDocument();

      context.setDocument({
        ...currentDocument,
        terrains: {
          ...currentDocument.terrains,
          [options.terrainId]: cloneTerrain(previousTerrain)
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

export function getAddedTerrainLayerStatusLabel(terrain: Terrain): string {
  return getTerrainLayerLabel(terrain.layers.length - 1);
}
