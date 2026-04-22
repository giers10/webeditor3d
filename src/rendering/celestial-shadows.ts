import {
  OrthographicCamera,
  PerspectiveCamera,
  Vector3
} from "three";

import type { Vec3 } from "../core/vector";
import type { WorldSunLightSettings } from "../document/world-settings";

const MIN_CELESTIAL_SHADOW_INTENSITY = 1e-4;
const MIN_SHADOW_FOCUS_RADIUS = 0.5;
const MIN_CELESTIAL_SHADOW_DISTANCE = 24;
const MAX_CELESTIAL_SHADOW_DISTANCE = 160;
const MIN_CELESTIAL_SHADOW_EXTENT = 4;
const MIN_CELESTIAL_SHADOW_MARGIN = 2;
const MIN_CELESTIAL_SHADOW_DEPTH_PADDING = 6;
const WORLD_UP = new Vector3(0, 1, 0);
const FALLBACK_UP = new Vector3(0, 0, 1);

export interface CelestialShadowFocusTarget {
  center: Vec3;
  radius: number;
}

export interface CelestialShadowSceneBounds {
  min: Vec3;
  max: Vec3;
}

export interface CelestialShadowCaster {
  key: "sun" | "moon";
  light: WorldSunLightSettings;
}

export interface CelestialShadowFit {
  coverageDistance: number;
  normalBias: number;
  lightPosition: Vec3;
  targetPosition: Vec3;
  cameraBounds: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    near: number;
    far: number;
  };
}

export interface FitCelestialDirectionalShadowOptions {
  activeCamera: PerspectiveCamera | OrthographicCamera;
  focusTarget: CelestialShadowFocusTarget;
  lightDirection: Vec3;
  mapSize: number;
  sceneBounds?: CelestialShadowSceneBounds | null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isFiniteVec3(vector: Vec3 | null): vector is Vec3 {
  return (
    vector !== null &&
    Number.isFinite(vector.x) &&
    Number.isFinite(vector.y) &&
    Number.isFinite(vector.z)
  );
}

function vec3ToVector3(vector: Vec3): Vector3 {
  return new Vector3(vector.x, vector.y, vector.z);
}

function vector3ToVec3(vector: Vector3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function getLightDirection(light: WorldSunLightSettings | null): Vector3 | null {
  if (light === null || light.intensity <= MIN_CELESTIAL_SHADOW_INTENSITY) {
    return null;
  }

  const direction = vec3ToVector3(light.direction);

  if (direction.lengthSq() <= 1e-8) {
    return null;
  }

  return direction.normalize();
}

export function resolveDominantCelestialShadowCaster(
  sunLight: WorldSunLightSettings,
  moonLight: WorldSunLightSettings | null
): CelestialShadowCaster | null {
  const sunDirection = getLightDirection(sunLight);
  const moonDirection = getLightDirection(moonLight);

  if (sunDirection !== null && moonDirection !== null) {
    return sunLight.intensity >= (moonLight?.intensity ?? 0)
      ? {
          key: "sun",
          light: sunLight
        }
      : {
          key: "moon",
          light: moonLight as WorldSunLightSettings
        };
  }

  if (sunDirection !== null) {
    return {
      key: "sun",
      light: sunLight
    };
  }

  if (moonDirection !== null && moonLight !== null) {
    return {
      key: "moon",
      light: moonLight
    };
  }

  return null;
}

function pushBoxCorners(
  points: Vector3[],
  center: Vector3,
  halfExtents: Vector3
) {
  for (const xSign of [-1, 1]) {
    for (const ySign of [-1, 1]) {
      for (const zSign of [-1, 1]) {
        points.push(
          new Vector3(
            center.x + halfExtents.x * xSign,
            center.y + halfExtents.y * ySign,
            center.z + halfExtents.z * zSign
          )
        );
      }
    }
  }
}

function pushClippedBoundsCorners(
  points: Vector3[],
  sceneBounds: CelestialShadowSceneBounds | null,
  focusCenter: Vector3,
  coverageDistance: number
) {
  if (sceneBounds === null) {
    return;
  }

  const clippedMin = {
    x: Math.max(sceneBounds.min.x, focusCenter.x - coverageDistance),
    y: Math.max(sceneBounds.min.y, focusCenter.y - coverageDistance),
    z: Math.max(sceneBounds.min.z, focusCenter.z - coverageDistance)
  };
  const clippedMax = {
    x: Math.min(sceneBounds.max.x, focusCenter.x + coverageDistance),
    y: Math.min(sceneBounds.max.y, focusCenter.y + coverageDistance),
    z: Math.min(sceneBounds.max.z, focusCenter.z + coverageDistance)
  };

  if (
    clippedMin.x > clippedMax.x ||
    clippedMin.y > clippedMax.y ||
    clippedMin.z > clippedMax.z
  ) {
    return;
  }

  const center = new Vector3(
    (clippedMin.x + clippedMax.x) * 0.5,
    (clippedMin.y + clippedMax.y) * 0.5,
    (clippedMin.z + clippedMax.z) * 0.5
  );
  const halfExtents = new Vector3(
    (clippedMax.x - clippedMin.x) * 0.5,
    (clippedMax.y - clippedMin.y) * 0.5,
    (clippedMax.z - clippedMin.z) * 0.5
  );

  points.push(center.clone());
  pushBoxCorners(points, center, halfExtents);
}

function resolveCameraBasis(
  camera: PerspectiveCamera | OrthographicCamera
) {
  const forward = new Vector3(0, 0, -1)
    .applyQuaternion(camera.quaternion)
    .normalize();
  const up = new Vector3(0, 1, 0)
    .applyQuaternion(camera.quaternion)
    .normalize();
  const right = new Vector3(1, 0, 0)
    .applyQuaternion(camera.quaternion)
    .normalize();

  return {
    forward,
    up,
    right
  };
}

function collectPerspectiveCoveragePoints(
  points: Vector3[],
  camera: PerspectiveCamera,
  focusCenter: Vector3,
  coverageDistance: number
) {
  const { forward, up, right } = resolveCameraBasis(camera);
  const focusDistance = camera.position.distanceTo(focusCenter);
  const distances = Array.from(
    new Set(
      [
        clamp(focusDistance, 2, coverageDistance),
        clamp(Math.max(camera.near * 8, coverageDistance * 0.35), 2, coverageDistance),
        coverageDistance
      ].map((value) => Math.max(0.1, value))
    )
  ).sort((left, rightValue) => left - rightValue);

  for (const distance of distances) {
    const halfHeight =
      Math.tan((camera.fov * Math.PI) / 360) * distance;
    const halfWidth = halfHeight * Math.max(camera.aspect, 0.0001);
    const planeCenter = camera.position
      .clone()
      .add(forward.clone().multiplyScalar(distance));
    const scaledUp = up.clone().multiplyScalar(halfHeight);
    const scaledRight = right.clone().multiplyScalar(halfWidth);

    points.push(planeCenter.clone());

    for (const xSign of [-1, 1]) {
      for (const ySign of [-1, 1]) {
        points.push(
          planeCenter
            .clone()
            .addScaledVector(scaledRight, xSign)
            .addScaledVector(scaledUp, ySign)
        );
      }
    }
  }
}

function collectOrthographicCoveragePoints(
  points: Vector3[],
  camera: OrthographicCamera,
  focusCenter: Vector3,
  coverageDistance: number
) {
  const { forward, up, right } = resolveCameraBasis(camera);
  const halfWidth =
    Math.abs(camera.right - camera.left) /
    Math.max(camera.zoom, 0.0001) *
    0.5;
  const halfHeight =
    Math.abs(camera.top - camera.bottom) /
    Math.max(camera.zoom, 0.0001) *
    0.5;
  const depthHalf = coverageDistance * 0.5;
  const scaledUp = up.clone().multiplyScalar(halfHeight);
  const scaledRight = right.clone().multiplyScalar(halfWidth);

  for (const depthOffset of [-depthHalf, 0, depthHalf]) {
    const planeCenter = focusCenter
      .clone()
      .add(forward.clone().multiplyScalar(depthOffset));

    points.push(planeCenter.clone());

    for (const xSign of [-1, 1]) {
      for (const ySign of [-1, 1]) {
        points.push(
          planeCenter
            .clone()
            .addScaledVector(scaledRight, xSign)
            .addScaledVector(scaledUp, ySign)
        );
      }
    }
  }
}

function resolveShadowCoverageDistance(
  camera: PerspectiveCamera | OrthographicCamera,
  focusCenter: Vector3,
  focusRadius: number
) {
  if (camera instanceof PerspectiveCamera) {
    const distanceToFocus = camera.position.distanceTo(focusCenter);
    return clamp(
      Math.max(distanceToFocus * 1.35, focusRadius * 4),
      MIN_CELESTIAL_SHADOW_DISTANCE,
      MAX_CELESTIAL_SHADOW_DISTANCE
    );
  }

  const visibleWidth =
    Math.abs(camera.right - camera.left) / Math.max(camera.zoom, 0.0001);
  const visibleHeight =
    Math.abs(camera.top - camera.bottom) / Math.max(camera.zoom, 0.0001);

  return clamp(
    Math.max(Math.hypot(visibleWidth, visibleHeight) * 1.8, focusRadius * 3),
    MIN_CELESTIAL_SHADOW_DISTANCE,
    MAX_CELESTIAL_SHADOW_DISTANCE
  );
}

export function fitCelestialDirectionalShadow(
  options: FitCelestialDirectionalShadowOptions
): CelestialShadowFit | null {
  if (!isFiniteVec3(options.focusTarget.center)) {
    return null;
  }

  const directionToLight = vec3ToVector3(options.lightDirection);

  if (directionToLight.lengthSq() <= 1e-8) {
    return null;
  }

  const focusCenter = vec3ToVector3(options.focusTarget.center);
  const focusRadius = Math.max(
    MIN_SHADOW_FOCUS_RADIUS,
    options.focusTarget.radius
  );
  const coverageDistance = resolveShadowCoverageDistance(
    options.activeCamera,
    focusCenter,
    focusRadius
  );
  const points: Vector3[] = [focusCenter.clone()];

  pushBoxCorners(
    points,
    focusCenter,
    new Vector3(focusRadius, focusRadius, focusRadius)
  );

  if (options.activeCamera instanceof PerspectiveCamera) {
    collectPerspectiveCoveragePoints(
      points,
      options.activeCamera,
      focusCenter,
      coverageDistance
    );
  } else {
    collectOrthographicCoveragePoints(
      points,
      options.activeCamera,
      focusCenter,
      coverageDistance
    );
  }

  pushClippedBoundsCorners(
    points,
    options.sceneBounds ?? null,
    focusCenter,
    coverageDistance
  );

  const lightForward = directionToLight.normalize().negate();
  const upReference =
    Math.abs(lightForward.dot(WORLD_UP)) > 0.92 ? FALLBACK_UP : WORLD_UP;
  const lightRight = new Vector3()
    .crossVectors(upReference, lightForward)
    .normalize();
  const lightUp = new Vector3()
    .crossVectors(lightForward, lightRight)
    .normalize();

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    const offset = point.clone().sub(focusCenter);
    const x = offset.dot(lightRight);
    const y = offset.dot(lightUp);
    const z = offset.dot(lightForward);

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxY) ||
    !Number.isFinite(minZ) ||
    !Number.isFinite(maxZ)
  ) {
    return null;
  }

  const margin = Math.max(
    MIN_CELESTIAL_SHADOW_MARGIN,
    focusRadius * 0.35,
    coverageDistance * 0.08
  );
  minX -= margin;
  maxX += margin;
  minY -= margin;
  maxY += margin;

  let centerX = (minX + maxX) * 0.5;
  let centerY = (minY + maxY) * 0.5;
  const centerZ = (minZ + maxZ) * 0.5;
  const halfWidth = Math.max(
    MIN_CELESTIAL_SHADOW_EXTENT,
    (maxX - minX) * 0.5
  );
  const halfHeight = Math.max(
    MIN_CELESTIAL_SHADOW_EXTENT,
    (maxY - minY) * 0.5
  );

  const texelWidth = (halfWidth * 2) / Math.max(1, options.mapSize);
  const texelHeight = (halfHeight * 2) / Math.max(1, options.mapSize);
  if (texelWidth > 0) {
    centerX = Math.round(centerX / texelWidth) * texelWidth;
  }
  if (texelHeight > 0) {
    centerY = Math.round(centerY / texelHeight) * texelHeight;
  }

  const depthPadding = Math.max(
    MIN_CELESTIAL_SHADOW_DEPTH_PADDING,
    focusRadius,
    coverageDistance * 0.12
  );
  const halfDepth = Math.max(
    MIN_CELESTIAL_SHADOW_EXTENT,
    (maxZ - minZ) * 0.5 + depthPadding
  );
  const targetPosition = focusCenter
    .clone()
    .addScaledVector(lightRight, centerX)
    .addScaledVector(lightUp, centerY)
    .addScaledVector(lightForward, centerZ);
  const lightPosition = targetPosition
    .clone()
    .addScaledVector(lightForward, -(halfDepth + depthPadding));
  const normalBias = clamp(
    Math.max(texelWidth, texelHeight) * 0.75,
    0.001,
    0.08
  );

  return {
    coverageDistance,
    normalBias,
    lightPosition: vector3ToVec3(lightPosition),
    targetPosition: vector3ToVec3(targetPosition),
    cameraBounds: {
      left: -halfWidth,
      right: halfWidth,
      top: halfHeight,
      bottom: -halfHeight,
      near: Math.max(0.5, depthPadding * 0.5),
      far: halfDepth * 2 + depthPadding * 2
    }
  };
}
