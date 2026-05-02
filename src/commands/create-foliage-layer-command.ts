import { createOpaqueId } from "../core/ids";
import { cloneFoliageLayer, type FoliageLayer } from "../foliage/foliage";

import type { EditorCommand } from "./command";

interface CreateFoliageLayerCommandOptions {
  layer: FoliageLayer;
  label?: string;
}

export function createCreateFoliageLayerCommand(
  options: CreateFoliageLayerCommandOptions
): EditorCommand {
  const nextLayer = cloneFoliageLayer(options.layer);

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Create foliage layer",
    execute(context) {
      const currentDocument = context.getDocument();

      if (currentDocument.foliageLayers[nextLayer.id] !== undefined) {
        throw new Error(`Foliage layer ${nextLayer.id} already exists.`);
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
      const currentDocument = context.getDocument();
      const nextFoliageLayers = {
        ...currentDocument.foliageLayers
      };

      delete nextFoliageLayers[nextLayer.id];

      context.setDocument({
        ...currentDocument,
        foliageLayers: nextFoliageLayers
      });
    }
  };
}
