import { SCENE_DOCUMENT_VERSION, type SceneDocument, type WorldSettings } from "./scene-document";

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
    brushes: expectEmptyCollection(source.brushes, "brushes"),
    modelInstances: expectEmptyCollection(source.modelInstances, "modelInstances"),
    entities: expectEmptyCollection(source.entities, "entities"),
    interactionLinks: expectEmptyCollection(source.interactionLinks, "interactionLinks")
  };
}
