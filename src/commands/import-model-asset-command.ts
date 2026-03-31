import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import { cloneModelInstance, type ModelInstance } from "../assets/model-instances";
import { cloneProjectAssetRecord, type ModelAssetRecord } from "../assets/project-assets";

import type { EditorCommand } from "./command";

interface ImportModelAssetCommandOptions {
  asset: ModelAssetRecord;
  modelInstance: ModelInstance;
  label?: string;
}

function setSingleModelInstanceSelection(modelInstanceId: string): EditorSelection {
  return {
    kind: "modelInstances",
    ids: [modelInstanceId]
  };
}

export function createImportModelAssetCommand(options: ImportModelAssetCommandOptions): EditorCommand {
  const nextAsset = cloneProjectAssetRecord(options.asset);
  const nextModelInstance = cloneModelInstance(options.modelInstance);
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? `Import ${nextAsset.sourceName}`,
    execute(context) {
      const currentDocument = context.getDocument();

      if (currentDocument.assets[nextAsset.id] !== undefined) {
        throw new Error(`Asset ${nextAsset.id} already exists.`);
      }

      if (currentDocument.modelInstances[nextModelInstance.id] !== undefined) {
        throw new Error(`Model instance ${nextModelInstance.id} already exists.`);
      }

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      context.setDocument({
        ...currentDocument,
        assets: {
          ...currentDocument.assets,
          [nextAsset.id]: cloneProjectAssetRecord(nextAsset)
        },
        modelInstances: {
          ...currentDocument.modelInstances,
          [nextModelInstance.id]: cloneModelInstance(nextModelInstance)
        }
      });
      context.setSelection(setSingleModelInstanceSelection(nextModelInstance.id));
      context.setToolMode("select");
    },
    undo(context) {
      const currentDocument = context.getDocument();
      const nextAssets = {
        ...currentDocument.assets
      };
      const nextModelInstances = {
        ...currentDocument.modelInstances
      };

      delete nextAssets[nextAsset.id];
      delete nextModelInstances[nextModelInstance.id];

      context.setDocument({
        ...currentDocument,
        assets: nextAssets,
        modelInstances: nextModelInstances
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

