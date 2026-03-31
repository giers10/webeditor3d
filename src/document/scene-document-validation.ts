import type { EntityInstance } from "../entities/entity-instances";
import { BOX_FACE_IDS, hasPositiveBoxSize } from "./brushes";
import type { SceneDocument } from "./scene-document";

export type SceneDiagnosticSeverity = "error" | "warning";
export type SceneDiagnosticScope = "document" | "build";

export interface SceneDiagnostic {
  code: string;
  severity: SceneDiagnosticSeverity;
  scope: SceneDiagnosticScope;
  message: string;
  path?: string;
}

export interface SceneDocumentValidationResult {
  diagnostics: SceneDiagnostic[];
  errors: SceneDiagnostic[];
  warnings: SceneDiagnostic[];
}

function createDiagnostic(
  severity: SceneDiagnosticSeverity,
  code: string,
  message: string,
  path?: string,
  scope: SceneDiagnosticScope = "document"
): SceneDiagnostic {
  return {
    code,
    severity,
    scope,
    message,
    path
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFiniteVec3(vector: { x: unknown; y: unknown; z: unknown }): boolean {
  return isFiniteNumber(vector.x) && isFiniteNumber(vector.y) && isFiniteNumber(vector.z);
}

function validatePlayerStartEntity(entity: EntityInstance, path: string, diagnostics: SceneDiagnostic[]) {
  if (!isFiniteVec3(entity.position)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-player-start-position", "Player Start position must remain finite on every axis.", `${path}.position`)
    );
  }

  if (!isFiniteNumber(entity.yawDegrees)) {
    diagnostics.push(createDiagnostic("error", "invalid-player-start-yaw", "Player Start yaw must remain a finite number.", `${path}.yawDegrees`));
  }
}

function registerAuthoredId(id: string, path: string, seenIds: Map<string, string>, diagnostics: SceneDiagnostic[]) {
  const previousPath = seenIds.get(id);

  if (previousPath !== undefined) {
    diagnostics.push(
      createDiagnostic("error", "duplicate-authored-id", `Duplicate authored id ${id} is already used at ${previousPath}.`, path)
    );
    return;
  }

  seenIds.set(id, path);
}

export function formatSceneDiagnostic(diagnostic: SceneDiagnostic): string {
  return diagnostic.path === undefined ? diagnostic.message : `${diagnostic.path}: ${diagnostic.message}`;
}

export function formatSceneDiagnosticSummary(diagnostics: SceneDiagnostic[], limit = 3): string {
  if (diagnostics.length === 0) {
    return "No diagnostics.";
  }

  const visibleDiagnostics = diagnostics.slice(0, Math.max(1, limit));
  const summary = visibleDiagnostics.map((diagnostic) => formatSceneDiagnostic(diagnostic)).join("; ");
  const remainingCount = diagnostics.length - visibleDiagnostics.length;

  return remainingCount > 0 ? `${summary}; +${remainingCount} more` : summary;
}

export function validateSceneDocument(document: SceneDocument): SceneDocumentValidationResult {
  const diagnostics: SceneDiagnostic[] = [];
  const seenIds = new Map<string, string>();

  for (const [materialKey, material] of Object.entries(document.materials)) {
    const path = `materials.${materialKey}`;

    if (material.id !== materialKey) {
      diagnostics.push(
        createDiagnostic("error", "material-id-mismatch", "Material ids must match their registry key.", `${path}.id`)
      );
    }

    registerAuthoredId(material.id, path, seenIds, diagnostics);
  }

  for (const [brushKey, brush] of Object.entries(document.brushes)) {
    const path = `brushes.${brushKey}`;

    if (brush.id !== brushKey) {
      diagnostics.push(createDiagnostic("error", "brush-id-mismatch", "Brush ids must match their registry key.", `${path}.id`));
    }

    registerAuthoredId(brush.id, path, seenIds, diagnostics);

    if (!isFiniteVec3(brush.size) || !hasPositiveBoxSize(brush.size)) {
      diagnostics.push(
        createDiagnostic("error", "invalid-box-size", "Box brush sizes must remain finite and positive on every axis.", `${path}.size`)
      );
    }

    for (const faceId of BOX_FACE_IDS) {
      const materialId = brush.faces[faceId].materialId;

      if (materialId !== null && document.materials[materialId] === undefined) {
        diagnostics.push(
          createDiagnostic(
            "error",
            "missing-material-ref",
            `Face material reference ${materialId} does not exist in the document material registry.`,
            `${path}.faces.${faceId}.materialId`
          )
        );
      }
    }
  }

  for (const [entityKey, entity] of Object.entries(document.entities)) {
    const path = `entities.${entityKey}`;

    if (entity.id !== entityKey) {
      diagnostics.push(createDiagnostic("error", "entity-id-mismatch", "Entity ids must match their registry key.", `${path}.id`));
    }

    registerAuthoredId(entity.id, path, seenIds, diagnostics);

    if (entity.kind === "playerStart") {
      validatePlayerStartEntity(entity, path, diagnostics);
      continue;
    }

    diagnostics.push(
      createDiagnostic(
        "error",
        "unsupported-entity-kind",
        `Unsupported entity kind ${(entity as { kind: string }).kind}.`,
        `${path}.kind`
      )
    );
  }

  return {
    diagnostics,
    errors: diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    warnings: diagnostics.filter((diagnostic) => diagnostic.severity === "warning")
  };
}

export function assertSceneDocumentIsValid(document: SceneDocument) {
  const validation = validateSceneDocument(document);

  if (validation.errors.length > 0) {
    throw new Error(`Scene document has ${validation.errors.length} validation error(s): ${formatSceneDiagnosticSummary(validation.errors)}`);
  }
}
