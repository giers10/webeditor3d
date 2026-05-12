import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { TerrainBrushPatch } from "../core/terrain-brush";
import type { ToolMode } from "../core/tool-mode";
import { getTerrains } from "../document/terrains";
import { createSplineRoadTerrainPatches } from "../geometry/spline-road-terrain";

import {
  applyTerrainBrushPatchToDocument,
  isTerrainBrushPatchEmpty
} from "./apply-terrain-brush-patch-command";
import type { CommandContext, EditorCommand } from "./command";

interface ApplySplineRoadToTerrainCommandOptions {
  pathId: string;
  label?: string;
}

function clonePatch(patch: TerrainBrushPatch): TerrainBrushPatch {
  return {
    terrainId: patch.terrainId,
    heightSamples: patch.heightSamples.map((entry) => ({ ...entry })),
    paintWeights: patch.paintWeights.map((entry) => ({ ...entry })),
    foliageMaskValues: patch.foliageMaskValues.map((entry) => ({ ...entry })),
    foliageBlockerMaskValues: patch.foliageBlockerMaskValues.map((entry) => ({
      ...entry
    }))
  };
}

function setPathSelection(pathId: string): EditorSelection {
  return {
    kind: "paths",
    ids: [pathId]
  };
}

function applyPatches(
  context: CommandContext,
  patches: readonly TerrainBrushPatch[],
  direction: "forward" | "backward"
) {
  let nextDocument = context.getDocument();

  for (const patch of patches) {
    nextDocument = applyTerrainBrushPatchToDocument(
      nextDocument,
      patch,
      direction
    );
  }

  context.setDocument(nextDocument);
}

export function createApplySplineRoadToTerrainCommand(
  options: ApplySplineRoadToTerrainCommandOptions
): EditorCommand {
  let patches: TerrainBrushPatch[] | null = null;
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

      if (patches === null) {
        patches = createSplineRoadTerrainPatches({
          path,
          terrains: getTerrains(currentDocument.terrains)
        })
          .filter((patch) => !isTerrainBrushPatchEmpty(patch))
          .map(clonePatch);
      }

      if (patches.length === 0) {
        throw new Error("The spline road did not affect any enabled terrain.");
      }

      applyPatches(context, patches, "forward");
      context.setSelection(setPathSelection(options.pathId));
      context.setToolMode("select");
    },
    undo(context) {
      if (patches === null) {
        return;
      }

      applyPatches(context, [...patches].reverse(), "backward");

      if (previousSelection !== null) {
        context.setSelection(previousSelection);
      }

      if (previousToolMode !== null) {
        context.setToolMode(previousToolMode);
      }
    }
  };
}
