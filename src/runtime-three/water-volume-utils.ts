import { Euler, Quaternion, Vector3 } from "three";

import type { RuntimeWaterVolume } from "./runtime-scene-build";

export interface RuntimeWaterContact {
  volume: RuntimeWaterVolume;
  localPoint: {
    x: number;
    y: number;
    z: number;
  };
  surfaceHeight: number;
}

function getWaterVolumeQuaternion(volume: RuntimeWaterVolume): Quaternion {
  return new Quaternion().setFromEuler(
    new Euler(
      (volume.rotationDegrees.x * Math.PI) / 180,
      (volume.rotationDegrees.y * Math.PI) / 180,
      (volume.rotationDegrees.z * Math.PI) / 180,
      "XYZ"
    )
  );
}

export function getWaterVolumeLocalPoint(
  point: { x: number; y: number; z: number },
  volume: RuntimeWaterVolume
) {
  const offset = new Vector3(
    point.x - volume.center.x,
    point.y - volume.center.y,
    point.z - volume.center.z
  );
  const inverseRotation = getWaterVolumeQuaternion(volume).invert();

  offset.applyQuaternion(inverseRotation);

  return {
    x: offset.x,
    y: offset.y,
    z: offset.z
  };
}

export function isPointInsideWaterVolume(
  point: { x: number; y: number; z: number },
  volume: RuntimeWaterVolume
): boolean {
  const localPoint = getWaterVolumeLocalPoint(point, volume);

  return (
    Math.abs(localPoint.x) <= volume.size.x * 0.5 &&
    Math.abs(localPoint.y) <= volume.size.y * 0.5 &&
    Math.abs(localPoint.z) <= volume.size.z * 0.5
  );
}

export function resolveWaterSurfaceHeightAtPoint(
  volume: RuntimeWaterVolume,
  point: { x: number; y: number; z: number }
): number {
  const rotation = getWaterVolumeQuaternion(volume);
  const topCenter = new Vector3(0, volume.size.y * 0.5, 0)
    .applyQuaternion(rotation)
    .add(new Vector3(volume.center.x, volume.center.y, volume.center.z));
  const normal = new Vector3(0, 1, 0).applyQuaternion(rotation);

  if (Math.abs(normal.y) <= 1e-5) {
    return topCenter.y;
  }

  return (
    topCenter.y -
    (normal.x * (point.x - topCenter.x) +
      normal.z * (point.z - topCenter.z)) /
      normal.y
  );
}

export function resolveWaterContact(
  point: { x: number; y: number; z: number },
  volumes: RuntimeWaterVolume[]
): RuntimeWaterContact | null {
  let bestContact: RuntimeWaterContact | null = null;

  for (const volume of volumes) {
    if (!isPointInsideWaterVolume(point, volume)) {
      continue;
    }

    const surfaceHeight = resolveWaterSurfaceHeightAtPoint(volume, point);
    const contact: RuntimeWaterContact = {
      volume,
      localPoint: getWaterVolumeLocalPoint(point, volume),
      surfaceHeight
    };

    if (
      bestContact === null ||
      contact.surfaceHeight > bestContact.surfaceHeight
    ) {
      bestContact = contact;
    }
  }

  return bestContact;
}