import { createOpaqueId } from "../core/ids";
import { cloneEditorSelection } from "../core/selection";
import { cloneModelInstance } from "../assets/model-instances";
function selectionIncludesModelInstance(selection, modelInstanceId) {
    return selection.kind === "modelInstances" && selection.ids.includes(modelInstanceId);
}
export function createDeleteModelInstanceCommand(modelInstanceId) {
    let previousModelInstance = null;
    let previousSelection = null;
    let previousToolMode = null;
    return {
        id: createOpaqueId("command"),
        label: "Delete model instance",
        execute(context) {
            const currentDocument = context.getDocument();
            const currentModelInstance = currentDocument.modelInstances[modelInstanceId];
            if (currentModelInstance === undefined) {
                throw new Error(`Model instance ${modelInstanceId} does not exist.`);
            }
            if (previousModelInstance === null) {
                previousModelInstance = cloneModelInstance(currentModelInstance);
            }
            if (previousSelection === null) {
                previousSelection = cloneEditorSelection(context.getSelection());
            }
            if (previousToolMode === null) {
                previousToolMode = context.getToolMode();
            }
            const nextModelInstances = {
                ...currentDocument.modelInstances
            };
            delete nextModelInstances[modelInstanceId];
            context.setDocument({
                ...currentDocument,
                modelInstances: nextModelInstances
            });
            if (selectionIncludesModelInstance(context.getSelection(), modelInstanceId)) {
                context.setSelection({
                    kind: "none"
                });
            }
            context.setToolMode("select");
        },
        undo(context) {
            if (previousModelInstance === null) {
                return;
            }
            const currentDocument = context.getDocument();
            context.setDocument({
                ...currentDocument,
                modelInstances: {
                    ...currentDocument.modelInstances,
                    [previousModelInstance.id]: cloneModelInstance(previousModelInstance)
                }
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
