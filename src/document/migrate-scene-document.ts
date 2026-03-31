import { BOX_FACE_IDS, createBoxBrush, isBoxFaceId, type BoxBrushFaces, type BrushFace } from "./brushes";
import {
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

function expectEmptyCollection(value: unknown, label: string): Record<string, never> {
  if (!isRecord(value)) {
    throw new Error(`${label} must be a record.`);
  }

  if (Object.keys(value).length > 0) {
    throw new Error(`${label} must be empty in the foundation schema.`);
  }

  return {};
}

function expectOptionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return expectString(value, label);
}

function expectBrushFace(value: unknown, label: string): BrushFace {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const materialId = value.materialId;

  if (materialId !== null && materialId !== undefined && typeof materialId !== "string") {
    throw new Error(`${label}.materialId must be a string or null.`);
  }

  return {
    materialId: materialId ?? null
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

function readBoxBrushFaces(value: unknown, label: string): BoxBrushFaces {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const extraFaceKeys = Object.keys(value).filter((faceId) => !isBoxFaceId(faceId));

  if (extraFaceKeys.length > 0) {
    throw new Error(`${label} contains unsupported face ids: ${extraFaceKeys.join(", ")}.`);
  }

  return {
    posX: expectBrushFace(value.posX, `${label}.posX`),
    negX: expectBrushFace(value.negX, `${label}.negX`),
    posY: expectBrushFace(value.posY, `${label}.posY`),
    negY: expectBrushFace(value.negY, `${label}.negY`),
    posZ: expectBrushFace(value.posZ, `${label}.posZ`),
    negZ: expectBrushFace(value.negZ, `${label}.negZ`)
  };
}

function readBrushes(value: unknown): SceneDocument["brushes"] {
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
      faces: readBoxBrushFaces(brushValue.faces, `brushes.${brushId}.faces`),
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
      materials: expectEmptyCollection(source.materials, "materials"),
      textures: expectEmptyCollection(source.textures, "textures"),
      assets: expectEmptyCollection(source.assets, "assets"),
      brushes: {},
      modelInstances: expectEmptyCollection(source.modelInstances, "modelInstances"),
      entities: expectEmptyCollection(source.entities, "entities"),
      interactionLinks: expectEmptyCollection(source.interactionLinks, "interactionLinks")
    };
  }

  if (source.version !== SCENE_DOCUMENT_VERSION) {
    throw new Error(`Unsupported scene document version: ${String(source.version)}.`);
  }

  return {
    version: SCENE_DOCUMENT_VERSION,
    name: expectString(source.name, "name"),
    world: readWorldSettings(source.world),
    materials: expectEmptyCollection(source.materials, "materials"),
    textures: expectEmptyCollection(source.textures, "textures"),
    assets: expectEmptyCollection(source.assets, "assets"),
    brushes: readBrushes(source.brushes),
    modelInstances: expectEmptyCollection(source.modelInstances, "modelInstances"),
    entities: expectEmptyCollection(source.entities, "entities"),
    interactionLinks: expectEmptyCollection(source.interactionLinks, "interactionLinks")
  };
}
