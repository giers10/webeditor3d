import {
  FOLIAGE_PROTOTYPE_LOD_LEVELS,
  createFoliagePrototype,
  isFoliagePrototypeLodLevel,
  type FoliagePrototype,
  type FoliagePrototypeCategory,
  type FoliagePrototypeLodLevel
} from "./foliage";

export const BUNDLED_FOLIAGE_PUBLIC_ROOT = "/foliage" as const;
export const EXPECTED_BUNDLED_FOLIAGE_PROTOTYPE_COUNT = 40 as const;
export const EXPECTED_BUNDLED_FOLIAGE_LOD_COUNT = 4 as const;

export const DEFAULT_BUNDLED_FOLIAGE_LOD_MAX_DISTANCE: Record<
  FoliagePrototypeLodLevel,
  number
> = {
  0: 18,
  1: 36,
  2: 72,
  3: 140
} as const;

export const DEFAULT_BUNDLED_FOLIAGE_LOD_CAST_SHADOW: Record<
  FoliagePrototypeLodLevel,
  boolean
> = {
  0: true,
  1: true,
  2: false,
  3: false
} as const;

export interface BundledFoliageLodFile {
  prototypeId: string;
  prototypeName: string;
  label: string;
  categoryDirectory: string | null;
  category: FoliagePrototypeCategory;
  level: FoliagePrototypeLodLevel;
  relativePath: string;
  bundledPath: string;
}

export interface BundledFoliagePrototypeGroup {
  id: string;
  name: string;
  label: string;
  categoryDirectory: string | null;
  category: FoliagePrototypeCategory;
  lods: BundledFoliageLodFile[];
}

export type BundledFoliageDiagnosticCode =
  | "duplicate-foliage-lod"
  | "duplicate-foliage-prototype-id"
  | "invalid-foliage-filename"
  | "invalid-foliage-lod-level"
  | "missing-foliage-lod"
  | "unexpected-foliage-prototype-count"
  | "unexpected-foliage-lod-count"
  | "invalid-bundled-foliage-lod-source"
  | "invalid-bundled-foliage-lod-path";

export interface BundledFoliageDiagnostic {
  code: BundledFoliageDiagnosticCode;
  message: string;
  path?: string;
  prototypeId?: string;
  level?: FoliagePrototypeLodLevel;
}

export interface BundledFoliageGroupingResult {
  groups: BundledFoliagePrototypeGroup[];
  diagnostics: BundledFoliageDiagnostic[];
}

function normalizeRelativePath(path: string): string {
  let normalizedPath = path.replace(/\\/gu, "/").trim();

  if (normalizedPath.startsWith("/")) {
    normalizedPath = normalizedPath.slice(1);
  }

  if (normalizedPath.startsWith("public/foliage/")) {
    normalizedPath = normalizedPath.slice("public/foliage/".length);
  }

  if (normalizedPath.startsWith("foliage/")) {
    normalizedPath = normalizedPath.slice("foliage/".length);
  }

  return normalizedPath;
}

function getPathSegments(relativePath: string): string[] {
  return relativePath.split("/").filter((segment) => segment.length > 0);
}

export function toBundledFoliagePrototypeId(prototypeName: string): string {
  const slug = prototypeName
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .toLowerCase();

  return `bundled-foliage-${slug.length > 0 ? slug : "unnamed"}`;
}

export function formatBundledFoliageLabel(prototypeName: string): string {
  return prototypeName
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/[_-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function inferBundledFoliageCategory(
  categoryDirectory: string | null,
  prototypeName: string
): FoliagePrototypeCategory {
  const normalizedCategory = categoryDirectory?.toLowerCase() ?? "";
  const normalizedName = prototypeName.toLowerCase();

  if (/flower|daisy/u.test(normalizedName)) {
    return "flower";
  }

  if (normalizedCategory.includes("grass")) {
    return "grass";
  }

  if (
    normalizedCategory.includes("weed") ||
    normalizedCategory.includes("wheat")
  ) {
    return "weed";
  }

  if (/bush|shrub/u.test(normalizedName)) {
    return "bush";
  }

  return "other";
}

function parseBundledFoliageLodFile(
  path: string
): { file: BundledFoliageLodFile | null; diagnostic: BundledFoliageDiagnostic | null } {
  const relativePath = normalizeRelativePath(path);
  const segments = getPathSegments(relativePath);
  const fileName = segments.at(-1) ?? "";

  if (!fileName.toLowerCase().endsWith(".glb")) {
    return {
      file: null,
      diagnostic: null
    };
  }

  const lodMatch = /^(.+)_LOD([0-9]+)\.glb$/u.exec(fileName);

  if (lodMatch === null) {
    return {
      file: null,
      diagnostic: {
        code: "invalid-foliage-filename",
        message: `Bundled foliage file ${path} must be named name_LOD0.glb through name_LOD3.glb.`,
        path
      }
    };
  }

  const prototypeName = lodMatch[1] ?? "";
  const numericLevel = Number(lodMatch[2]);

  if (!isFoliagePrototypeLodLevel(numericLevel)) {
    return {
      file: null,
      diagnostic: {
        code: "invalid-foliage-lod-level",
        message: `Bundled foliage file ${path} uses unsupported LOD${numericLevel}.`,
        path
      }
    };
  }

  const categoryDirectory = segments.length >= 3 ? segments.at(-3) ?? null : null;
  const label = formatBundledFoliageLabel(prototypeName);
  const prototypeId = toBundledFoliagePrototypeId(prototypeName);

  return {
    file: {
      prototypeId,
      prototypeName,
      label,
      categoryDirectory,
      category: inferBundledFoliageCategory(categoryDirectory, prototypeName),
      level: numericLevel,
      relativePath,
      bundledPath: `${BUNDLED_FOLIAGE_PUBLIC_ROOT}/${relativePath}`
    },
    diagnostic: null
  };
}

export function groupBundledFoliageFiles(
  paths: readonly string[]
): BundledFoliageGroupingResult {
  const diagnostics: BundledFoliageDiagnostic[] = [];
  const mutableGroups = new Map<
    string,
    Omit<BundledFoliagePrototypeGroup, "lods"> & {
      lods: Partial<Record<FoliagePrototypeLodLevel, BundledFoliageLodFile>>;
    }
  >();

  for (const path of paths) {
    const parsedFile = parseBundledFoliageLodFile(path);

    if (parsedFile.diagnostic !== null) {
      diagnostics.push(parsedFile.diagnostic);
      continue;
    }

    if (parsedFile.file === null) {
      continue;
    }

    const file = parsedFile.file;
    const existingGroup = mutableGroups.get(file.prototypeId);

    if (
      existingGroup !== undefined &&
      existingGroup.name !== file.prototypeName
    ) {
      diagnostics.push({
        code: "duplicate-foliage-prototype-id",
        message: `Bundled foliage prototype id ${file.prototypeId} is shared by ${existingGroup.name} and ${file.prototypeName}.`,
        path: file.relativePath,
        prototypeId: file.prototypeId
      });
      continue;
    }

    const group =
      existingGroup ??
      {
        id: file.prototypeId,
        name: file.prototypeName,
        label: file.label,
        categoryDirectory: file.categoryDirectory,
        category: file.category,
        lods: {}
      };

    if (group.lods[file.level] !== undefined) {
      diagnostics.push({
        code: "duplicate-foliage-lod",
        message: `Bundled foliage prototype ${file.prototypeName} has more than one LOD${file.level} file.`,
        path: file.relativePath,
        prototypeId: file.prototypeId,
        level: file.level
      });
      continue;
    }

    group.lods[file.level] = file;
    mutableGroups.set(file.prototypeId, group);
  }

  const groups = [...mutableGroups.values()]
    .map((group) => {
      for (const level of FOLIAGE_PROTOTYPE_LOD_LEVELS) {
        if (group.lods[level] === undefined) {
          diagnostics.push({
            code: "missing-foliage-lod",
            message: `Bundled foliage prototype ${group.name} is missing LOD${level}.`,
            prototypeId: group.id,
            level
          });
        }
      }

      return {
        ...group,
        lods: FOLIAGE_PROTOTYPE_LOD_LEVELS.flatMap((level) => {
          const lod = group.lods[level];
          return lod === undefined ? [] : [lod];
        })
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    groups,
    diagnostics
  };
}

export function createBundledFoliagePrototype(
  group: BundledFoliagePrototypeGroup
): FoliagePrototype {
  return createFoliagePrototype({
    id: group.id,
    label: group.label,
    category: group.category,
    lods: group.lods.map((lod) => ({
      level: lod.level,
      source: "bundled",
      bundledPath: lod.bundledPath,
      maxDistance: DEFAULT_BUNDLED_FOLIAGE_LOD_MAX_DISTANCE[lod.level],
      castShadow: DEFAULT_BUNDLED_FOLIAGE_LOD_CAST_SHADOW[lod.level]
    })),
    defaultCullDistance: DEFAULT_BUNDLED_FOLIAGE_LOD_MAX_DISTANCE[3]
  });
}

export function createBundledFoliageManifest(
  paths: readonly string[]
): FoliagePrototype[] {
  const grouping = groupBundledFoliageFiles(paths);

  if (grouping.diagnostics.length > 0) {
    throw new Error(
      `Bundled foliage manifest is invalid: ${grouping.diagnostics
        .map((diagnostic) => diagnostic.message)
        .join(" | ")}`
    );
  }

  return grouping.groups.map((group) => createBundledFoliagePrototype(group));
}

export function validateBundledFoliageManifest(
  prototypes: readonly FoliagePrototype[],
  expectedPrototypeCount = EXPECTED_BUNDLED_FOLIAGE_PROTOTYPE_COUNT
): BundledFoliageDiagnostic[] {
  const diagnostics: BundledFoliageDiagnostic[] = [];
  const seenPrototypeIds = new Set<string>();

  if (prototypes.length !== expectedPrototypeCount) {
    diagnostics.push({
      code: "unexpected-foliage-prototype-count",
      message: `Bundled foliage manifest must expose ${expectedPrototypeCount} prototypes; found ${prototypes.length}.`
    });
  }

  for (const prototype of prototypes) {
    if (seenPrototypeIds.has(prototype.id)) {
      diagnostics.push({
        code: "duplicate-foliage-prototype-id",
        message: `Bundled foliage prototype id ${prototype.id} appears more than once.`,
        prototypeId: prototype.id
      });
    }

    seenPrototypeIds.add(prototype.id);

    if (prototype.lods.length !== EXPECTED_BUNDLED_FOLIAGE_LOD_COUNT) {
      diagnostics.push({
        code: "unexpected-foliage-lod-count",
        message: `Bundled foliage prototype ${prototype.id} must expose ${EXPECTED_BUNDLED_FOLIAGE_LOD_COUNT} LODs.`,
        prototypeId: prototype.id
      });
    }

    for (const level of FOLIAGE_PROTOTYPE_LOD_LEVELS) {
      const lod = prototype.lods.find(
        (candidate) => candidate.level === level
      );

      if (lod === undefined) {
        diagnostics.push({
          code: "missing-foliage-lod",
          message: `Bundled foliage prototype ${prototype.id} is missing LOD${level}.`,
          prototypeId: prototype.id,
          level
        });
        continue;
      }

      if (lod.source !== "bundled") {
        diagnostics.push({
          code: "invalid-bundled-foliage-lod-source",
          message: `Bundled foliage prototype ${prototype.id} LOD${level} must use a bundled source.`,
          prototypeId: prototype.id,
          level
        });
        continue;
      }

      if (!lod.bundledPath.startsWith(`${BUNDLED_FOLIAGE_PUBLIC_ROOT}/`)) {
        diagnostics.push({
          code: "invalid-bundled-foliage-lod-path",
          message: `Bundled foliage prototype ${prototype.id} LOD${level} must point under ${BUNDLED_FOLIAGE_PUBLIC_ROOT}.`,
          path: lod.bundledPath,
          prototypeId: prototype.id,
          level
        });
      }
    }
  }

  return diagnostics;
}
