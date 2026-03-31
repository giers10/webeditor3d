import { cloneInteractionLink } from "../interactions/interaction-links";
import { createOpaqueId } from "../core/ids";

import type { EditorCommand } from "./command";

interface UpsertInteractionLinkCommandOptions {
  link: ReturnType<typeof cloneInteractionLink>;
  label?: string;
}

export function createUpsertInteractionLinkCommand(options: UpsertInteractionLinkCommandOptions): EditorCommand {
  const nextLink = cloneInteractionLink(options.link);
  let previousLink = null as typeof nextLink | null;

  return {
    id: createOpaqueId("command"),
    label: options.label ?? "Update interaction link",
    execute(context) {
      const currentDocument = context.getDocument();
      const currentLink = currentDocument.interactionLinks[nextLink.id];

      if (previousLink === null && currentLink !== undefined) {
        previousLink = cloneInteractionLink(currentLink);
      }

      context.setDocument({
        ...currentDocument,
        interactionLinks: {
          ...currentDocument.interactionLinks,
          [nextLink.id]: cloneInteractionLink(nextLink)
        }
      });
    },
    undo(context) {
      const currentDocument = context.getDocument();
      const nextInteractionLinks = {
        ...currentDocument.interactionLinks
      };

      if (previousLink === null) {
        delete nextInteractionLinks[nextLink.id];
      } else {
        nextInteractionLinks[nextLink.id] = cloneInteractionLink(previousLink);
      }

      context.setDocument({
        ...currentDocument,
        interactionLinks: nextInteractionLinks
      });
    }
  };
}
