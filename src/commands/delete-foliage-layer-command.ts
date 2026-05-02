import { createOpaqueId } from "../core/ids";
import { cloneTerrain, type Terrain } from "../document/terrains";
import { cloneFoliageLayer, type FoliageLayer } from "../foliage/foliage";

import type { EditorCommand } from "./command";

export function createDeleteFoliageLayerCommand(
  foliageLayerId: string
): EditorCommand {
  let deletedLayer: FoliageLayer | null = null;
  let previousTerrains: Record<string, Terrain> | null = null;

  return {
    id: createOpaqueId("command"),
    label: "Delete foliage layer",
    execute(context) {
      const currentDocument = context.getDocument();
      const currentLayer = currentDocument.foliageLayers[foliageLayerId];

      if (currentLayer === undefined) {
        throw new Error(`Foliage layer ${foliageLayerId} does not exist.`);
      }

      if (deletedLayer === null) {
        deletedLayer = cloneFoliageLayer(currentLayer);
      }

      if (previousTerrains === null) {
        previousTerrains = Object.fromEntries(
          Object.entries(currentDocument.terrains)
            .filter(
              ([, terrain]) => terrain.foliageMasks[foliageLayerId] !== undefined
            )
            .map(([terrainId, terrain]) => [terrainId, cloneTerrain(terrain)])
        );
      }

      const nextFoliageLayers = {
        ...currentDocument.foliageLayers
      };
      const nextTerrains = {
        ...currentDocument.terrains
      };

      delete nextFoliageLayers[foliageLayerId];

      for (const [terrainId, terrain] of Object.entries(nextTerrains)) {
        if (terrain.foliageMasks[foliageLayerId] === undefined) {
          continue;
        }

        const nextFoliageMasks = {
          ...terrain.foliageMasks
        };
        delete nextFoliageMasks[foliageLayerId];
        nextTerrains[terrainId] = cloneTerrain({
          ...terrain,
          foliageMasks: nextFoliageMasks
        });
      }

      context.setDocument({
        ...currentDocument,
        foliageLayers: nextFoliageLayers,
        terrains: nextTerrains
      });
    },
    undo(context) {
      if (deletedLayer === null) {
        return;
      }

      const currentDocument = context.getDocument();
      const restoredTerrains = {
        ...currentDocument.terrains
      };

      if (previousTerrains !== null) {
        for (const [terrainId, terrain] of Object.entries(previousTerrains)) {
          restoredTerrains[terrainId] = cloneTerrain(terrain);
        }
      }

      context.setDocument({
        ...currentDocument,
        foliageLayers: {
          ...currentDocument.foliageLayers,
          [deletedLayer.id]: cloneFoliageLayer(deletedLayer)
        },
        terrains: restoredTerrains
      });
    }
  };
}
