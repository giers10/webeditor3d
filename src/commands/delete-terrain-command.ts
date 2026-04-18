import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import { cloneTerrain, type Terrain } from "../document/terrains";

import type { EditorCommand } from "./command";

export function createDeleteTerrainCommand(terrainId: string): EditorCommand {
  let deletedTerrain: Terrain | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: "Delete terrain",
    execute(context) {
      const currentDocument = context.getDocument();
      const terrain = currentDocument.terrains[terrainId];

      if (terrain === undefined) {
        throw new Error(`Terrain ${terrainId} does not exist.`);
      }

      if (deletedTerrain === null) {
        deletedTerrain = cloneTerrain(terrain);
      }

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      const nextTerrains = {
        ...currentDocument.terrains
      };
      delete nextTerrains[terrainId];

      context.setDocument({
        ...currentDocument,
        terrains: nextTerrains
      });
      context.setSelection({
        kind: "none"
      });
      context.setToolMode("select");
    },
    undo(context) {
      if (deletedTerrain === null) {
        return;
      }

      const currentDocument = context.getDocument();
      context.setDocument({
        ...currentDocument,
        terrains: {
          ...currentDocument.terrains,
          [deletedTerrain.id]: cloneTerrain(deletedTerrain)
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
