import { createOpaqueId } from "../core/ids";

import { getBoxBrushOrThrow, replaceBrush } from "./brush-command-helpers";
import type { EditorCommand } from "./command";

interface SetBoxBrushAuthoredStateCommandOptions {
  brushId: string;
  visible?: boolean;
  enabled?: boolean;
}

function createCommandLabel(options: SetBoxBrushAuthoredStateCommandOptions): string {
  if (options.enabled !== undefined && options.visible === undefined) {
    return options.enabled ? "Enable box brush" : "Disable box brush";
  }

  if (options.visible !== undefined && options.enabled === undefined) {
    return options.visible ? "Show box brush" : "Hide box brush";
  }

  return "Update box brush state";
}

export function createSetBoxBrushAuthoredStateCommand(
  options: SetBoxBrushAuthoredStateCommandOptions
): EditorCommand {
  if (options.visible === undefined && options.enabled === undefined) {
    throw new Error("Box brush authored state command requires at least one change.");
  }

  let previousVisible: boolean | null = null;
  let previousEnabled: boolean | null = null;

  return {
    id: createOpaqueId("command"),
    label: createCommandLabel(options),
    execute(context) {
      const currentDocument = context.getDocument();
      const brush = getBoxBrushOrThrow(currentDocument, options.brushId);

      if (previousVisible === null) {
        previousVisible = brush.visible;
      }

      if (previousEnabled === null) {
        previousEnabled = brush.enabled;
      }

      context.setDocument(
        replaceBrush(currentDocument, {
          ...brush,
          visible: options.visible ?? brush.visible,
          enabled: options.enabled ?? brush.enabled
        })
      );
    },
    undo(context) {
      if (previousVisible === null || previousEnabled === null) {
        return;
      }

      const currentDocument = context.getDocument();
      const brush = getBoxBrushOrThrow(currentDocument, options.brushId);

      context.setDocument(
        replaceBrush(currentDocument, {
          ...brush,
          visible: previousVisible,
          enabled: previousEnabled
        })
      );
    }
  };
}