import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection, type EditorSelection } from "../core/selection";
import type { ToolMode } from "../core/tool-mode";
import { deleteProjectAssetFromProjectDocument } from "../assets/delete-project-asset";

import type { EditorCommand } from "./command";

function selectionTargetsMissingObject(
  selection: EditorSelection,
  activeScene: ReturnType<EditorCommand["execute"]> extends never ? never : { modelInstances: Record<string, unknown>; entities: Record<string, unknown> }
): boolean {
  if (selection.kind === "modelInstances") {
    return selection.ids.some((id) => activeScene.modelInstances[id] === undefined);
  }

  if (selection.kind === "entities") {
    return selection.ids.some((id) => activeScene.entities[id] === undefined);
  }

  return false;
}

export function createDeleteProjectAssetCommand(assetId: string): EditorCommand {
  let previousSelection: EditorSelection | null = null;
  let previousToolMode: ToolMode | null = null;
  let previousProjectDocument = null;
  let assetLabel: string | null = null;

  return {
    id: createOpaqueId("command"),
    label: "Delete project asset",
    execute(context) {
      const currentProjectDocument = context.getProjectDocument();
      const currentAsset = currentProjectDocument.assets[assetId];

      if (currentAsset === undefined) {
        throw new Error(`Project asset ${assetId} does not exist.`);
      }

      if (previousProjectDocument === null) {
        previousProjectDocument = currentProjectDocument;
      }

      if (previousSelection === null) {
        previousSelection = cloneEditorSelection(context.getSelection());
      }

      if (previousToolMode === null) {
        previousToolMode = context.getToolMode();
      }

      assetLabel = currentAsset.sourceName;
      const nextProjectDocument = deleteProjectAssetFromProjectDocument(
        currentProjectDocument,
        assetId
      );
      context.setProjectDocument(nextProjectDocument);

      const activeScene = nextProjectDocument.scenes[nextProjectDocument.activeSceneId];

      if (selectionTargetsMissingObject(context.getSelection(), activeScene)) {
        context.setSelection({ kind: "none" });
      }

      context.setToolMode("select");
    },
    undo(context) {
      if (previousProjectDocument === null) {
        return;
      }

      context.setProjectDocument(previousProjectDocument);

      if (previousSelection !== null) {
        context.setSelection(previousSelection);
      }

      if (previousToolMode !== null) {
        context.setToolMode(previousToolMode);
      }
    }
  };
}