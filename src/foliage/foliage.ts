import { createOpaqueId } from "../core/ids";

export const FOLIAGE_PROTOTYPE_CATEGORIES = [
  "grass",
  "weed",
  "flower",
  "bush",
  "other"
] as const;

export type FoliagePrototypeCategory =
  (typeof FOLIAGE_PROTOTYPE_CATEGORIES)[number];

export const FOLIAGE_PROTOTYPE_LOD_LEVELS = [0, 1, 2, 3] as const;

export type FoliagePrototypeLodLevel =
  (typeof FOLIAGE_PROTOTYPE_LOD_LEVELS)[number];

export type FoliagePrototypeLod =
  | {
      level: FoliagePrototypeLodLevel;
      source: "bundled";
      bundledPath: string;
      maxDistance: number;
      castShadow: boolean;
    }
  | {
      level: FoliagePrototypeLodLevel;
      source: "projectAsset";
      modelAssetId: string;
      maxDistance: number;
      castShadow: boolean;
    };

export interface FoliagePrototype {
  id: string;
  label: string;
  category: FoliagePrototypeCategory;
  lods: FoliagePrototypeLod[];
  minScale: number;
  maxScale: number;
  randomYaw: boolean;
  alignToNormal: number;
  densityWeight: number;
  colorVariation: number;
  windStrength: number;
  windPhaseRandomness: number;
  defaultCullDistance: number;
}

export interface FoliageLayer {
  id: string;
  name: string;
  prototypeIds: string[];
  density: number;
  minScale: number;
  maxScale: number;
  minSlopeDegrees: number;
  maxSlopeDegrees: number;
  alignToNormal: number;
  noiseScale: number;
  noiseStrength: number;
  noiseThreshold: number;
  colorVariation: number;
  seed: number;
  enabled: boolean;
}

export type FoliagePrototypeRegistry = Record<string, FoliagePrototype>;
export type FoliageLayerRegistry = Record<string, FoliageLayer>;

export const DEFAULT_FOLIAGE_PROTOTYPE_MIN_SCALE = 0.85;
export const DEFAULT_FOLIAGE_PROTOTYPE_MAX_SCALE = 1.2;
export const DEFAULT_FOLIAGE_PROTOTYPE_ALIGN_TO_NORMAL = 0.6;
export const DEFAULT_FOLIAGE_PROTOTYPE_DENSITY_WEIGHT = 1;
export const DEFAULT_FOLIAGE_PROTOTYPE_COLOR_VARIATION = 0.12;
export const DEFAULT_FOLIAGE_PROTOTYPE_WIND_STRENGTH = 0.35;
export const DEFAULT_FOLIAGE_PROTOTYPE_WIND_PHASE_RANDOMNESS = 1;
export const DEFAULT_FOLIAGE_PROTOTYPE_CULL_DISTANCE = 140;

export const DEFAULT_FOLIAGE_LAYER_DENSITY = 1;
export const DEFAULT_FOLIAGE_LAYER_MIN_SCALE = 1;
export const DEFAULT_FOLIAGE_LAYER_MAX_SCALE = 1;
export const DEFAULT_FOLIAGE_LAYER_MIN_SLOPE_DEGREES = 0;
export const DEFAULT_FOLIAGE_LAYER_MAX_SLOPE_DEGREES = 40;
export const DEFAULT_FOLIAGE_LAYER_ALIGN_TO_NORMAL = 0.6;
export const DEFAULT_FOLIAGE_LAYER_NOISE_SCALE = 8;
export const DEFAULT_FOLIAGE_LAYER_NOISE_STRENGTH = 0.5;
export const DEFAULT_FOLIAGE_LAYER_NOISE_THRESHOLD = 0;
export const DEFAULT_FOLIAGE_LAYER_COLOR_VARIATION = 0.12;
export const DEFAULT_FOLIAGE_LAYER_SEED = 1;
export const DEFAULT_FOLIAGE_LAYER_ENABLED = true;

export function isFoliagePrototypeCategory(
  value: unknown
): value is FoliagePrototypeCategory {
  return FOLIAGE_PROTOTYPE_CATEGORIES.includes(
    value as FoliagePrototypeCategory
  );
}

export function isFoliagePrototypeLodLevel(
  value: unknown
): value is FoliagePrototypeLodLevel {
  return FOLIAGE_PROTOTYPE_LOD_LEVELS.includes(
    value as FoliagePrototypeLodLevel
  );
}

export function createEmptyFoliagePrototypeRegistry(): FoliagePrototypeRegistry {
  return {};
}

export function createEmptyFoliageLayerRegistry(): FoliageLayerRegistry {
  return {};
}

function normalizeNonEmptyString(value: string, label: string): string {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return trimmedValue;
}

function normalizeFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }

  return value;
}

function normalizeNonNegativeFiniteNumber(
  value: number,
  label: string
): number {
  const numberValue = normalizeFiniteNumber(value, label);

  if (numberValue < 0) {
    throw new Error(`${label} must be zero or greater.`);
  }

  return numberValue;
}

function normalizeUnitNumber(value: number, label: string): number {
  const numberValue = normalizeFiniteNumber(value, label);

  if (numberValue < 0 || numberValue > 1) {
    throw new Error(`${label} must be between 0 and 1.`);
  }

  return numberValue;
}

function normalizeScaleRange(minScale: number, maxScale: number): {
  minScale: number;
  maxScale: number;
} {
  const normalizedMinScale = normalizeNonNegativeFiniteNumber(
    minScale,
    "Foliage minScale"
  );
  const normalizedMaxScale = normalizeNonNegativeFiniteNumber(
    maxScale,
    "Foliage maxScale"
  );

  if (normalizedMaxScale < normalizedMinScale) {
    throw new Error("Foliage maxScale must be greater than or equal to minScale.");
  }

  return {
    minScale: normalizedMinScale,
    maxScale: normalizedMaxScale
  };
}

export function cloneFoliagePrototypeLod(
  lod: FoliagePrototypeLod
): FoliagePrototypeLod {
  const level = lod.level;

  if (!isFoliagePrototypeLodLevel(level)) {
    throw new Error("Foliage prototype LOD level must be 0, 1, 2, or 3.");
  }

  const maxDistance = normalizeNonNegativeFiniteNumber(
    lod.maxDistance,
    "Foliage prototype LOD maxDistance"
  );

  if (typeof lod.castShadow !== "boolean") {
    throw new Error("Foliage prototype LOD castShadow must be a boolean.");
  }

  if (lod.source === "bundled") {
    return {
      level,
      source: "bundled",
      bundledPath: normalizeNonEmptyString(
        lod.bundledPath,
        "Foliage prototype LOD bundledPath"
      ),
      maxDistance,
      castShadow: lod.castShadow
    };
  }

  return {
    level,
    source: "projectAsset",
    modelAssetId: normalizeNonEmptyString(
      lod.modelAssetId,
      "Foliage prototype LOD modelAssetId"
    ),
    maxDistance,
    castShadow: lod.castShadow
  };
}

export function cloneFoliagePrototype(
  prototype: FoliagePrototype
): FoliagePrototype {
  const scaleRange = normalizeScaleRange(
    prototype.minScale,
    prototype.maxScale
  );

  if (!isFoliagePrototypeCategory(prototype.category)) {
    throw new Error("Foliage prototype category must be supported.");
  }

  return {
    id: normalizeNonEmptyString(prototype.id, "Foliage prototype id"),
    label: normalizeNonEmptyString(prototype.label, "Foliage prototype label"),
    category: prototype.category,
    lods: prototype.lods.map((lod) => cloneFoliagePrototypeLod(lod)),
    minScale: scaleRange.minScale,
    maxScale: scaleRange.maxScale,
    randomYaw: prototype.randomYaw,
    alignToNormal: normalizeUnitNumber(
      prototype.alignToNormal,
      "Foliage prototype alignToNormal"
    ),
    densityWeight: normalizeNonNegativeFiniteNumber(
      prototype.densityWeight,
      "Foliage prototype densityWeight"
    ),
    colorVariation: normalizeUnitNumber(
      prototype.colorVariation,
      "Foliage prototype colorVariation"
    ),
    windStrength: normalizeNonNegativeFiniteNumber(
      prototype.windStrength,
      "Foliage prototype windStrength"
    ),
    windPhaseRandomness: normalizeUnitNumber(
      prototype.windPhaseRandomness,
      "Foliage prototype windPhaseRandomness"
    ),
    defaultCullDistance: normalizeNonNegativeFiniteNumber(
      prototype.defaultCullDistance,
      "Foliage prototype defaultCullDistance"
    )
  };
}

export function createFoliagePrototype(
  overrides: Pick<FoliagePrototype, "id" | "label" | "lods"> &
    Partial<Omit<FoliagePrototype, "id" | "label" | "lods">>
): FoliagePrototype {
  return cloneFoliagePrototype({
    id: overrides.id,
    label: overrides.label,
    category: overrides.category ?? "other",
    lods: overrides.lods,
    minScale: overrides.minScale ?? DEFAULT_FOLIAGE_PROTOTYPE_MIN_SCALE,
    maxScale: overrides.maxScale ?? DEFAULT_FOLIAGE_PROTOTYPE_MAX_SCALE,
    randomYaw: overrides.randomYaw ?? true,
    alignToNormal:
      overrides.alignToNormal ?? DEFAULT_FOLIAGE_PROTOTYPE_ALIGN_TO_NORMAL,
    densityWeight:
      overrides.densityWeight ?? DEFAULT_FOLIAGE_PROTOTYPE_DENSITY_WEIGHT,
    colorVariation:
      overrides.colorVariation ?? DEFAULT_FOLIAGE_PROTOTYPE_COLOR_VARIATION,
    windStrength:
      overrides.windStrength ?? DEFAULT_FOLIAGE_PROTOTYPE_WIND_STRENGTH,
    windPhaseRandomness:
      overrides.windPhaseRandomness ??
      DEFAULT_FOLIAGE_PROTOTYPE_WIND_PHASE_RANDOMNESS,
    defaultCullDistance:
      overrides.defaultCullDistance ??
      DEFAULT_FOLIAGE_PROTOTYPE_CULL_DISTANCE
  });
}

export function cloneFoliagePrototypeRegistry(
  prototypes: FoliagePrototypeRegistry
): FoliagePrototypeRegistry {
  return Object.fromEntries(
    Object.entries(prototypes).map(([prototypeId, prototype]) => [
      prototypeId,
      cloneFoliagePrototype(prototype)
    ])
  );
}

export function cloneFoliageLayer(layer: FoliageLayer): FoliageLayer {
  const scaleRange = normalizeScaleRange(layer.minScale, layer.maxScale);

  if (layer.maxSlopeDegrees < layer.minSlopeDegrees) {
    throw new Error(
      "Foliage layer maxSlopeDegrees must be greater than or equal to minSlopeDegrees."
    );
  }

  if (typeof layer.enabled !== "boolean") {
    throw new Error("Foliage layer enabled must be a boolean.");
  }

  return {
    id: normalizeNonEmptyString(layer.id, "Foliage layer id"),
    name: normalizeNonEmptyString(layer.name, "Foliage layer name"),
    prototypeIds: layer.prototypeIds.map((prototypeId) =>
      normalizeNonEmptyString(prototypeId, "Foliage layer prototype id")
    ),
    density: normalizeNonNegativeFiniteNumber(
      layer.density,
      "Foliage layer density"
    ),
    minScale: scaleRange.minScale,
    maxScale: scaleRange.maxScale,
    minSlopeDegrees: normalizeFiniteNumber(
      layer.minSlopeDegrees,
      "Foliage layer minSlopeDegrees"
    ),
    maxSlopeDegrees: normalizeFiniteNumber(
      layer.maxSlopeDegrees,
      "Foliage layer maxSlopeDegrees"
    ),
    alignToNormal: normalizeUnitNumber(
      layer.alignToNormal,
      "Foliage layer alignToNormal"
    ),
    noiseScale: normalizeNonNegativeFiniteNumber(
      layer.noiseScale,
      "Foliage layer noiseScale"
    ),
    noiseStrength: normalizeUnitNumber(
      layer.noiseStrength,
      "Foliage layer noiseStrength"
    ),
    noiseThreshold: normalizeUnitNumber(
      layer.noiseThreshold,
      "Foliage layer noiseThreshold"
    ),
    colorVariation: normalizeUnitNumber(
      layer.colorVariation,
      "Foliage layer colorVariation"
    ),
    seed: normalizeFiniteNumber(layer.seed, "Foliage layer seed"),
    enabled: layer.enabled
  };
}

export function createFoliageLayer(
  overrides: Partial<FoliageLayer> = {}
): FoliageLayer {
  return cloneFoliageLayer({
    id: overrides.id ?? createOpaqueId("foliage-layer"),
    name: overrides.name ?? "Foliage Layer",
    prototypeIds: overrides.prototypeIds ?? [],
    density: overrides.density ?? DEFAULT_FOLIAGE_LAYER_DENSITY,
    minScale: overrides.minScale ?? DEFAULT_FOLIAGE_LAYER_MIN_SCALE,
    maxScale: overrides.maxScale ?? DEFAULT_FOLIAGE_LAYER_MAX_SCALE,
    minSlopeDegrees:
      overrides.minSlopeDegrees ?? DEFAULT_FOLIAGE_LAYER_MIN_SLOPE_DEGREES,
    maxSlopeDegrees:
      overrides.maxSlopeDegrees ?? DEFAULT_FOLIAGE_LAYER_MAX_SLOPE_DEGREES,
    alignToNormal:
      overrides.alignToNormal ?? DEFAULT_FOLIAGE_LAYER_ALIGN_TO_NORMAL,
    noiseScale: overrides.noiseScale ?? DEFAULT_FOLIAGE_LAYER_NOISE_SCALE,
    noiseStrength:
      overrides.noiseStrength ?? DEFAULT_FOLIAGE_LAYER_NOISE_STRENGTH,
    noiseThreshold:
      overrides.noiseThreshold ?? DEFAULT_FOLIAGE_LAYER_NOISE_THRESHOLD,
    colorVariation:
      overrides.colorVariation ?? DEFAULT_FOLIAGE_LAYER_COLOR_VARIATION,
    seed: overrides.seed ?? DEFAULT_FOLIAGE_LAYER_SEED,
    enabled: overrides.enabled ?? DEFAULT_FOLIAGE_LAYER_ENABLED
  });
}

export function cloneFoliageLayerRegistry(
  layers: FoliageLayerRegistry
): FoliageLayerRegistry {
  return Object.fromEntries(
    Object.entries(layers).map(([layerId, layer]) => [
      layerId,
      cloneFoliageLayer(layer)
    ])
  );
}

export function foliagePrototypeReferencesProjectAsset(
  prototype: FoliagePrototype,
  assetId: string
): boolean {
  return prototype.lods.some(
    (lod) => lod.source === "projectAsset" && lod.modelAssetId === assetId
  );
}
