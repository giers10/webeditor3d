import { createOpaqueId } from "../core/ids";
import { cloneBoxBrushVolumeSettings } from "../document/brushes";
import { getBoxBrushOrThrow, replaceBrush } from "./brush-command-helpers";
export function createSetBoxBrushVolumeSettingsCommand(options) {
    const nextVolume = cloneBoxBrushVolumeSettings(options.volume);
    let previousVolume = null;
    return {
        id: createOpaqueId("command"),
        label: options.label ?? "Set box volume settings",
        execute(context) {
            const currentDocument = context.getDocument();
            const brush = getBoxBrushOrThrow(currentDocument, options.brushId);
            if (previousVolume === null) {
                previousVolume = cloneBoxBrushVolumeSettings(brush.volume);
            }
            context.setDocument(replaceBrush(currentDocument, {
                ...brush,
                volume: cloneBoxBrushVolumeSettings(nextVolume)
            }));
        },
        undo(context) {
            if (previousVolume === null) {
                return;
            }
            const currentDocument = context.getDocument();
            const brush = getBoxBrushOrThrow(currentDocument, options.brushId);
            context.setDocument(replaceBrush(currentDocument, {
                ...brush,
                volume: cloneBoxBrushVolumeSettings(previousVolume)
            }));
        }
    };
}
