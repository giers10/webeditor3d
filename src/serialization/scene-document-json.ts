import type { SceneDocument } from "../document/scene-document";
import { migrateSceneDocument } from "../document/migrate-scene-document";

export function serializeSceneDocument(document: SceneDocument): string {
  return JSON.stringify(document, null, 2);
}

export function parseSceneDocumentJson(source: string): SceneDocument {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(source);
  } catch (error) {
    const cause = error instanceof Error ? error.message : "Unknown JSON parse failure.";
    throw new Error(`Scene document JSON could not be parsed: ${cause}`);
  }

  return migrateSceneDocument(parsedValue);
}
