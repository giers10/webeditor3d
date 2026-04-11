import { createOpaqueId } from "../core/ids";
import {
  cloneSceneLoadingScreenSettings,
  type SceneLoadingScreenSettings
} from "../document/scene-document";

import type { EditorCommand } from "./command";

interface SetSceneLoadingScreenCommandOptions {
  sceneId: string;
  label: string;
  loadingScreen: SceneLoadingScreenSettings;
}

export function createSetSceneLoadingScreenCommand(
  options: SetSceneLoadingScreenCommandOptions
): EditorCommand {
  const nextLoadingScreen = cloneSceneLoadingScreenSettings(
    options.loadingScreen
  );
  let previousLoadingScreen: SceneLoadingScreenSettings | null = null;

  return {
    id: createOpaqueId("command"),
    label: options.label,
    execute(context) {
      const currentProjectDocument = context.getProjectDocument();
      const currentScene = currentProjectDocument.scenes[options.sceneId];

      if (currentScene === undefined) {
        throw new Error(
          `Cannot update loading overlay for missing scene ${options.sceneId}.`
        );
      }

      if (previousLoadingScreen === null) {
        previousLoadingScreen = cloneSceneLoadingScreenSettings(
          currentScene.loadingScreen
        );
      }

      context.setProjectDocument({
        ...currentProjectDocument,
        scenes: {
          ...currentProjectDocument.scenes,
          [options.sceneId]: {
            ...currentScene,
            loadingScreen: cloneSceneLoadingScreenSettings(nextLoadingScreen)
          }
        }
      });
    },
    undo(context) {
      if (previousLoadingScreen === null) {
        return;
      }

      const currentProjectDocument = context.getProjectDocument();
      const currentScene = currentProjectDocument.scenes[options.sceneId];

      if (currentScene === undefined) {
        throw new Error(
          `Cannot restore loading overlay for missing scene ${options.sceneId}.`
        );
      }

      context.setProjectDocument({
        ...currentProjectDocument,
        scenes: {
          ...currentProjectDocument.scenes,
          [options.sceneId]: {
            ...currentScene,
            loadingScreen: cloneSceneLoadingScreenSettings(
              previousLoadingScreen
            )
          }
        }
      });
    }
  };
}
