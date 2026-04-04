import { createOpaqueId } from "../core/ids";
import type { Vec3 } from "../core/vector";
import type { ModelAssetRecord } from "./project-assets";

export const MODEL_INSTANCE_COLLISION_MODES = ["none", "terrain", "static", "dynamic", "simple"] as const;

export type ModelInstanceCollisionMode = (typeof MODEL_INSTANCE_COLLISION_MODES)[number];

export interface ModelInstanceCollisionSettings {
  mode: ModelInstanceCollisionMode;
  visible: boolean;
}

export interface ModelInstance {
  id: string;
  kind: "modelInstance";
  assetId: string;
  name?: string;
  position: Vec3;
  rotationDegrees: Vec3;
  scale: Vec3;
  collision: ModelInstanceCollisionSettings;
  animationClipName?: string;
  animationAutoplay?: boolean;
}

export const DEFAULT_MODEL_INSTANCE_POSITION: Vec3 = {
  x: 0,
  y: 0,
  z: 0
};

export const DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES: Vec3 = {
  x: 0,
  y: 0,
  z: 0
};

export const DEFAULT_MODEL_INSTANCE_SCALE: Vec3 = {
  x: 1,
  y: 1,
  z: 1
};

export const DEFAULT_MODEL_INSTANCE_COLLISION_SETTINGS: ModelInstanceCollisionSettings = {
  mode: "none",
  visible: false
};

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function areVec3Equal(left: Vec3, right: Vec3): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

export function isModelInstanceCollisionMode(value: unknown): value is ModelInstanceCollisionMode {
  return MODEL_INSTANCE_COLLISION_MODES.includes(value as ModelInstanceCollisionMode);
}

export function createModelInstanceCollisionSettings(
  overrides: Partial<ModelInstanceCollisionSettings> = {}
): ModelInstanceCollisionSettings {
  const mode = overrides.mode ?? DEFAULT_MODEL_INSTANCE_COLLISION_SETTINGS.mode;

  if (!isModelInstanceCollisionMode(mode)) {
    throw new Error("Model instance collision mode must be a supported value.");
  }

  const visible = overrides.visible ?? DEFAULT_MODEL_INSTANCE_COLLISION_SETTINGS.visible;

  if (typeof visible !== "boolean") {
    throw new Error("Model instance collision visibility must be a boolean.");
  }

  return {
    mode,
    visible
  };
}

export function cloneModelInstanceCollisionSettings(settings: ModelInstanceCollisionSettings): ModelInstanceCollisionSettings {
  return createModelInstanceCollisionSettings(settings);
}

export function areModelInstanceCollisionSettingsEqual(left: ModelInstanceCollisionSettings, right: ModelInstanceCollisionSettings): boolean {
  return left.mode === right.mode && left.visible === right.visible;
}

export function normalizeModelInstanceName(name: string | null | undefined): string | undefined {
  if (name === undefined || name === null) {
    return undefined;
  }

  const trimmedName = name.trim();
  return trimmedName.length === 0 ? undefined : trimmedName;
}

function assertFiniteVec3(vector: Vec3, label: string) {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z)) {
    throw new Error(`${label} must be finite on every axis.`);
  }
}

function assertPositiveFiniteVec3(vector: Vec3, label: string) {
  assertFiniteVec3(vector, label);

  if (vector.x <= 0 || vector.y <= 0 || vector.z <= 0) {
    throw new Error(`${label} must remain positive on every axis.`);
  }
}

export function createModelInstance(
  overrides: Partial<
    Pick<ModelInstance, "id" | "name" | "position" | "rotationDegrees" | "scale" | "collision" | "animationClipName" | "animationAutoplay">
  > &
    Pick<ModelInstance, "assetId">
): ModelInstance {
  const position = cloneVec3(overrides.position ?? DEFAULT_MODEL_INSTANCE_POSITION);
  const rotationDegrees = cloneVec3(overrides.rotationDegrees ?? DEFAULT_MODEL_INSTANCE_ROTATION_DEGREES);
  const scale = cloneVec3(overrides.scale ?? DEFAULT_MODEL_INSTANCE_SCALE);
  const collision = cloneModelInstanceCollisionSettings(overrides.collision ?? DEFAULT_MODEL_INSTANCE_COLLISION_SETTINGS);

  if (overrides.assetId.trim().length === 0) {
    throw new Error("Model instance assetId must be a non-empty string.");
  }

  assertFiniteVec3(position, "Model instance position");
  assertFiniteVec3(rotationDegrees, "Model instance rotation");
  assertPositiveFiniteVec3(scale, "Model instance scale");

  return {
    id: overrides.id ?? createOpaqueId("model-instance"),
    kind: "modelInstance",
    assetId: overrides.assetId,
    name: normalizeModelInstanceName(overrides.name),
    position,
    rotationDegrees,
    scale,
    collision,
    animationClipName: overrides.animationClipName,
    animationAutoplay: overrides.animationAutoplay
  };
}

export function createModelInstancePlacementPosition(asset: ModelAssetRecord | undefined, anchor: Vec3 | null): Vec3 {
  const boundingBox = asset?.metadata.boundingBox;

  if (anchor !== null) {
    const floorOffset = boundingBox === null || boundingBox === undefined ? 0 : -boundingBox.min.y;

    return {
      x: anchor.x,
      y: anchor.y + floorOffset,
      z: anchor.z
    };
  }

  return {
    x: DEFAULT_MODEL_INSTANCE_POSITION.x,
    y: boundingBox === null || boundingBox === undefined ? DEFAULT_MODEL_INSTANCE_POSITION.y : Math.max(DEFAULT_MODEL_INSTANCE_POSITION.y, -boundingBox.min.y),
    z: DEFAULT_MODEL_INSTANCE_POSITION.z
  };
}

export function cloneModelInstance(instance: ModelInstance): ModelInstance {
  return createModelInstance(instance);
}

export function areModelInstancesEqual(left: ModelInstance, right: ModelInstance): boolean {
  return (
    left.id === right.id &&
    left.kind === right.kind &&
    left.assetId === right.assetId &&
    left.name === right.name &&
    areVec3Equal(left.position, right.position) &&
    areVec3Equal(left.rotationDegrees, right.rotationDegrees) &&
    areVec3Equal(left.scale, right.scale) &&
    areModelInstanceCollisionSettingsEqual(left.collision, right.collision) &&
    left.animationClipName === right.animationClipName &&
    left.animationAutoplay === right.animationAutoplay
  );
}

export function compareModelInstances(left: ModelInstance, right: ModelInstance): number {
  if (left.assetId !== right.assetId) {
    return left.assetId.localeCompare(right.assetId);
  }

  const leftName = left.name ?? "";
  const rightName = right.name ?? "";

  if (leftName !== rightName) {
    return leftName.localeCompare(rightName);
  }

  return left.id.localeCompare(right.id);
}

export function getModelInstances(modelInstances: Record<string, ModelInstance>): ModelInstance[] {
  return Object.values(modelInstances).sort(compareModelInstances);
}

export function getModelInstanceKindLabel(): string {
  return "Model Instance";
}
