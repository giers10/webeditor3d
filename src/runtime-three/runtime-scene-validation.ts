import type { SceneDocument } from "../document/scene-document";
import {
  assertSceneDocumentIsValid,
  createDiagnostic,
  formatSceneDiagnosticSummary,
  type SceneDiagnostic
} from "../document/scene-document-validation";
import { getPrimaryPlayerStartEntity } from "../entities/entity-instances";

export interface RuntimeSceneBuildValidationResult {
  diagnostics: SceneDiagnostic[];
  errors: SceneDiagnostic[];
  warnings: SceneDiagnostic[];
}

export function validateRuntimeSceneBuild(
  document: SceneDocument,
  navigationMode: "firstPerson" | "orbitVisitor"
): RuntimeSceneBuildValidationResult {
  const diagnostics: SceneDiagnostic[] = [];

  if (navigationMode === "firstPerson" && getPrimaryPlayerStartEntity(document.entities) === null) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "missing-player-start",
        "First-person run requires an authored Player Start. Place one or switch to Orbit Visitor.",
        "entities",
        "build"
      )
    );
  }

  return {
    diagnostics,
    errors: diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    warnings: diagnostics.filter((diagnostic) => diagnostic.severity === "warning")
  };
}

export function assertRuntimeSceneBuildable(document: SceneDocument, navigationMode: "firstPerson" | "orbitVisitor") {
  assertSceneDocumentIsValid(document);

  const validation = validateRuntimeSceneBuild(document, navigationMode);

  if (validation.errors.length > 0) {
    throw new Error(`Runtime build is blocked: ${formatSceneDiagnosticSummary(validation.errors)}`);
  }
}
