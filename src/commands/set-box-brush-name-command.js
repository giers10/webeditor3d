import { createOpaqueId } from "../core/ids";
import { normalizeBrushName } from "../document/brushes";
import { getBoxBrushOrThrow, replaceBrush } from "./brush-command-helpers";
export function createSetBoxBrushNameCommand(options) {
    const normalizedName = normalizeBrushName(options.name);
    let previousName;
    return {
        id: createOpaqueId("command"),
        label: normalizedName === undefined ? "Clear box brush name" : `Rename box brush to ${normalizedName}`,
        execute(context) {
            const currentDocument = context.getDocument();
            const brush = getBoxBrushOrThrow(currentDocument, options.brushId);
            if (previousName === undefined) {
                previousName = brush.name;
            }
            context.setDocument(replaceBrush(currentDocument, {
                ...brush,
                name: normalizedName
            }));
        },
        undo(context) {
            const currentDocument = context.getDocument();
            const brush = getBoxBrushOrThrow(currentDocument, options.brushId);
            context.setDocument(replaceBrush(currentDocument, {
                ...brush,
                name: previousName
            }));
        }
    };
}
