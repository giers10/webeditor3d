import { DEFAULT_SUN_DIRECTION, type Vec3 } from "../core/vector";

export type WorldBackgroundMode = "solid" | "verticalGradient" | "image";

export interface WorldSolidBackgroundSettings {
  mode: "solid";
  colorHex: string;
}

export interface WorldVerticalGradientBackgroundSettings {
  mode: "verticalGradient";
  topColorHex: string;
  bottomColorHex: string;
}

export interface WorldImageBackgroundSettings {
  mode: "image";
  assetId: string;
}

export type WorldBackgroundSettings =
  | WorldSolidBackgroundSettings
  | WorldVerticalGradientBackgroundSettings
  | WorldImageBackgroundSettings;

export interface WorldAmbientLightSettings {
  colorHex: string;
  intensity: number;
}

export interface WorldSunLightSettings {
  colorHex: string;
  intensity: number;
  direction: Vec3;
}

export interface WorldSettings {
  background: WorldBackgroundSettings;
  ambientLight: WorldAmbientLightSettings;
  sunLight: WorldSunLightSettings;
}

const DEFAULT_SOLID_BACKGROUND_COLOR = "#2f3947";
const DEFAULT_GRADIENT_TOP_COLOR = DEFAULT_SOLID_BACKGROUND_COLOR;
const DEFAULT_GRADIENT_BOTTOM_COLOR = "#141a22";

export function createDefaultWorldSettings(): WorldSettings {
  return {
    background: {
      mode: "solid",
      colorHex: DEFAULT_SOLID_BACKGROUND_COLOR
    },
    ambientLight: {
      colorHex: "#f7f1e8",
      intensity: 1
    },
    sunLight: {
      colorHex: "#fff1d5",
      intensity: 1.75,
      direction: {
        ...DEFAULT_SUN_DIRECTION
      }
    }
  };
}

export function isHexColorString(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function isWorldBackgroundMode(value: unknown): value is WorldBackgroundMode {
  return value === "solid" || value === "verticalGradient" || value === "image";
}

export function cloneWorldBackgroundSettings(background: WorldBackgroundSettings): WorldBackgroundSettings {
  if (background.mode === "solid") {
    return {
      mode: "solid",
      colorHex: background.colorHex
    };
  }

  if (background.mode === "verticalGradient") {
    return {
      mode: "verticalGradient",
      topColorHex: background.topColorHex,
      bottomColorHex: background.bottomColorHex
    };
  }

  return {
    mode: "image",
    assetId: background.assetId
  };
}

export function cloneWorldSettings(world: WorldSettings): WorldSettings {
  return {
    background: cloneWorldBackgroundSettings(world.background),
    ambientLight: {
      ...world.ambientLight
    },
    sunLight: {
      ...world.sunLight,
      direction: {
        ...world.sunLight.direction
      }
    }
  };
}

export function areWorldBackgroundSettingsEqual(left: WorldBackgroundSettings, right: WorldBackgroundSettings): boolean {
  if (left.mode !== right.mode) {
    return false;
  }

  if (left.mode === "solid" && right.mode === "solid") {
    return left.colorHex === right.colorHex;
  }

  if (left.mode === "verticalGradient" && right.mode === "verticalGradient") {
    return left.topColorHex === right.topColorHex && left.bottomColorHex === right.bottomColorHex;
  }

  return left.mode === "image" && right.mode === "image" && left.assetId === right.assetId;
}

export function areWorldSettingsEqual(left: WorldSettings, right: WorldSettings): boolean {
  return (
    areWorldBackgroundSettingsEqual(left.background, right.background) &&
    left.ambientLight.colorHex === right.ambientLight.colorHex &&
    left.ambientLight.intensity === right.ambientLight.intensity &&
    left.sunLight.colorHex === right.sunLight.colorHex &&
    left.sunLight.intensity === right.sunLight.intensity &&
    left.sunLight.direction.x === right.sunLight.direction.x &&
    left.sunLight.direction.y === right.sunLight.direction.y &&
    left.sunLight.direction.z === right.sunLight.direction.z
  );
}

export function changeWorldBackgroundMode(
  background: WorldBackgroundSettings,
  mode: WorldBackgroundMode,
  imageAssetId?: string
): WorldBackgroundSettings {
  if (mode === "image") {
    if (imageAssetId === undefined || imageAssetId.trim().length === 0) {
      if (background.mode === "image") {
        return cloneWorldBackgroundSettings(background);
      }

      throw new Error("An image asset must be selected to use an image background.");
    }

    return {
      mode: "image",
      assetId: imageAssetId
    };
  }

  if (background.mode === mode) {
    return cloneWorldBackgroundSettings(background);
  }

  if (mode === "solid") {
    return {
      mode: "solid",
      colorHex:
        background.mode === "solid"
          ? background.colorHex
          : background.mode === "verticalGradient"
            ? background.topColorHex
            : DEFAULT_SOLID_BACKGROUND_COLOR
    };
  }

  if (background.mode === "solid") {
    return {
      mode: "verticalGradient",
      topColorHex: background.colorHex,
      bottomColorHex: DEFAULT_GRADIENT_BOTTOM_COLOR
    };
  }

  if (background.mode === "verticalGradient") {
    return {
      mode: "verticalGradient",
      topColorHex: background.topColorHex,
      bottomColorHex: background.bottomColorHex
    };
  }

  return {
    mode: "verticalGradient",
    topColorHex: DEFAULT_GRADIENT_TOP_COLOR,
    bottomColorHex: DEFAULT_GRADIENT_BOTTOM_COLOR
  };
}
