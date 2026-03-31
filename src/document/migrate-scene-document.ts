import { createStarterMaterialRegistry, type MaterialDef, type MaterialPattern } from "../materials/starter-material-library";
import {
  createInteractableEntity,
  createPlayerStartEntity,
  createSoundEmitterEntity,
  createTeleportTargetEntity,
  createTriggerVolumeEntity,
  type EntityInstance
} from "../entities/entity-instances";
import {
  createBoxBrush,
  createDefaultFaceUvState,
  isBoxFaceId,
  isFaceUvRotationQuarterTurns,
  normalizeBrushName,
  type BoxBrushFaces,
  type BrushFace,
  type FaceUvState
} from "./brushes";
import {
  BOX_BRUSH_SCENE_DOCUMENT_VERSION,
  FACE_MATERIALS_SCENE_DOCUMENT_VERSION,
  FIRST_ROOM_POLISH_SCENE_DOCUMENT_VERSION,
  FOUNDATION_SCENE_DOCUMENT_VERSION,
  RUNNER_V1_SCENE_DOCUMENT_VERSION,
  SCENE_DOCUMENT_VERSION,
  WORLD_ENVIRONMENT_SCENE_DOCUMENT_VERSION,
  type SceneDocument
} from "./scene-document";
import { isWorldBackgroundMode, type WorldBackgroundSettings, type WorldSettings } from "./world-settings";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }

  return value;
}

function expectNonNegativeFiniteNumber(value: unknown, label: string): number {
  const numberValue = expectFiniteNumber(value, label);

  if (numberValue < 0) {
    throw new Error(`${label} must be zero or greater.`);
  }

  return numberValue;
}

function expectPositiveFiniteNumber(value: unknown, label: string): number {
  const numberValue = expectFiniteNumber(value, label);

  if (numberValue <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return numberValue;
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

function readOptionalBrushName(value: unknown, label: string): string | undefined {
  return normalizeBrushName(expectOptionalString(value, label));
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

function assertNonZeroVec3(vector: { x: number; y: number; z: number }, label: string) {
  if (vector.x === 0 && vector.y === 0 && vector.z === 0) {
    throw new Error(`${label} must not be the zero vector.`);
  }
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
      name: readOptionalBrushName(brushValue.name, `brushes.${brushId}.name`),
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

  const direction = readVec3(sunLight.direction, "world.sunLight.direction");
  assertNonZeroVec3(direction, "world.sunLight.direction");

  const backgroundMode = expectString(background.mode, "world.background.mode");
  let resolvedBackground: WorldBackgroundSettings;

  if (!isWorldBackgroundMode(backgroundMode)) {
    throw new Error("world.background.mode must be a supported background mode.");
  }

  if (backgroundMode === "solid") {
    resolvedBackground = {
      mode: "solid",
      colorHex: expectHexColor(background.colorHex, "world.background.colorHex")
    };
  } else {
    resolvedBackground = {
      mode: "verticalGradient",
      topColorHex: expectHexColor(background.topColorHex, "world.background.topColorHex"),
      bottomColorHex: expectHexColor(background.bottomColorHex, "world.background.bottomColorHex")
    };
  }

  return {
    background: resolvedBackground,
    ambientLight: {
      colorHex: expectHexColor(ambientLight.colorHex, "world.ambientLight.colorHex"),
      intensity: expectNonNegativeFiniteNumber(ambientLight.intensity, "world.ambientLight.intensity")
    },
    sunLight: {
      colorHex: expectHexColor(sunLight.colorHex, "world.sunLight.colorHex"),
      intensity: expectNonNegativeFiniteNumber(sunLight.intensity, "world.sunLight.intensity"),
      direction
    }
  };
}

function readPlayerStartEntity(value: unknown, label: string): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(value.kind, "playerStart", `${label}.kind`);
  const entity = createPlayerStartEntity({
    id: expectString(value.id, `${label}.id`),
    position: readVec3(value.position, `${label}.position`),
    yawDegrees: expectFiniteNumber(value.yawDegrees, `${label}.yawDegrees`)
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be playerStart.`);
  }

  return entity;
}

function readSoundEmitterEntity(value: unknown, label: string): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(value.kind, "soundEmitter", `${label}.kind`);
  const entity = createSoundEmitterEntity({
    id: expectString(value.id, `${label}.id`),
    position: readVec3(value.position, `${label}.position`),
    radius: expectPositiveFiniteNumber(value.radius, `${label}.radius`),
    gain: expectNonNegativeFiniteNumber(value.gain, `${label}.gain`),
    autoplay: expectBoolean(value.autoplay, `${label}.autoplay`),
    loop: expectBoolean(value.loop, `${label}.loop`)
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be soundEmitter.`);
  }

  return entity;
}

function readTriggerVolumeEntity(value: unknown, label: string): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(value.kind, "triggerVolume", `${label}.kind`);
  const size = readVec3(value.size, `${label}.size`);

  if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
    throw new Error(`${label}.size values must be positive.`);
  }

  const entity = createTriggerVolumeEntity({
    id: expectString(value.id, `${label}.id`),
    position: readVec3(value.position, `${label}.position`),
    size,
    triggerOnEnter: expectBoolean(value.triggerOnEnter, `${label}.triggerOnEnter`),
    triggerOnExit: expectBoolean(value.triggerOnExit, `${label}.triggerOnExit`)
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be triggerVolume.`);
  }

  return entity;
}

function readTeleportTargetEntity(value: unknown, label: string): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(value.kind, "teleportTarget", `${label}.kind`);
  const entity = createTeleportTargetEntity({
    id: expectString(value.id, `${label}.id`),
    position: readVec3(value.position, `${label}.position`),
    yawDegrees: expectFiniteNumber(value.yawDegrees, `${label}.yawDegrees`)
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be teleportTarget.`);
  }

  return entity;
}

function readInteractableEntity(value: unknown, label: string): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = expectLiteralString(value.kind, "interactable", `${label}.kind`);
  const entity = createInteractableEntity({
    id: expectString(value.id, `${label}.id`),
    position: readVec3(value.position, `${label}.position`),
    radius: expectPositiveFiniteNumber(value.radius, `${label}.radius`),
    prompt: expectString(value.prompt, `${label}.prompt`),
    enabled: expectBoolean(value.enabled, `${label}.enabled`)
  });

  if (entity.kind !== kind) {
    throw new Error(`${label}.kind must be interactable.`);
  }

  return entity;
}

function readEntityInstance(value: unknown, label: string): EntityInstance {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  switch (value.kind) {
    case "playerStart":
      return readPlayerStartEntity(value, label);
    case "soundEmitter":
      return readSoundEmitterEntity(value, label);
    case "triggerVolume":
      return readTriggerVolumeEntity(value, label);
    case "teleportTarget":
      return readTeleportTargetEntity(value, label);
    case "interactable":
      return readInteractableEntity(value, label);
    default:
      throw new Error(`${label}.kind must be a supported entity type.`);
  }
}

function readEntities(value: unknown): SceneDocument["entities"] {
  if (!isRecord(value)) {
    throw new Error("entities must be a record.");
  }

  const entities: SceneDocument["entities"] = {};

  for (const [entityId, entityValue] of Object.entries(value)) {
    if (!isRecord(entityValue)) {
      throw new Error(`entities.${entityId} must be an object.`);
    }

    const entity = readEntityInstance(entityValue, `entities.${entityId}`);

    if (entity.id !== entityId) {
      throw new Error(`entities.${entityId}.id must match the registry key.`);
    }

    entities[entityId] = entity;
  }

  return entities;
}

export function migrateSceneDocument(source: unknown): SceneDocument {
  if (!isRecord(source)) {
    throw new Error("Scene document must be a JSON object.");
  }

  if (source.version === FOUNDATION_SCENE_DOCUMENT_VERSION) {
    expectEmptyCollection(source.materials, "materials");
    expectEmptyCollection(source.brushes, "brushes");

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
    expectEmptyCollection(source.materials, "materials");
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

  if (source.version === FACE_MATERIALS_SCENE_DOCUMENT_VERSION) {
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

  if (source.version === RUNNER_V1_SCENE_DOCUMENT_VERSION) {
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
      entities: readEntities(source.entities),
      interactionLinks: expectEmptyCollection(source.interactionLinks, "interactionLinks")
    };
  }

  if (source.version === FIRST_ROOM_POLISH_SCENE_DOCUMENT_VERSION) {
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
      entities: readEntities(source.entities),
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
    entities: readEntities(source.entities),
    interactionLinks: expectEmptyCollection(source.interactionLinks, "interactionLinks")
  };
}
