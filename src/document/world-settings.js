import { DEFAULT_SUN_DIRECTION } from "../core/vector";
export const ADVANCED_RENDERING_SHADOW_MAP_SIZES = [512, 1024, 2048, 4096];
export const ADVANCED_RENDERING_SHADOW_TYPES = ["basic", "pcf", "pcfSoft"];
export const ADVANCED_RENDERING_TONE_MAPPING_MODES = ["none", "linear", "reinhard", "cineon", "acesFilmic"];
export const BOX_VOLUME_RENDER_PATHS = ["performance", "quality"];
const DEFAULT_SOLID_BACKGROUND_COLOR = "#2f3947";
const DEFAULT_GRADIENT_TOP_COLOR = DEFAULT_SOLID_BACKGROUND_COLOR;
const DEFAULT_GRADIENT_BOTTOM_COLOR = "#141a22";
const DEFAULT_ADVANCED_RENDERING_SHADOW_MAP_SIZE = 2048;
const DEFAULT_ADVANCED_RENDERING_SHADOW_TYPE = "pcfSoft";
const DEFAULT_ADVANCED_RENDERING_SHADOW_BIAS = -0.0005;
const DEFAULT_ADVANCED_RENDERING_AMBIENT_OCCLUSION_INTENSITY = 1;
const DEFAULT_ADVANCED_RENDERING_AMBIENT_OCCLUSION_RADIUS = 0.5;
const DEFAULT_ADVANCED_RENDERING_AMBIENT_OCCLUSION_SAMPLES = 8;
const DEFAULT_ADVANCED_RENDERING_BLOOM_INTENSITY = 0.75;
const DEFAULT_ADVANCED_RENDERING_BLOOM_THRESHOLD = 0.85;
const DEFAULT_ADVANCED_RENDERING_BLOOM_RADIUS = 0.35;
const DEFAULT_ADVANCED_RENDERING_TONE_MAPPING_MODE = "acesFilmic";
const DEFAULT_ADVANCED_RENDERING_TONE_MAPPING_EXPOSURE = 1;
const DEFAULT_ADVANCED_RENDERING_DEPTH_OF_FIELD_FOCUS_DISTANCE = 10;
const DEFAULT_ADVANCED_RENDERING_DEPTH_OF_FIELD_FOCAL_LENGTH = 0.03;
const DEFAULT_ADVANCED_RENDERING_DEPTH_OF_FIELD_BOKEH_SCALE = 1.5;
const DEFAULT_BOX_VOLUME_RENDER_PATH = "performance";
export function isAdvancedRenderingShadowMapSize(value) {
    return ADVANCED_RENDERING_SHADOW_MAP_SIZES.includes(value);
}
export function isAdvancedRenderingShadowType(value) {
    return ADVANCED_RENDERING_SHADOW_TYPES.includes(value);
}
export function isAdvancedRenderingToneMappingMode(value) {
    return ADVANCED_RENDERING_TONE_MAPPING_MODES.includes(value);
}
export function isBoxVolumeRenderPath(value) {
    return BOX_VOLUME_RENDER_PATHS.includes(value);
}
export function createDefaultAdvancedRenderingSettings() {
    return {
        enabled: false,
        shadows: {
            enabled: false,
            mapSize: DEFAULT_ADVANCED_RENDERING_SHADOW_MAP_SIZE,
            type: DEFAULT_ADVANCED_RENDERING_SHADOW_TYPE,
            bias: DEFAULT_ADVANCED_RENDERING_SHADOW_BIAS
        },
        ambientOcclusion: {
            enabled: false,
            intensity: DEFAULT_ADVANCED_RENDERING_AMBIENT_OCCLUSION_INTENSITY,
            radius: DEFAULT_ADVANCED_RENDERING_AMBIENT_OCCLUSION_RADIUS,
            samples: DEFAULT_ADVANCED_RENDERING_AMBIENT_OCCLUSION_SAMPLES
        },
        bloom: {
            enabled: false,
            intensity: DEFAULT_ADVANCED_RENDERING_BLOOM_INTENSITY,
            threshold: DEFAULT_ADVANCED_RENDERING_BLOOM_THRESHOLD,
            radius: DEFAULT_ADVANCED_RENDERING_BLOOM_RADIUS
        },
        toneMapping: {
            mode: DEFAULT_ADVANCED_RENDERING_TONE_MAPPING_MODE,
            exposure: DEFAULT_ADVANCED_RENDERING_TONE_MAPPING_EXPOSURE
        },
        depthOfField: {
            enabled: false,
            focusDistance: DEFAULT_ADVANCED_RENDERING_DEPTH_OF_FIELD_FOCUS_DISTANCE,
            focalLength: DEFAULT_ADVANCED_RENDERING_DEPTH_OF_FIELD_FOCAL_LENGTH,
            bokehScale: DEFAULT_ADVANCED_RENDERING_DEPTH_OF_FIELD_BOKEH_SCALE
        },
        fogPath: DEFAULT_BOX_VOLUME_RENDER_PATH,
        waterPath: DEFAULT_BOX_VOLUME_RENDER_PATH
    };
}
export function createDefaultWorldSettings() {
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
        },
        advancedRendering: createDefaultAdvancedRenderingSettings()
    };
}
export function isHexColorString(value) {
    return /^#[0-9a-f]{6}$/i.test(value);
}
export function isWorldBackgroundMode(value) {
    return value === "solid" || value === "verticalGradient" || value === "image";
}
export function cloneWorldBackgroundSettings(background) {
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
        assetId: background.assetId,
        environmentIntensity: background.environmentIntensity
    };
}
export function cloneWorldSettings(world) {
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
        },
        advancedRendering: cloneAdvancedRenderingSettings(world.advancedRendering)
    };
}
export function cloneAdvancedRenderingSettings(settings) {
    return {
        enabled: settings.enabled,
        shadows: {
            ...settings.shadows
        },
        ambientOcclusion: {
            ...settings.ambientOcclusion
        },
        bloom: {
            ...settings.bloom
        },
        toneMapping: {
            ...settings.toneMapping
        },
        depthOfField: {
            ...settings.depthOfField
        },
        fogPath: settings.fogPath,
        waterPath: settings.waterPath
    };
}
export function areWorldBackgroundSettingsEqual(left, right) {
    if (left.mode !== right.mode) {
        return false;
    }
    if (left.mode === "solid" && right.mode === "solid") {
        return left.colorHex === right.colorHex;
    }
    if (left.mode === "verticalGradient" && right.mode === "verticalGradient") {
        return left.topColorHex === right.topColorHex && left.bottomColorHex === right.bottomColorHex;
    }
    return left.mode === "image" && right.mode === "image" && left.assetId === right.assetId && left.environmentIntensity === right.environmentIntensity;
}
export function areWorldSettingsEqual(left, right) {
    return (areWorldBackgroundSettingsEqual(left.background, right.background) &&
        left.ambientLight.colorHex === right.ambientLight.colorHex &&
        left.ambientLight.intensity === right.ambientLight.intensity &&
        left.sunLight.colorHex === right.sunLight.colorHex &&
        left.sunLight.intensity === right.sunLight.intensity &&
        left.sunLight.direction.x === right.sunLight.direction.x &&
        left.sunLight.direction.y === right.sunLight.direction.y &&
        left.sunLight.direction.z === right.sunLight.direction.z &&
        areAdvancedRenderingSettingsEqual(left.advancedRendering, right.advancedRendering));
}
export function areAdvancedRenderingSettingsEqual(left, right) {
    return (left.enabled === right.enabled &&
        left.shadows.enabled === right.shadows.enabled &&
        left.shadows.mapSize === right.shadows.mapSize &&
        left.shadows.type === right.shadows.type &&
        left.shadows.bias === right.shadows.bias &&
        left.ambientOcclusion.enabled === right.ambientOcclusion.enabled &&
        left.ambientOcclusion.intensity === right.ambientOcclusion.intensity &&
        left.ambientOcclusion.radius === right.ambientOcclusion.radius &&
        left.ambientOcclusion.samples === right.ambientOcclusion.samples &&
        left.bloom.enabled === right.bloom.enabled &&
        left.bloom.intensity === right.bloom.intensity &&
        left.bloom.threshold === right.bloom.threshold &&
        left.bloom.radius === right.bloom.radius &&
        left.toneMapping.mode === right.toneMapping.mode &&
        left.toneMapping.exposure === right.toneMapping.exposure &&
        left.depthOfField.enabled === right.depthOfField.enabled &&
        left.depthOfField.focusDistance === right.depthOfField.focusDistance &&
        left.depthOfField.focalLength === right.depthOfField.focalLength &&
        left.depthOfField.bokehScale === right.depthOfField.bokehScale &&
        left.fogPath === right.fogPath &&
        left.waterPath === right.waterPath);
}
export function changeWorldBackgroundMode(background, mode, imageAssetId) {
    if (mode === "image") {
        if (imageAssetId === undefined || imageAssetId.trim().length === 0) {
            if (background.mode === "image") {
                return cloneWorldBackgroundSettings(background);
            }
            throw new Error("An image asset must be selected to use an image background.");
        }
        return {
            mode: "image",
            assetId: imageAssetId,
            environmentIntensity: background.mode === "image" ? background.environmentIntensity : 0.5
        };
    }
    if (background.mode === mode) {
        return cloneWorldBackgroundSettings(background);
    }
    if (mode === "solid") {
        return {
            mode: "solid",
            colorHex: background.mode === "solid"
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
