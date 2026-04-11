import type { ProjectDocument, SceneDocument } from "../document/scene-document";
import {
  migrateProjectDocument,
  migrateSceneDocument
} from "../document/migrate-scene-document";
import {
  assertProjectDocumentIsValid,
  assertSceneDocumentIsValid
} from "../document/scene-document-validation";

export function serializeSceneDocument(document: SceneDocument): string {
  assertSceneDocumentIsValid(document);
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

  const document = migrateSceneDocument(parsedValue);
  assertSceneDocumentIsValid(document);
  return document;
}

export function serializeProjectDocument(document: ProjectDocument): string {
  assertProjectDocumentIsValid(document);
  return JSON.stringify(document, null, 2);
}

export function parseProjectDocumentJson(source: string): ProjectDocument {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(source);
  } catch (error) {
    const cause =
      error instanceof Error ? error.message : "Unknown JSON parse failure.";
    throw new Error(`Project document JSON could not be parsed: ${cause}`);
  }

  const document = migrateProjectDocument(parsedValue);
  assertProjectDocumentIsValid(document);
  return document;
}
