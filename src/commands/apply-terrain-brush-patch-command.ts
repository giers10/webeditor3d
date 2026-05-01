import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type {
  TerrainBrushPatch,
  TerrainSampleValuePatch
} from "../core/terrain-brush";
import type { ToolMode } from "../core/tool-mode";

import type { EditorCommand } from "./command";

interface ApplyTerrainBrushPatchCommandOptions {
  patch: TerrainBrushPatch;
  label?: string;
}

function setSingleTerrainSelection(terrainId: string): EditorSelection {
  return {
    kind: "terrains",
    ids: [terrainId]
  };
}

function assertValidPatchEntry(
  entry: TerrainSampleValuePatch,
  length: number,
  label: string
) {
  if (
    !Number.isInteger(entry.index) ||
    entry.index < 0 ||
    entry.index >= length
  ) {
    throw new Error(`${label} patch index ${entry.index} is out of range.`);
  }

  if (!Number.isFinite(entry.before) || !Number.isFinite(entry.after)) {
    throw new Error(`${label} patch values must remain finite.`);
  }
}

export function isTerrainBrushPatchEmpty(patch: TerrainBrushPatch): boolean {
  return patch.heightSamples.length === 0 && patch.paintWeights.length === 0;
}

export function createApplyTerrainBrushPatchCommand(
  options: ApplyTerrainBrushPatchCommandOptions
): EditorCommand {
  const patch: TerrainBrushPatch = {
    terrainId: options.patch.terrainId,
    heightSamples: options.patch.heightSamples.map((entry) => ({ ...entry })),
    paintWeights: options.patch.paintWeights.map((entry) => ({ ...entry }))
  };
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  const applyPatch = (
    context: Parameters<EditorCommand["execute"]>[0],
    direction: "forward" | "backward"
  ) => {
    const currentDocument = context.getDocument();
    const terrain = currentDocument.terrains[patch.terrainId];

    if (terrain === undefined) {
      throw new Error(`Terrain ${patch.terrainId} does not exist.`);
    }

    for (const entry of patch.heightSamples) {
      assertValidPatchEntry(entry, terrain.heights.length, "Terrain height");
      terrain.heights[entry.index] =
        direction === "forward" ? entry.after : entry.before;
    }

    for (const entry of patch.paintWeights) {
      assertValidPatchEntry(
        entry,
        terrain.paintWeights.length,
        "Terrain paint weight"
      );
      terrain.paintWeights[entry.index] =
        direction === "forward" ? entry.after : entry.before;
    }

    context.setDocument({
      ...currentDocument,
      terrains: {
        ...currentDocument.terrains,
        [patch.terrainId]: terrain
      }
    });
  };

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Apply terrain brush patch",
    execute(context) {
      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      applyPatch(context, "forward");
      context.setSelection(setSingleTerrainSelection(patch.terrainId));
      context.setToolMode("select");
    },
    undo(context) {
      applyPatch(context, "backward");

      if (previousSelection !== null) {
        context.setSelection(previousSelection);
      }

      if (previousToolMode !== null) {
        context.setToolMode(previousToolMode);
      }
    }
  };
}
