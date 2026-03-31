import { createOpaqueId } from "../core/ids";
import { cloneWorldSettings, type WorldSettings } from "../document/world-settings";

import type { EditorCommand } from "./command";

interface SetWorldSettingsCommandOptions {
  label: string;
  world: WorldSettings;
}

export function createSetWorldSettingsCommand(options: SetWorldSettingsCommandOptions): EditorCommand {
  const nextWorld = cloneWorldSettings(options.world);
  let previousWorld: WorldSettings | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label,
    execute(context) {
      const currentDocument = context.getDocument();

      if (previousWorld === null) {
        previousWorld = cloneWorldSettings(currentDocument.world);
      }

      context.setDocument({
        ...currentDocument,
        world: cloneWorldSettings(nextWorld)
      });
    },
    undo(context) {
      if (previousWorld === null) {
        return;
      }

      const currentDocument = context.getDocument();
      context.setDocument({
        ...currentDocument,
        world: cloneWorldSettings(previousWorld)
      });
    }
  };
}
