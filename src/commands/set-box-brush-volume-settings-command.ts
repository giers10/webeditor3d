import { createOpaqueId } from "../core/ids";
import { cloneBoxBrushVolumeSettings, type BoxBrushVolumeSettings } from "../document/brushes";

import { getBoxBrushOrThrow, replaceBrush } from "./brush-command-helpers";
import type { EditorCommand } from "./command";

interface SetBoxBrushVolumeSettingsCommandOptions {
  brushId: string;
  volume: BoxBrushVolumeSettings;
  label?: string;
}

export function createSetBoxBrushVolumeSettingsCommand(options: SetBoxBrushVolumeSettingsCommandOptions): EditorCommand {
  const nextVolume = cloneBoxBrushVolumeSettings(options.volume);
  let previousVolume: BoxBrushVolumeSettings | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Set box volume settings",
    execute(context) {
      const currentDocument = context.getDocument();
      const brush = getBoxBrushOrThrow(currentDocument, options.brushId);

      if (previousVolume === null) {
        previousVolume = cloneBoxBrushVolumeSettings(brush.volume);
      }

      context.setDocument(
        replaceBrush(currentDocument, {
          ...brush,
          volume: cloneBoxBrushVolumeSettings(nextVolume)
        })
      );
    },
    undo(context) {
      if (previousVolume === null) {
        return;
      }

      const currentDocument = context.getDocument();
      const brush = getBoxBrushOrThrow(currentDocument, options.brushId);

      context.setDocument(
        replaceBrush(currentDocument, {
          ...brush,
          volume: cloneBoxBrushVolumeSettings(previousVolume)
        })
      );
    }
  };
}
