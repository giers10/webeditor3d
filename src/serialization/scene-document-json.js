import { migrateSceneDocument } from "../document/migrate-scene-document";
import { assertSceneDocumentIsValid } from "../document/scene-document-validation";
export function serializeSceneDocument(document) {
    assertSceneDocumentIsValid(document);
    return JSON.stringify(document, null, 2);
}
export function parseSceneDocumentJson(source) {
    let parsedValue;
    try {
        parsedValue = JSON.parse(source);
    }
    catch (error) {
        const cause = error instanceof Error ? error.message : "Unknown JSON parse failure.";
        throw new Error(`Scene document JSON could not be parsed: ${cause}`);
    }
    const document = migrateSceneDocument(parsedValue);
    assertSceneDocumentIsValid(document);
    return document;
}
