import type { Vec3 } from "../core/vector";
import {
  formatTimeOfDayHours,
  HOURS_PER_DAY,
  normalizeTimeOfDayHours,
  type ProjectTimeSettings
} from "../document/project-time-settings";
import {
  cloneWorldBackgroundSettings,
  type WorldAmbientLightSettings,
  type WorldBackgroundSettings,
  type WorldSettings,
  type WorldSunLightSettings
} from "../document/world-settings";

const NIGHT_AMBIENT_COLOR = "#162033";
const NIGHT_SUN_COLOR = "#6f7fb5";
const NIGHT_SOLID_BACKGROUND_COLOR = "#09111f";
const NIGHT_GRADIENT_TOP_COLOR = "#0b1730";
const NIGHT_GRADIENT_BOTTOM_COLOR = "#182134";
const DEFAULT_NOON_DIRECTION: Vec3 = {
  x: 0.45,
  y: 0.88,
  z: 0.15
};
const UP_AXIS: Vec3 = {
  x: 0,
  y: 1,
  z: 0
};

export interface RuntimeClockState {
  timeOfDayHours: number;
  dayCount: number;
  dayLengthMinutes: number;
}

export interface RuntimeDayNightWorldState {
  ambientLight: WorldAmbientLightSettings;
  sunLight: WorldSunLightSettings;
  background: WorldBackgroundSettings;
  daylightFactor: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }

  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(left: number, right: number, amount: number): number {
  return left + (right - left) * amount;
}

function normalizeVec3(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);

  if (length <= 1e-6) {
    return {
      ...DEFAULT_NOON_DIRECTION
    };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function cross(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x
  };
}

function dot(left: Vec3, right: Vec3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function scaleVec3(vector: Vec3, scale: number): Vec3 {
  return {
    x: vector.x * scale,
    y: vector.y * scale,
    z: vector.z * scale
  };
}

function addVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z
  };
}

function rotateAroundAxis(vector: Vec3, axis: Vec3, radians: number): Vec3 {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return normalizeVec3(
    addVec3(
      addVec3(
        scaleVec3(vector, cosine),
        scaleVec3(cross(axis, vector), sine)
      ),
      scaleVec3(axis, dot(axis, vector) * (1 - cosine))
    )
  );
}

function parseHexColor(colorHex: string): { r: number; g: number; b: number } {
  return {
    r: Number.parseInt(colorHex.slice(1, 3), 16),
    g: Number.parseInt(colorHex.slice(3, 5), 16),
    b: Number.parseInt(colorHex.slice(5, 7), 16)
  };
}

function formatHexColor(color: { r: number; g: number; b: number }): string {
  const toHex = (value: number) =>
    Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");

  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function blendHexColors(leftHex: string, rightHex: string, amount: number): string {
  const left = parseHexColor(leftHex);
  const right = parseHexColor(rightHex);

  return formatHexColor({
    r: lerp(left.r, right.r, amount),
    g: lerp(left.g, right.g, amount),
    b: lerp(left.b, right.b, amount)
  });
}

function resolveNoonSunDirection(direction: Vec3): Vec3 {
  const normalizedDirection = normalizeVec3(direction);

  if (normalizedDirection.y >= 0.2) {
    return normalizedDirection;
  }

  return normalizeVec3({
    x: normalizedDirection.x,
    y: Math.abs(normalizedDirection.y) + 0.35,
    z: normalizedDirection.z
  });
}

function resolveTimeDrivenSunDirection(
  noonDirection: Vec3,
  timeOfDayHours: number
): Vec3 {
  const orbitAxisCandidate = cross(noonDirection, UP_AXIS);
  const orbitAxis =
    Math.hypot(
      orbitAxisCandidate.x,
      orbitAxisCandidate.y,
      orbitAxisCandidate.z
    ) <= 1e-6
      ? {
          x: 1,
          y: 0,
          z: 0
        }
      : normalizeVec3(orbitAxisCandidate);
  const orbitRadians =
    ((normalizeTimeOfDayHours(timeOfDayHours) - 12) / HOURS_PER_DAY) *
    Math.PI * 2;

  return rotateAroundAxis(noonDirection, orbitAxis, orbitRadians);
}

function resolveTimeDrivenBackground(
  background: WorldBackgroundSettings,
  daylightFactor: number
): WorldBackgroundSettings {
  if (background.mode === "solid") {
    return {
      mode: "solid",
      colorHex: blendHexColors(
        NIGHT_SOLID_BACKGROUND_COLOR,
        background.colorHex,
        daylightFactor
      )
    };
  }

  if (background.mode === "verticalGradient") {
    return {
      mode: "verticalGradient",
      topColorHex: blendHexColors(
        NIGHT_GRADIENT_TOP_COLOR,
        background.topColorHex,
        daylightFactor
      ),
      bottomColorHex: blendHexColors(
        NIGHT_GRADIENT_BOTTOM_COLOR,
        background.bottomColorHex,
        daylightFactor
      )
    };
  }

  return cloneWorldBackgroundSettings(background);
}

export function createRuntimeClockState(
  settings: ProjectTimeSettings
): RuntimeClockState {
  return {
    timeOfDayHours: normalizeTimeOfDayHours(settings.startTimeOfDayHours),
    dayCount: 0,
    dayLengthMinutes: settings.dayLengthMinutes
  };
}

export function cloneRuntimeClockState(
  state: RuntimeClockState
): RuntimeClockState {
  return {
    timeOfDayHours: state.timeOfDayHours,
    dayCount: state.dayCount,
    dayLengthMinutes: state.dayLengthMinutes
  };
}

export function areRuntimeClockStatesEqual(
  left: RuntimeClockState,
  right: RuntimeClockState
): boolean {
  return (
    left.timeOfDayHours === right.timeOfDayHours &&
    left.dayCount === right.dayCount &&
    left.dayLengthMinutes === right.dayLengthMinutes
  );
}

export function reconfigureRuntimeClockState(
  state: RuntimeClockState,
  settings: ProjectTimeSettings
): RuntimeClockState {
  return {
    ...cloneRuntimeClockState(state),
    dayLengthMinutes: settings.dayLengthMinutes
  };
}

export function advanceRuntimeClockState(
  state: RuntimeClockState,
  dtSeconds: number
): RuntimeClockState {
  if (dtSeconds <= 0) {
    return cloneRuntimeClockState(state);
  }

  const safeDayLengthMinutes = Math.max(state.dayLengthMinutes, 0.001);
  const hoursAdvanced =
    (dtSeconds / (safeDayLengthMinutes * 60)) * HOURS_PER_DAY;
  const absoluteHours = state.timeOfDayHours + hoursAdvanced;

  return {
    timeOfDayHours: normalizeTimeOfDayHours(absoluteHours),
    dayCount: state.dayCount + Math.floor(absoluteHours / HOURS_PER_DAY),
    dayLengthMinutes: state.dayLengthMinutes
  };
}

export function formatRuntimeClockTime(state: RuntimeClockState): string {
  return formatTimeOfDayHours(state.timeOfDayHours);
}

export function resolveRuntimeDayNightWorldState(
  world: WorldSettings,
  clock: RuntimeClockState | null
): RuntimeDayNightWorldState {
  if (clock === null) {
    return {
      ambientLight: {
        colorHex: world.ambientLight.colorHex,
        intensity: world.ambientLight.intensity
      },
      sunLight: {
        colorHex: world.sunLight.colorHex,
        intensity: world.sunLight.intensity,
        direction: {
          ...world.sunLight.direction
        }
      },
      background: cloneWorldBackgroundSettings(world.background),
      daylightFactor: 1
    };
  }

  const noonDirection = resolveNoonSunDirection(world.sunLight.direction);
  const sunDirection = resolveTimeDrivenSunDirection(
    noonDirection,
    clock.timeOfDayHours
  );
  const daylightFactor = smoothstep(-0.2, 0.18, sunDirection.y);
  const ambientFactor = lerp(0.18, 1, daylightFactor);
  const sunFactor = lerp(0.02, 1, smoothstep(-0.05, 0.22, sunDirection.y));

  return {
    ambientLight: {
      colorHex: blendHexColors(
        NIGHT_AMBIENT_COLOR,
        world.ambientLight.colorHex,
        lerp(0.15, 1, daylightFactor)
      ),
      intensity: world.ambientLight.intensity * ambientFactor
    },
    sunLight: {
      colorHex: blendHexColors(
        NIGHT_SUN_COLOR,
        world.sunLight.colorHex,
        lerp(0.1, 1, daylightFactor)
      ),
      intensity: world.sunLight.intensity * sunFactor,
      direction: sunDirection
    },
    background: resolveTimeDrivenBackground(world.background, daylightFactor),
    daylightFactor
  };
}