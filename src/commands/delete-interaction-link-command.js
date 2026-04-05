import { createOpaqueId } from "../core/ids";
import { cloneInteractionLink } from "../interactions/interaction-links";
export function createDeleteInteractionLinkCommand(linkId) {
    let previousLink = null;
    return {
        id: createOpaqueId("command"),
        label: "Delete interaction link",
        execute(context) {
            const currentDocument = context.getDocument();
            const currentLink = currentDocument.interactionLinks[linkId];
            if (currentLink === undefined) {
                throw new Error(`Interaction link ${linkId} does not exist.`);
            }
            if (previousLink === null) {
                previousLink = cloneInteractionLink(currentLink);
            }
            const nextInteractionLinks = {
                ...currentDocument.interactionLinks
            };
            delete nextInteractionLinks[linkId];
            context.setDocument({
                ...currentDocument,
                interactionLinks: nextInteractionLinks
            });
        },
        undo(context) {
            if (previousLink === null) {
                return;
            }
            const currentDocument = context.getDocument();
            context.setDocument({
                ...currentDocument,
                interactionLinks: {
                    ...currentDocument.interactionLinks,
                    [previousLink.id]: cloneInteractionLink(previousLink)
                }
            });
        }
    };
}
