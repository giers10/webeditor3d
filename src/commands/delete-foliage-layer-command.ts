import { createOpaqueId } from "../core/ids";
import { cloneFoliageLayer, type FoliageLayer } from "../foliage/foliage";

import type { EditorCommand } from "./command";

export function createDeleteFoliageLayerCommand(
  foliageLayerId: string
): EditorCommand {
  let deletedLayer: FoliageLayer | null = null;

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

      const nextFoliageLayers = {
        ...currentDocument.foliageLayers
      };

      delete nextFoliageLayers[foliageLayerId];

      context.setDocument({
        ...currentDocument,
        foliageLayers: nextFoliageLayers
      });
    },
    undo(context) {
      if (deletedLayer === null) {
        return;
      }

      const currentDocument = context.getDocument();

      context.setDocument({
        ...currentDocument,
        foliageLayers: {
          ...currentDocument.foliageLayers,
          [deletedLayer.id]: cloneFoliageLayer(deletedLayer)
        }
      });
    }
  };
}
