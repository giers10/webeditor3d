import type { LoadedModelAsset } from "../assets/gltf-model-import";
import { getModelInstances } from "../assets/model-instances";
import type { BoxBrush } from "../document/brushes";
import type { SceneDocument } from "../document/scene-document";
import {
  assertSceneDocumentIsValid,
  createDiagnostic,
  formatSceneDiagnosticSummary,
  type SceneDiagnostic
} from "../document/scene-document-validation";
import { getPrimaryPlayerStartEntity } from "../entities/entity-instances";
import { validateBoxBrushGeometry } from "../geometry/box-brush-mesh";
import { buildGeneratedModelCollider, ModelColliderGenerationError } from "../geometry/model-instance-collider-generation";

export interface RuntimeSceneBuildValidationResult {
  diagnostics: SceneDiagnostic[];
  errors: SceneDiagnostic[];
  warnings: SceneDiagnostic[];
}

interface ValidateRuntimeSceneBuildOptions {
  navigationMode: "firstPerson" | "thirdPerson";
  loadedModelAssets?: Record<string, LoadedModelAsset>;
}

function validateBrushGeometry(brush: BoxBrush, path: string, diagnostics: SceneDiagnostic[]) {
  for (const diagnostic of validateBoxBrushGeometry(brush)) {
    diagnostics.push(createDiagnostic("error", diagnostic.code, diagnostic.message, `${path}.geometry`, "build"));
  }
}

export function validateRuntimeSceneBuild(
  document: SceneDocument,
  options: ValidateRuntimeSceneBuildOptions
): RuntimeSceneBuildValidationResult {
  const diagnostics: SceneDiagnostic[] = [];

  if (options.navigationMode === "firstPerson" && getPrimaryPlayerStartEntity(document.entities) === null) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "missing-player-start",
        "First-person run requires an authored Player Start. Place one or switch to Third Person.",
        "entities",
        "build"
      )
    );
  }

  for (const brush of Object.values(document.brushes)) {
    validateBrushGeometry(brush, `brushes.${brush.id}`, diagnostics);
  }

  for (const modelInstance of getModelInstances(document.modelInstances)) {
    const path = `modelInstances.${modelInstance.id}.collision.mode`;
    const asset = document.assets[modelInstance.assetId];

    if (modelInstance.collision.mode === "none" || asset === undefined || asset.kind !== "model") {
      continue;
    }

    try {
      const generatedCollider = buildGeneratedModelCollider(modelInstance, asset, options.loadedModelAssets?.[modelInstance.assetId]);

      if (generatedCollider?.mode === "dynamic") {
        diagnostics.push(
          createDiagnostic(
            "warning",
            "dynamic-model-collider-fixed-query-only",
            "Dynamic model collision currently generates convex compound pieces for Rapier queries, but the runner still uses them as fixed world collision rather than fully simulated rigid bodies.",
            path,
            "build"
          )
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Imported model collision generation failed.";
      const code =
        error instanceof ModelColliderGenerationError
          ? error.code
          : "invalid-model-instance-collision-mode";

      diagnostics.push(createDiagnostic("error", code, message, path, "build"));
    }
  }

  return {
    diagnostics,
    errors: diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    warnings: diagnostics.filter((diagnostic) => diagnostic.severity === "warning")
  };
}

export function assertRuntimeSceneBuildable(document: SceneDocument, options: ValidateRuntimeSceneBuildOptions) {
  assertSceneDocumentIsValid(document);

  const validation = validateRuntimeSceneBuild(document, options);

  if (validation.errors.length > 0) {
    throw new Error(`Runtime build is blocked: ${formatSceneDiagnosticSummary(validation.errors)}`);
  }
}
