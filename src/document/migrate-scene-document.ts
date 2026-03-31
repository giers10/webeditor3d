import { createStarterMaterialRegistry, type MaterialDef, type MaterialPattern } from "../materials/starter-material-library";
import {
  createBoxBrush,
  createDefaultFaceUvState,
  isBoxFaceId,
  isFaceUvRotationQuarterTurns,
  type BoxBrushFaces,
  type BrushFace,
  type FaceUvState
} from "./brushes";
import {
  BOX_BRUSH_SCENE_DOCUMENT_VERSION,
  FOUNDATION_SCENE_DOCUMENT_VERSION,
  SCENE_DOCUMENT_VERSION,
  type SceneDocument,
  type WorldSettings
} from "./scene-document";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }

  return value;
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string.`);
  }

  return value;
}

function expectBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean.`);
  }

  return value;
}

function expectStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${label} must be a string array.`);
  }

  return [...value];
}

function expectHexColor(value: unknown, label: string): string {
  const normalizedValue = expectString(value, label);

  if (!/^#[0-9a-f]{6}$/i.test(normalizedValue)) {
    throw new Error(`${label} must use #RRGGBB format.`);
  }

  return normalizedValue;
}

function expectLiteralString<T extends string>(value: unknown, expectedValue: T, label: string): T {
  if (value !== expectedValue) {
    throw new Error(`${label} must be ${expectedValue}.`);
  }

  return expectedValue;
}

function expectOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return expectString(value, label);
}

function expectEmptyCollection(value: unknown, label: string): Record<string, never> {
  if (!isRecord(value)) {
    throw new Error(`${label} must be a record.`);
  }

  if (Object.keys(value).length > 0) {
    throw new Error(`${label} must be empty in the current schema.`);
  }

  return {};
}

function readVec2(value: unknown, label: string) {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return {
    x: expectFiniteNumber(value.x, `${label}.x`),
    y: expectFiniteNumber(value.y, `${label}.y`)
  };
}

function readVec3(value: unknown, label: string) {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return {
    x: expectFiniteNumber(value.x, `${label}.x`),
    y: expectFiniteNumber(value.y, `${label}.y`),
    z: expectFiniteNumber(value.z, `${label}.z`)
  };
}

function expectMaterialPattern(value: unknown, label: string): MaterialPattern {
  if (value !== "grid" && value !== "checker" && value !== "stripes" && value !== "diamond") {
    throw new Error(`${label} must be a supported starter material pattern.`);
  }

  return value;
}

function readMaterialRegistry(value: unknown, label: string): SceneDocument["materials"] {
  if (!isRecord(value)) {
    throw new Error(`${label} must be a record.`);
  }

  const materials: SceneDocument["materials"] = {};

  for (const [materialId, materialValue] of Object.entries(value)) {
    if (!isRecord(materialValue)) {
      throw new Error(`${label}.${materialId} must be an object.`);
    }

    const material: MaterialDef = {
      id: expectString(materialValue.id, `${label}.${materialId}.id`),
      name: expectString(materialValue.name, `${label}.${materialId}.name`),
      baseColorHex: expectHexColor(materialValue.baseColorHex, `${label}.${materialId}.baseColorHex`),
      accentColorHex: expectHexColor(materialValue.accentColorHex, `${label}.${materialId}.accentColorHex`),
      pattern: expectMaterialPattern(materialValue.pattern, `${label}.${materialId}.pattern`),
      tags: expectStringArray(materialValue.tags, `${label}.${materialId}.tags`)
    };

    if (material.id !== materialId) {
      throw new Error(`${label}.${materialId}.id must match the registry key.`);
    }

    materials[materialId] = material;
  }

  return materials;
}

function readFaceUvState(value: unknown, label: string): FaceUvState {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const rotationQuarterTurns = expectFiniteNumber(value.rotationQuarterTurns, `${label}.rotationQuarterTurns`);

  if (!isFaceUvRotationQuarterTurns(rotationQuarterTurns)) {
    throw new Error(`${label}.rotationQuarterTurns must be 0, 1, 2, or 3.`);
  }

  const scale = readVec2(value.scale, `${label}.scale`);

  if (scale.x <= 0 || scale.y <= 0) {
    throw new Error(`${label}.scale values must remain positive.`);
  }

  return {
    offset: readVec2(value.offset, `${label}.offset`),
    scale,
    rotationQuarterTurns,
    flipU: expectBoolean(value.flipU, `${label}.flipU`),
    flipV: expectBoolean(value.flipV, `${label}.flipV`)
  };
}

function readBrushFace(
  value: unknown,
  label: string,
  materials: SceneDocument["materials"],
  allowMissingUvState: boolean
): BrushFace {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const materialId = value.materialId;

  if (materialId !== null && materialId !== undefined && typeof materialId !== "string") {
    throw new Error(`${label}.materialId must be a string or null.`);
  }

  if (materialId !== null && materialId !== undefined && materials[materialId] === undefined) {
    throw new Error(`${label}.materialId references missing material ${materialId}.`);
  }

  return {
    materialId: materialId ?? null,
    uv:
      value.uv === undefined && allowMissingUvState
        ? createDefaultFaceUvState()
        : readFaceUvState(value.uv, `${label}.uv`)
  };
}

function readBoxBrushFaces(
  value: unknown,
  label: string,
  materials: SceneDocument["materials"],
  allowMissingUvState: boolean
): BoxBrushFaces {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const extraFaceKeys = Object.keys(value).filter((faceId) => !isBoxFaceId(faceId));

  if (extraFaceKeys.length > 0) {
    throw new Error(`${label} contains unsupported face ids: ${extraFaceKeys.join(", ")}.`);
  }

  return {
    posX: readBrushFace(value.posX, `${label}.posX`, materials, allowMissingUvState),
    negX: readBrushFace(value.negX, `${label}.negX`, materials, allowMissingUvState),
    posY: readBrushFace(value.posY, `${label}.posY`, materials, allowMissingUvState),
    negY: readBrushFace(value.negY, `${label}.negY`, materials, allowMissingUvState),
    posZ: readBrushFace(value.posZ, `${label}.posZ`, materials, allowMissingUvState),
    negZ: readBrushFace(value.negZ, `${label}.negZ`, materials, allowMissingUvState)
  };
}

function readBrushes(
  value: unknown,
  materials: SceneDocument["materials"],
  allowMissingUvState: boolean
): SceneDocument["brushes"] {
  if (!isRecord(value)) {
    throw new Error("brushes must be a record.");
  }

  const brushes: SceneDocument["brushes"] = {};

  for (const [brushId, brushValue] of Object.entries(value)) {
    if (!isRecord(brushValue)) {
      throw new Error(`brushes.${brushId} must be an object.`);
    }

    if (brushValue.kind !== "box") {
      throw new Error(`brushes.${brushId}.kind must be box.`);
    }

    const center = readVec3(brushValue.center, `brushes.${brushId}.center`);
    const size = readVec3(brushValue.size, `brushes.${brushId}.size`);

    if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
      throw new Error(`brushes.${brushId}.size values must be positive.`);
    }

    brushes[brushId] = createBoxBrush({
      id: expectString(brushValue.id, `brushes.${brushId}.id`),
      center,
      size,
      faces: readBoxBrushFaces(brushValue.faces, `brushes.${brushId}.faces`, materials, allowMissingUvState),
      layerId: expectOptionalString(brushValue.layerId, `brushes.${brushId}.layerId`),
      groupId: expectOptionalString(brushValue.groupId, `brushes.${brushId}.groupId`)
    });
  }

  return brushes;
}

function readWorldSettings(value: unknown): WorldSettings {
  if (!isRecord(value)) {
    throw new Error("world must be an object.");
  }

  const background = value.background;
  const ambientLight = value.ambientLight;
  const sunLight = value.sunLight;

  if (!isRecord(background)) {
    throw new Error("world.background must be an object.");
  }

  if (!isRecord(ambientLight)) {
    throw new Error("world.ambientLight must be an object.");
  }

  if (!isRecord(sunLight)) {
    throw new Error("world.sunLight must be an object.");
  }

  const direction = sunLight.direction;

  if (!isRecord(direction)) {
    throw new Error("world.sunLight.direction must be an object.");
  }

  return {
    background: {
      mode: expectLiteralString(background.mode, "solid", "world.background.mode"),
      colorHex: expectHexColor(background.colorHex, "world.background.colorHex")
    },
    ambientLight: {
      colorHex: expectHexColor(ambientLight.colorHex, "world.ambientLight.colorHex"),
      intensity: expectFiniteNumber(ambientLight.intensity, "world.ambientLight.intensity")
    },
    sunLight: {
      colorHex: expectHexColor(sunLight.colorHex, "world.sunLight.colorHex"),
      intensity: expectFiniteNumber(sunLight.intensity, "world.sunLight.intensity"),
      direction: {
        x: expectFiniteNumber(direction.x, "world.sunLight.direction.x"),
        y: expectFiniteNumber(direction.y, "world.sunLight.direction.y"),
        z: expectFiniteNumber(direction.z, "world.sunLight.direction.z")
      }
    }
  };
}

export function migrateSceneDocument(source: unknown): SceneDocument {
  if (!isRecord(source)) {
    throw new Error("Scene document must be a JSON object.");
  }

  if (source.version === FOUNDATION_SCENE_DOCUMENT_VERSION) {
    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials: createStarterMaterialRegistry(),
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: {},
      modelInstances: expectEmptyCollection(source.modelInstances, "modelInstances"),
      entities: expectEmptyCollection(source.entities, "entities"),
      interactionLinks: expectEmptyCollection(source.interactionLinks, "interactionLinks")
    };
  }

  if (source.version === BOX_BRUSH_SCENE_DOCUMENT_VERSION) {
    const materials = createStarterMaterialRegistry();

    return {
      version: SCENE_DOCUMENT_VERSION,
      name: expectString(source.name, "name"),
      world: readWorldSettings(source.world),
      materials,
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: readBrushes(source.brushes, materials, true),
      modelInstances: expectEmptyCollection(source.modelInstances, "modelInstances"),
      entities: expectEmptyCollection(source.entities, "entities"),
      interactionLinks: expectEmptyCollection(source.interactionLinks, "interactionLinks")
    };
  }

  if (source.version !== SCENE_DOCUMENT_VERSION) {
    throw new Error(`Unsupported scene document version: ${String(source.version)}.`);
  }

  const materials = readMaterialRegistry(source.materials, "materials");

  return {
    version: SCENE_DOCUMENT_VERSION,
    name: expectString(source.name, "name"),
    world: readWorldSettings(source.world),
    materials,
    textures: expectEmptyCollection(source.textures, "textures"),
    assets: expectEmptyCollection(source.assets, "assets"),
    brushes: readBrushes(source.brushes, materials, false),
    modelInstances: expectEmptyCollection(source.modelInstances, "modelInstances"),
    entities: expectEmptyCollection(source.entities, "entities"),
    interactionLinks: expectEmptyCollection(source.interactionLinks, "interactionLinks")
  };
}
