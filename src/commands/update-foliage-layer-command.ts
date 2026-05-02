import { createOpaqueId } from "../core/ids";
import { cloneFoliageLayer, type FoliageLayer } from "../foliage/foliage";

import type { EditorCommand } from "./command";

interface UpdateFoliageLayerCommandOptions {
  layer: FoliageLayer;
  label?: string;
}

export function createUpdateFoliageLayerCommand(
  options: UpdateFoliageLayerCommandOptions
): EditorCommand {
  const nextLayer = cloneFoliageLayer(options.layer);
  let previousLayer: FoliageLayer | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Update foliage layer",
    execute(context) {
      const currentDocument = context.getDocument();
      const currentLayer = currentDocument.foliageLayers[nextLayer.id];

      if (currentLayer === undefined) {
        throw new Error(`Foliage layer ${nextLayer.id} does not exist.`);
      }

      if (previousLayer === null) {
        previousLayer = cloneFoliageLayer(currentLayer);
      }

      context.setDocument({
        ...currentDocument,
        foliageLayers: {
          ...currentDocument.foliageLayers,
          [nextLayer.id]: cloneFoliageLayer(nextLayer)
        }
      });
    },
    undo(context) {
      if (previousLayer === null) {
        return;
      }

      const currentDocument = context.getDocument();

      context.setDocument({
        ...currentDocument,
        foliageLayers: {
          ...currentDocument.foliageLayers,
          [previousLayer.id]: cloneFoliageLayer(previousLayer)
        }
      });
    }
  };
}
