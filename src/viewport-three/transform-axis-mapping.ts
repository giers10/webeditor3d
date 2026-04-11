import { Euler, Quaternion, Vector3 } from "three";

import type { TransformAxis } from "../core/transform-session";
import type { Vec3 } from "../core/vector";

function axisVector(axis: TransformAxis): Vector3 {
  switch (axis) {
    case "x":
      return new Vector3(1, 0, 0);
    case "y":
      return new Vector3(0, 1, 0);
    case "z":
      return new Vector3(0, 0, 1);
  }
}

export function resolveDominantLocalAxisForWorldAxis(
  rotationDegrees: Vec3,
  worldAxis: TransformAxis
): TransformAxis {
  const orientation = new Quaternion().setFromEuler(
    new Euler(
      (rotationDegrees.x * Math.PI) / 180,
      (rotationDegrees.y * Math.PI) / 180,
      (rotationDegrees.z * Math.PI) / 180,
      "XYZ"
    )
  );
  const localAxis = axisVector(worldAxis)
    .applyQuaternion(orientation.invert())
    .normalize();
  const axisWeights: Array<[TransformAxis, number]> = [
    ["x", Math.abs(localAxis.x)],
    ["y", Math.abs(localAxis.y)],
    ["z", Math.abs(localAxis.z)]
  ];

  axisWeights.sort((left, right) => right[1] - left[1]);
  return axisWeights[0]?.[0] ?? worldAxis;
}
