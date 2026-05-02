import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type {
  TerrainBrushPatch,
  TerrainSampleValuePatch
} from "../core/terrain-brush";
import {
  getOrCreateTerrainFoliageMask,
  isTerrainFoliageMaskEmpty,
  markTerrainRenderSamplesDirty,
  TERRAIN_LAYER_COUNT,
  updateTerrainBoundsCacheAfterHeightPatch,
  type Terrain,
  type TerrainSampleBounds
} from "../document/terrains";
import type { ToolMode } from "../core/tool-mode";

import type { CommandContext, EditorCommand } from "./command";

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
  return (
    patch.heightSamples.length === 0 &&
    patch.paintWeights.length === 0 &&
    patch.foliageMaskValues.length === 0 &&
    patch.foliageBlockerMaskValues.length === 0
  );
}

function mergeTerrainSampleIndexIntoBounds(
  bounds: TerrainSampleBounds | null,
  terrain: Terrain,
  sampleIndex: number
): TerrainSampleBounds {
  const sampleX = sampleIndex % terrain.sampleCountX;
  const sampleZ = Math.floor(sampleIndex / terrain.sampleCountX);

  if (bounds === null) {
    return {
      minSampleX: sampleX,
      maxSampleX: sampleX,
      minSampleZ: sampleZ,
      maxSampleZ: sampleZ
    };
  }

  return {
    minSampleX: Math.min(bounds.minSampleX, sampleX),
    maxSampleX: Math.max(bounds.maxSampleX, sampleX),
    minSampleZ: Math.min(bounds.minSampleZ, sampleZ),
    maxSampleZ: Math.max(bounds.maxSampleZ, sampleZ)
  };
}

export function createApplyTerrainBrushPatchCommand(
  options: ApplyTerrainBrushPatchCommandOptions
): EditorCommand {
  const patch: TerrainBrushPatch = {
    terrainId: options.patch.terrainId,
    heightSamples: options.patch.heightSamples.map((entry) => ({ ...entry })),
    paintWeights: options.patch.paintWeights.map((entry) => ({ ...entry })),
    foliageMaskValues: options.patch.foliageMaskValues.map((entry) => ({
      ...entry
    })),
    foliageBlockerMaskValues: options.patch.foliageBlockerMaskValues.map(
      (entry) => ({ ...entry })
    )
  };
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  const applyPatch = (
    context: CommandContext,
    direction: "forward" | "backward"
  ) => {
    const currentDocument = context.getDocument();
    const terrain = currentDocument.terrains[patch.terrainId];

    if (terrain === undefined) {
      throw new Error(`Terrain ${patch.terrainId} does not exist.`);
    }

    const heightPatchForBounds = patch.heightSamples.map((entry) => ({
      index: entry.index,
      before: direction === "forward" ? entry.before : entry.after,
      after: direction === "forward" ? entry.after : entry.before
    }));

    let renderDirtyBounds: TerrainSampleBounds | null = null;

    for (const entry of patch.heightSamples) {
      assertValidPatchEntry(entry, terrain.heights.length, "Terrain height");
      terrain.heights[entry.index] =
        direction === "forward" ? entry.after : entry.before;
      renderDirtyBounds = mergeTerrainSampleIndexIntoBounds(
        renderDirtyBounds,
        terrain,
        entry.index
      );
    }

    updateTerrainBoundsCacheAfterHeightPatch(terrain, heightPatchForBounds);

    for (const entry of patch.paintWeights) {
      assertValidPatchEntry(
        entry,
        terrain.paintWeights.length,
        "Terrain paint weight"
      );
      terrain.paintWeights[entry.index] =
        direction === "forward" ? entry.after : entry.before;
      renderDirtyBounds = mergeTerrainSampleIndexIntoBounds(
        renderDirtyBounds,
        terrain,
        Math.floor(entry.index / (TERRAIN_LAYER_COUNT - 1))
      );
    }

    for (const entry of patch.foliageMaskValues) {
      if (currentDocument.foliageLayers[entry.layerId] === undefined) {
        throw new Error(
          `Foliage layer ${entry.layerId} does not exist for terrain mask patch.`
        );
      }

      const mask = getOrCreateTerrainFoliageMask(terrain, entry.layerId);
      assertValidPatchEntry(
        entry,
        mask.values.length,
        "Terrain foliage mask"
      );
      mask.values[entry.index] =
        direction === "forward" ? entry.after : entry.before;
      renderDirtyBounds = mergeTerrainSampleIndexIntoBounds(
        renderDirtyBounds,
        terrain,
        entry.index
      );

      if (isTerrainFoliageMaskEmpty(mask)) {
        delete terrain.foliageMasks[entry.layerId];
      }
    }

    for (const entry of patch.foliageBlockerMaskValues) {
      assertValidPatchEntry(
        entry,
        terrain.foliageBlockerMask.values.length,
        "Terrain foliage blocker mask"
      );
      terrain.foliageBlockerMask.values[entry.index] =
        direction === "forward" ? entry.after : entry.before;
      renderDirtyBounds = mergeTerrainSampleIndexIntoBounds(
        renderDirtyBounds,
        terrain,
        entry.index
      );
    }

    markTerrainRenderSamplesDirty(terrain, renderDirtyBounds);

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
