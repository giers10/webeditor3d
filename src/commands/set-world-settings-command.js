import { createOpaqueId } from "../core/ids";
import { cloneWorldSettings } from "../document/world-settings";
export function createSetWorldSettingsCommand(options) {
    const nextWorld = cloneWorldSettings(options.world);
    let previousWorld = null;
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
