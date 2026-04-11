import type { FirstPersonTelemetry } from "./navigation-controller";
import type { RuntimeSceneDefinition } from "./runtime-scene-build";
import { resolveWaterContact } from "./water-volume-utils";

export interface UnderwaterFogState {
  colorHex: string;
  density: number;
}

const MIN_UNDERWATER_FOG_DENSITY = 0.018;
const MAX_UNDERWATER_FOG_DENSITY = 0.12;

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function resolveUnderwaterFogDensity(
  contact: ReturnType<typeof resolveWaterContact>
) {
  if (contact === null) {
    return MIN_UNDERWATER_FOG_DENSITY;
  }

  const { volume, localPoint } = contact;
  const halfHeight = Math.max(volume.size.y * 0.5, 0.0001);
  const submersionDepth = clampNumber((halfHeight - localPoint.y) / (halfHeight * 2), 0, 1);

  return clampNumber(
    0.045 + volume.surfaceOpacity * 0.035 + Math.max(volume.waveStrength, 0) * 0.015 + submersionDepth * 0.03,
    MIN_UNDERWATER_FOG_DENSITY,
    MAX_UNDERWATER_FOG_DENSITY
  );
}

export function resolveUnderwaterFogState(
  runtimeScene: Pick<RuntimeSceneDefinition, "volumes"> | null,
  telemetry: Pick<FirstPersonTelemetry, "cameraSubmerged" | "eyePosition"> | null
): UnderwaterFogState | null {
  if (runtimeScene === null || telemetry === null || telemetry.cameraSubmerged !== true) {
    return null;
  }

  const contact = resolveWaterContact(
    telemetry.eyePosition,
    runtimeScene.volumes.water
  );

  if (contact === null) {
    return null;
  }

  return {
    colorHex: contact.volume.colorHex,
    density: resolveUnderwaterFogDensity(contact)
  };
}