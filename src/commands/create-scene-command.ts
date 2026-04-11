import { createOpaqueId } from "../core/ids";
import { createEmptyProjectScene } from "../document/scene-document";

import type { EditorCommand } from "./command";

function createUniqueSceneName(existingNames: string[]): string {
  const normalizedNames = new Set(
    existingNames.map((name) => name.trim().toLowerCase())
  );
  let suffix = existingNames.length + 1;

  while (normalizedNames.has(`scene ${suffix}`)) {
    suffix += 1;
  }

  return `Scene ${suffix}`;
}

export function createCreateSceneCommand(): EditorCommand {
  const createdSceneId = createOpaqueId("scene");
  let createdSceneName: string | null = null;
  let previousProjectDocumentSerialized: string | null = null;

  return {
    id: createOpaqueId("command"),
    label: "Create scene",
    execute(context) {
      const currentProjectDocument = context.getProjectDocument();

      if (previousProjectDocumentSerialized === null) {
        previousProjectDocumentSerialized = JSON.stringify(currentProjectDocument);
      }

      if (createdSceneName === null) {
        createdSceneName = createUniqueSceneName(
          Object.values(currentProjectDocument.scenes).map((scene) => scene.name)
        );
      }

      context.setProjectDocument({
        ...currentProjectDocument,
        activeSceneId: createdSceneId,
        scenes: {
          ...currentProjectDocument.scenes,
          [createdSceneId]: createEmptyProjectScene({
            id: createdSceneId,
            name: createdSceneName
          })
        }
      });
      context.setSelection({ kind: "none" });
      context.setToolMode("select");
    },
    undo(context) {
      if (previousProjectDocumentSerialized === null) {
        return;
      }

      context.setProjectDocument(
        JSON.parse(previousProjectDocumentSerialized) as ReturnType<
          typeof context.getProjectDocument
        >
      );
      context.setSelection({ kind: "none" });
      context.setToolMode("select");
    }
  };
}
