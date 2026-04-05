import { createOpaqueId } from "../core/ids";
export function createSetSceneNameCommand(nextName) {
    const normalizedName = nextName.trim() || "Untitled Scene";
    let previousName = null;
    return {
        id: createOpaqueId("command"),
        label: `Rename scene to ${normalizedName}`,
        execute(context) {
            const currentDocument = context.getDocument();
            if (previousName === null) {
                previousName = currentDocument.name;
            }
            context.setDocument({
                ...currentDocument,
                name: normalizedName
            });
        },
        undo(context) {
            if (previousName === null) {
                return;
            }
            const currentDocument = context.getDocument();
            context.setDocument({
                ...currentDocument,
                name: previousName
            });
        }
    };
}
