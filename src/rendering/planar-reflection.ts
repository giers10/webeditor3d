import { Euler, Matrix4, PerspectiveCamera, Plane, Quaternion, Vector3, Vector4 } from "three";

import type { Vec3 } from "../core/vector";

export interface PlanarReflectionSurface {
  center: Vec3;
  rotationDegrees: Vec3;
  size: Vec3;
}

const SURFACE_UP = new Vector3(0, 1, 0);
const CAMERA_FORWARD = new Vector3(0, 0, -1);

function createRotationQuaternion(rotationDegrees: Vec3) {
  return new Quaternion().setFromEuler(
    new Euler((rotationDegrees.x * Math.PI) / 180, (rotationDegrees.y * Math.PI) / 180, (rotationDegrees.z * Math.PI) / 180, "XYZ")
  );
}

export function updatePlanarReflectionCamera(
  surface: PlanarReflectionSurface,
  sourceCamera: PerspectiveCamera,
  reflectionCamera: PerspectiveCamera,
  reflectionMatrix: Matrix4,
  clipBias = 0.003
) {
  const rotation = createRotationQuaternion(surface.rotationDegrees);
  const surfaceNormal = SURFACE_UP.clone().applyQuaternion(rotation).normalize();
  const surfaceCenter = new Vector3(surface.center.x, surface.center.y, surface.center.z).add(
    surfaceNormal.clone().multiplyScalar(surface.size.y * 0.5)
  );
  const cameraWorldPosition = new Vector3().setFromMatrixPosition(sourceCamera.matrixWorld);
  const sourceRotationMatrix = new Matrix4().extractRotation(sourceCamera.matrixWorld);
  const lookAtPosition = CAMERA_FORWARD.clone().applyMatrix4(sourceRotationMatrix).add(cameraWorldPosition);
  const reflectedViewPosition = surfaceCenter.clone().sub(cameraWorldPosition);

  if (reflectedViewPosition.dot(surfaceNormal) > 0) {
    return false;
  }

  reflectedViewPosition.reflect(surfaceNormal).negate();
  reflectedViewPosition.add(surfaceCenter);

  const reflectedTarget = surfaceCenter.clone().sub(lookAtPosition);
  reflectedTarget.reflect(surfaceNormal).negate();
  reflectedTarget.add(surfaceCenter);

  reflectionCamera.position.copy(reflectedViewPosition);
  reflectionCamera.up.set(0, 1, 0).applyMatrix4(sourceRotationMatrix).reflect(surfaceNormal);
  reflectionCamera.near = sourceCamera.near;
  reflectionCamera.far = sourceCamera.far;
  reflectionCamera.aspect = sourceCamera.aspect;
  reflectionCamera.projectionMatrix.copy(sourceCamera.projectionMatrix);
  reflectionCamera.projectionMatrixInverse.copy(sourceCamera.projectionMatrixInverse);
  reflectionCamera.lookAt(reflectedTarget);
  reflectionCamera.updateMatrixWorld();
  reflectionCamera.matrixWorldInverse.copy(reflectionCamera.matrixWorld).invert();

  reflectionMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  reflectionMatrix.multiply(reflectionCamera.projectionMatrix);
  reflectionMatrix.multiply(reflectionCamera.matrixWorldInverse);

  const clipPlane = new Plane().setFromNormalAndCoplanarPoint(surfaceNormal, surfaceCenter).applyMatrix4(reflectionCamera.matrixWorldInverse);
  const clipVector = new Vector4(clipPlane.normal.x, clipPlane.normal.y, clipPlane.normal.z, clipPlane.constant);
  const projectionElements = reflectionCamera.projectionMatrix.elements;
  const q = new Vector4(
    (Math.sign(clipVector.x) + projectionElements[8]) / projectionElements[0],
    (Math.sign(clipVector.y) + projectionElements[9]) / projectionElements[5],
    -1,
    (1 + projectionElements[10]) / projectionElements[14]
  );

  clipVector.multiplyScalar(2 / clipVector.dot(q));

  projectionElements[2] = clipVector.x;
  projectionElements[6] = clipVector.y;
  projectionElements[10] = clipVector.z + 1 - clipBias;
  projectionElements[14] = clipVector.w;
  reflectionCamera.projectionMatrixInverse.copy(reflectionCamera.projectionMatrix).invert();

  return true;
}