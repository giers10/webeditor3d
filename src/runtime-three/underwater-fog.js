import { Euler, Quaternion, Vector3 } from "three";

const MIN_UNDERWATER_FOG_DENSITY = 0.018;
const MAX_UNDERWATER_FOG_DENSITY = 0.055;

function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function isPointInsideWaterVolume(point, volume) {
    const offset = new Vector3(point.x - volume.center.x, point.y - volume.center.y, point.z - volume.center.z);
    const inverseRotation = new Quaternion()
        .setFromEuler(new Euler((volume.rotationDegrees.x * Math.PI) / 180, (volume.rotationDegrees.y * Math.PI) / 180, (volume.rotationDegrees.z * Math.PI) / 180, "XYZ"))
        .invert();
    offset.applyQuaternion(inverseRotation);
    return (Math.abs(offset.x) <= volume.size.x * 0.5 &&
        Math.abs(offset.y) <= volume.size.y * 0.5 &&
        Math.abs(offset.z) <= volume.size.z * 0.5);
}

function resolveUnderwaterFogDensity(volume) {
    return clampNumber(MIN_UNDERWATER_FOG_DENSITY + volume.surfaceOpacity * 0.016 + Math.max(volume.waveStrength, 0) * 0.01, MIN_UNDERWATER_FOG_DENSITY, MAX_UNDERWATER_FOG_DENSITY);
}

export function resolveUnderwaterFogState(runtimeScene, telemetry) {
    if (runtimeScene === null || telemetry === null || telemetry.cameraSubmerged !== true) {
        return null;
    }
    const containingVolume = runtimeScene.volumes.water.find((volume) => isPointInsideWaterVolume(telemetry.eyePosition, volume));
    if (containingVolume === undefined) {
        return null;
    }
    return {
        colorHex: containingVolume.colorHex,
        density: resolveUnderwaterFogDensity(containingVolume)
    };
}