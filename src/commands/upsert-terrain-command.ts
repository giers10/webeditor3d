import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import {
  cloneTerrain,
  getTerrainKindLabel,
  type Terrain
} from "../document/terrains";

import type { EditorCommand } from "./command";

interface UpsertTerrainCommandOptions {
  terrain: Terrain;
  label?: string;
}

function setSingleTerrainSelection(terrainId: string): EditorSelection {
  return {
    kind: "terrains",
    ids: [terrainId]
  };
}

function createDefaultTerrainCommandLabel(isNewTerrain: boolean): string {
  const action = isNewTerrain ? "Create" : "Update";
  return `${action} ${getTerrainKindLabel().toLowerCase()}`;
}

export function createUpsertTerrainCommand(
  options: UpsertTerrainCommandOptions
): EditorCommand {
  const nextTerrain = cloneTerrain(options.terrain);
  let previousTerrain: Terrain | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? createDefaultTerrainCommandLabel(true),
    execute(context) {
      const currentDocument = context.getDocument();
      const currentTerrain = currentDocument.terrains[nextTerrain.id];

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      if (previousTerrain === null && currentTerrain !== undefined) {
        previousTerrain = cloneTerrain(currentTerrain);
      }

      context.setDocument({
        ...currentDocument,
        terrains: {
          ...currentDocument.terrains,
          [nextTerrain.id]: cloneTerrain(nextTerrain)
        }
      });
      context.setSelection(setSingleTerrainSelection(nextTerrain.id));
      context.setToolMode("select");
    },
    undo(context) {
      const currentDocument = context.getDocument();
      const nextTerrains = {
        ...currentDocument.terrains
      };

      if (previousTerrain === null) {
        delete nextTerrains[nextTerrain.id];
      } else {
        nextTerrains[nextTerrain.id] = cloneTerrain(previousTerrain);
      }

      context.setDocument({
        ...currentDocument,
        terrains: nextTerrains
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
