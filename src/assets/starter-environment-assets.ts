import type { ProjectDocument } from "../document/scene-document";
import {
  areWorldBackgroundSettingsEqual,
  cloneWorldSettings,
  createDefaultWorldSettings,
  createDefaultWorldTimeOfDaySettings,
  DEFAULT_NIGHT_IMAGE_ENVIRONMENT_INTENSITY,
  type WorldBackgroundSettings
} from "../document/world-settings";

import {
  cloneProjectAssetRecord,
  type ImageAssetRecord,
  type ProjectAssetRecord
} from "./project-assets";

const STARTER_ENVIRONMENT_STORAGE_KEY_PREFIX = "starter-image:";
const STARTER_ENVIRONMENT_DIRECTORY = "/starter-environments";
const STARTER_ENVIRONMENT_WIDTH = 1024;
const STARTER_ENVIRONMENT_HEIGHT = 512;
const DEFAULT_DAY_ENVIRONMENT_INTENSITY = 0.85;

export const STARTER_DAY_ENVIRONMENT_ASSET_ID =
  "starter-image-winter-soccer-field-day" as const;
export const STARTER_NIGHT_ENVIRONMENT_ASSET_ID =
  "starter-image-snow-mountains-night" as const;

interface StarterEnvironmentAssetDefinition {
  asset: ImageAssetRecord;
  folderName: string;
}

const STARTER_ENVIRONMENT_LIBRARY: readonly StarterEnvironmentAssetDefinition[] =
  [
    {
      asset: {
        id: STARTER_DAY_ENVIRONMENT_ASSET_ID,
        kind: "image",
        sourceName: "Starter Winter Soccer Field Day.hdr",
        mimeType: "image/vnd.radiance",
        storageKey: `${STARTER_ENVIRONMENT_STORAGE_KEY_PREFIX}${STARTER_DAY_ENVIRONMENT_ASSET_ID}`,
        byteLength: 1_474_206,
        metadata: {
          kind: "image",
          width: STARTER_ENVIRONMENT_WIDTH,
          height: STARTER_ENVIRONMENT_HEIGHT,
          hasAlpha: false,
          warnings: []
        }
      },
      folderName: "winter_soccer_field_day"
    },
    {
      asset: {
        id: "starter-image-sunset-open-sky",
        kind: "image",
        sourceName: "Starter Sunset Open Sky.hdr",
        mimeType: "image/vnd.radiance",
        storageKey: `${STARTER_ENVIRONMENT_STORAGE_KEY_PREFIX}starter-image-sunset-open-sky`,
        byteLength: 551_007,
        metadata: {
          kind: "image",
          width: STARTER_ENVIRONMENT_WIDTH,
          height: STARTER_ENVIRONMENT_HEIGHT,
          hasAlpha: false,
          warnings: []
        }
      },
      folderName: "sunset_open_sky"
    },
    {
      asset: {
        id: "starter-image-evening-blue-sky",
        kind: "image",
        sourceName: "Starter Evening Blue Sky.hdr",
        mimeType: "image/vnd.radiance",
        storageKey: `${STARTER_ENVIRONMENT_STORAGE_KEY_PREFIX}starter-image-evening-blue-sky`,
        byteLength: 509_472,
        metadata: {
          kind: "image",
          width: STARTER_ENVIRONMENT_WIDTH,
          height: STARTER_ENVIRONMENT_HEIGHT,
          hasAlpha: false,
          warnings: []
        }
      },
      folderName: "evening_blue_sky"
    },
    {
      asset: {
        id: STARTER_NIGHT_ENVIRONMENT_ASSET_ID,
        kind: "image",
        sourceName: "Starter Snow Mountains Night.hdr",
        mimeType: "image/vnd.radiance",
        storageKey: `${STARTER_ENVIRONMENT_STORAGE_KEY_PREFIX}${STARTER_NIGHT_ENVIRONMENT_ASSET_ID}`,
        byteLength: 1_394_352,
        metadata: {
          kind: "image",
          width: STARTER_ENVIRONMENT_WIDTH,
          height: STARTER_ENVIRONMENT_HEIGHT,
          hasAlpha: false,
          warnings: []
        }
      },
      folderName: "snow_mountains_night"
    }
  ] as const;

function cloneStarterEnvironmentAsset(
  definition: StarterEnvironmentAssetDefinition
): ImageAssetRecord {
  return cloneProjectAssetRecord(definition.asset) as ImageAssetRecord;
}

function cloneWorldBackground(background: WorldBackgroundSettings) {
  if (background.mode === "image") {
    return {
      mode: "image" as const,
      assetId: background.assetId,
      environmentIntensity: background.environmentIntensity
    };
  }

  if (background.mode === "shader") {
    return {
      mode: "shader" as const
    };
  }

  if (background.mode === "solid") {
    return {
      mode: "solid" as const,
      colorHex: background.colorHex
    };
  }

  return {
    mode: "verticalGradient" as const,
    topColorHex: background.topColorHex,
    bottomColorHex: background.bottomColorHex
  };
}

function createStarterEnvironmentBackground(
  assetId: string,
  environmentIntensity: number
) {
  return {
    mode: "image" as const,
    assetId,
    environmentIntensity
  };
}

function isDefaultDayBackground(background: WorldBackgroundSettings): boolean {
  return areWorldBackgroundSettingsEqual(
    background,
    createDefaultWorldSettings().background
  );
}

function isDefaultNightBackground(background: WorldBackgroundSettings): boolean {
  return areWorldBackgroundSettingsEqual(
    background,
    createDefaultWorldTimeOfDaySettings().night.background
  );
}

export function createStarterEnvironmentAssetRegistry(): Record<
  string,
  ImageAssetRecord
> {
  return Object.fromEntries(
    STARTER_ENVIRONMENT_LIBRARY.map((definition) => [
      definition.asset.id,
      cloneStarterEnvironmentAsset(definition)
    ])
  );
}

export function isStarterEnvironmentImageAsset(
  asset: ProjectAssetRecord | ImageAssetRecord
): boolean {
  return (
    asset.kind === "image" &&
    asset.storageKey.startsWith(STARTER_ENVIRONMENT_STORAGE_KEY_PREFIX)
  );
}

function getStarterEnvironmentDefinitionById(assetId: string) {
  return (
    STARTER_ENVIRONMENT_LIBRARY.find((definition) => definition.asset.id === assetId) ??
    null
  );
}

function getStarterEnvironmentDefinition(asset: ImageAssetRecord) {
  return getStarterEnvironmentDefinitionById(asset.id);
}

export function getStarterEnvironmentTextureUrl(
  asset: ImageAssetRecord
): string {
  const definition = getStarterEnvironmentDefinition(asset);

  if (definition === null) {
    throw new Error(`Unknown starter environment image asset ${asset.id}.`);
  }

  return `${STARTER_ENVIRONMENT_DIRECTORY}/${definition.folderName}/environment.hdr`;
}

export function getStarterEnvironmentPreviewUrl(
  asset: ImageAssetRecord
): string {
  const definition = getStarterEnvironmentDefinition(asset);

  if (definition === null) {
    throw new Error(`Unknown starter environment image asset ${asset.id}.`);
  }

  return `${STARTER_ENVIRONMENT_DIRECTORY}/${definition.folderName}/preview.jpg`;
}

export function mergeStarterEnvironmentAssets(
  assets: Record<string, ProjectAssetRecord>
): Record<string, ProjectAssetRecord> {
  const mergedAssets: Record<string, ProjectAssetRecord> = {};

  for (const definition of STARTER_ENVIRONMENT_LIBRARY) {
    mergedAssets[definition.asset.id] = cloneStarterEnvironmentAsset(definition);
  }

  for (const [assetId, asset] of Object.entries(assets)) {
    mergedAssets[assetId] = cloneProjectAssetRecord(asset);
  }

  return mergedAssets;
}

export function applyStarterEnvironmentAssetsToProjectDocument(
  document: ProjectDocument
): ProjectDocument {
  const mergedAssets = mergeStarterEnvironmentAssets(document.assets);

  const nextScenes = Object.fromEntries(
    Object.entries(document.scenes).map(([sceneId, scene]) => {
      const nextWorld = cloneWorldSettings(scene.world);

      if (isDefaultDayBackground(nextWorld.background)) {
        nextWorld.background = createStarterEnvironmentBackground(
          STARTER_DAY_ENVIRONMENT_ASSET_ID,
          DEFAULT_DAY_ENVIRONMENT_INTENSITY
        );
      } else {
        nextWorld.background = cloneWorldBackground(nextWorld.background);
      }

      if (isDefaultNightBackground(nextWorld.timeOfDay.night.background)) {
        nextWorld.timeOfDay.night.background = createStarterEnvironmentBackground(
          STARTER_NIGHT_ENVIRONMENT_ASSET_ID,
          DEFAULT_NIGHT_IMAGE_ENVIRONMENT_INTENSITY
        );
      } else {
        nextWorld.timeOfDay.night.background = cloneWorldBackground(
          nextWorld.timeOfDay.night.background
        );
      }

      return [
        sceneId,
        {
          ...scene,
          world: nextWorld
        }
      ];
    })
  );

  return {
    ...document,
    assets: mergedAssets,
    scenes: nextScenes
  };
}
