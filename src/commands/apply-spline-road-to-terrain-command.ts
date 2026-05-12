import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import {
  cloneTerrain,
  ensureTerrainMaterialLayer,
  getTerrains,
  type Terrain
} from "../document/terrains";
import { createSplineRoadTerrainPatch } from "../geometry/spline-road-terrain";

import {
  applyTerrainBrushPatchToDocument,
  isTerrainBrushPatchEmpty
} from "./apply-terrain-brush-patch-command";
import type { CommandContext, EditorCommand } from "./command";

interface ApplySplineRoadToTerrainCommandOptions {
  pathId: string;
  label?: string;
}

interface AppliedTerrainRoad {
  terrainId: string;
  before: Terrain;
  after: Terrain;
}

function setPathSelection(pathId: string): EditorSelection {
  return {
    kind: "paths",
    ids: [pathId]
  };
}

function applyTerrains(
  context: CommandContext,
  appliedTerrains: readonly AppliedTerrainRoad[],
  direction: "forward" | "backward"
) {
  const currentDocument = context.getDocument();
  const nextTerrains = { ...currentDocument.terrains };

  for (const appliedTerrain of appliedTerrains) {
    nextTerrains[appliedTerrain.terrainId] = cloneTerrain(
      direction === "forward" ? appliedTerrain.after : appliedTerrain.before
    );
  }

  context.setDocument({
    ...currentDocument,
    terrains: nextTerrains
  });
}

function createAppliedTerrainRoads(
  document: ReturnType<CommandContext["getDocument"]>,
  pathId: string
): AppliedTerrainRoad[] {
  const path = document.paths[pathId];

  if (path === undefined) {
    throw new Error(`Path ${pathId} does not exist.`);
  }

  const appliedTerrains: AppliedTerrainRoad[] = [];

  for (const terrain of getTerrains(document.terrains)) {
    if (!terrain.enabled) {
      continue;
    }

    const before = cloneTerrain(terrain);
    const terrainWithMaterialLayer =
      path.road.materialId === null
        ? terrain
        : ensureTerrainMaterialLayer(terrain, path.road.materialId).terrain;
    let tempDocument = {
      ...document,
      terrains: {
        ...document.terrains,
        [terrain.id]: cloneTerrain(terrainWithMaterialLayer)
      }
    };
    const patch = createSplineRoadTerrainPatch({
      path,
      terrain: tempDocument.terrains[terrain.id]!
    });

    if (patch === null || isTerrainBrushPatchEmpty(patch)) {
      continue;
    }

    tempDocument = applyTerrainBrushPatchToDocument(
      tempDocument,
      patch,
      "forward"
    );
    appliedTerrains.push({
      terrainId: terrain.id,
      before,
      after: cloneTerrain(tempDocument.terrains[terrain.id]!)
    });
  }

  return appliedTerrains;
}

export function createApplySplineRoadToTerrainCommand(
  options: ApplySplineRoadToTerrainCommandOptions
): EditorCommand {
  let appliedTerrains: AppliedTerrainRoad[] | null = null;
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Apply spline road to terrain",
    execute(context) {
      const currentDocument = context.getDocument();
      const path = currentDocument.paths[options.pathId];

      if (path === undefined) {
        throw new Error(`Path ${options.pathId} does not exist.`);
      }

      if (!path.road.enabled) {
        throw new Error("Enable road preview before applying it to terrain.");
      }

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      if (appliedTerrains === null) {
        appliedTerrains = createAppliedTerrainRoads(
          currentDocument,
          options.pathId
        );
      }

      if (appliedTerrains.length === 0) {
        throw new Error("The spline road did not affect any enabled terrain.");
      }

      applyTerrains(context, appliedTerrains, "forward");
      context.setSelection(setPathSelection(options.pathId));
      context.setToolMode("select");
    },
    undo(context) {
      if (appliedTerrains === null) {
        return;
      }

      applyTerrains(context, appliedTerrains, "backward");

      if (previousSelection !== null) {
        context.setSelection(previousSelection);
      }

      if (previousToolMode !== null) {
        context.setToolMode(previousToolMode);
      }
    }
  };
}
