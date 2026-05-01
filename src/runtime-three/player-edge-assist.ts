import type { Vec3 } from "../core/vector";

import type {
  FirstPersonPlayerShape,
  PlayerGroundProbeResult
} from "./player-collision";

const EDGE_ASSIST_FORWARD_PADDING_METERS = 0.12;
const EDGE_ASSIST_FORWARD_STEPS = 3;
const EDGE_ASSIST_VERTICAL_STEPS = 6;
const EDGE_ASSIST_MIN_TOP_OUT_HEIGHT_METERS = 0.04;
const EDGE_ASSIST_GROUND_PROBE_DISTANCE_METERS = 0.35;
const LEDGE_GRAB_FORWARD_PADDING_METERS = 0.18;
const LEDGE_GRAB_FORWARD_STEPS = 4;
const LEDGE_GRAB_VERTICAL_STEPS = 8;
const LEDGE_GRAB_HEAD_REACH_PADDING_METERS = 0.18;
const LEDGE_GRAB_HANG_DROP_METERS = 1.05;
const VECTOR_EPSILON = 1e-6;

export interface RuntimePlayerEdgeAssistResult {
  feetPosition: Vec3;
  lift: number;
  forwardDistance: number;
}

export interface RuntimePlayerLedgeGrabTarget {
  hangFeetPosition: Vec3;
  standFeetPosition: Vec3;
  direction: Vec3;
  topOutHeight: number;
  forwardDistance: number;
  topSurfaceY: number;
}

function dotVec3(left: Vec3, right: Vec3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function lengthVec3(vector: Vec3): number {
  return Math.sqrt(dotVec3(vector, vector));
}

function normalizePlanarDirection(direction: Vec3): Vec3 | null {
  const planarDirection = {
    x: direction.x,
    y: 0,
    z: direction.z
  };
  const length = lengthVec3(planarDirection);

  if (length <= VECTOR_EPSILON) {
    return null;
  }

  return {
    x: planarDirection.x / length,
    y: 0,
    z: planarDirection.z / length
  };
}

function getPlayerShapeHorizontalRadius(shape: FirstPersonPlayerShape): number {
  switch (shape.mode) {
    case "capsule":
      return shape.radius;
    case "box":
      return Math.max(shape.size.x, shape.size.z) * 0.5;
    case "none":
      return 0;
  }
}

function getPlayerShapeUpperReachHeight(shape: FirstPersonPlayerShape): number {
  switch (shape.mode) {
    case "capsule":
      return Math.max(
        shape.eyeHeight + LEDGE_GRAB_HEAD_REACH_PADDING_METERS,
        shape.height - shape.radius * 0.35
      );
    case "box":
      return Math.max(
        shape.eyeHeight + LEDGE_GRAB_HEAD_REACH_PADDING_METERS,
        shape.size.y - 0.1
      );
    case "none":
      return 0;
  }
}

function resolveHangFeetPosition(options: {
  feetPosition: Vec3;
  standFeetPosition: Vec3;
  shape: FirstPersonPlayerShape;
  canOccupyShape(feetPosition: Vec3, shape: FirstPersonPlayerShape): boolean;
}): Vec3 | null {
  const hangFeetY = Math.max(
    options.feetPosition.y,
    options.standFeetPosition.y - LEDGE_GRAB_HANG_DROP_METERS
  );
  const hangFeetPosition = {
    x: options.feetPosition.x,
    y: hangFeetY,
    z: options.feetPosition.z
  };

  return options.canOccupyShape(hangFeetPosition, options.shape)
    ? hangFeetPosition
    : null;
}

export function shouldAttemptPlayerEdgeAssist(options: {
  enabled: boolean;
  pushToTopHeight: number;
  inputMagnitude: number;
  requestedPlanarSpeed: number;
  planarSpeed: number;
  collisionCount: number;
  airborne: boolean;
}): boolean {
  return (
    options.enabled &&
    options.pushToTopHeight >= EDGE_ASSIST_MIN_TOP_OUT_HEIGHT_METERS &&
    options.airborne &&
    options.inputMagnitude > 0 &&
    options.collisionCount > 0 &&
    options.requestedPlanarSpeed > 0 &&
    options.planarSpeed < options.requestedPlanarSpeed * 0.55
  );
}

export function resolvePlayerEdgeAssistTopOut(options: {
  feetPosition: Vec3;
  shape: FirstPersonPlayerShape;
  direction: Vec3;
  pushToTopHeight: number;
  canOccupyShape(feetPosition: Vec3, shape: FirstPersonPlayerShape): boolean;
  probeGround(
    feetPosition: Vec3,
    shape: FirstPersonPlayerShape,
    maxDistance: number
  ): PlayerGroundProbeResult;
}): RuntimePlayerEdgeAssistResult | null {
  if (
    options.shape.mode === "none" ||
    options.pushToTopHeight < EDGE_ASSIST_MIN_TOP_OUT_HEIGHT_METERS
  ) {
    return null;
  }

  const direction = normalizePlanarDirection(options.direction);

  if (direction === null) {
    return null;
  }

  const horizontalRadius = getPlayerShapeHorizontalRadius(options.shape);
  const maxForwardDistance =
    horizontalRadius + EDGE_ASSIST_FORWARD_PADDING_METERS;
  const maxGroundProbeDistance = Math.max(
    EDGE_ASSIST_GROUND_PROBE_DISTANCE_METERS,
    options.pushToTopHeight + EDGE_ASSIST_MIN_TOP_OUT_HEIGHT_METERS
  );

  for (
    let verticalStep = 1;
    verticalStep <= EDGE_ASSIST_VERTICAL_STEPS;
    verticalStep += 1
  ) {
    const lift =
      (options.pushToTopHeight * verticalStep) / EDGE_ASSIST_VERTICAL_STEPS;

    for (
      let forwardStep = 1;
      forwardStep <= EDGE_ASSIST_FORWARD_STEPS;
      forwardStep += 1
    ) {
      const forwardDistance =
        (maxForwardDistance * forwardStep) / EDGE_ASSIST_FORWARD_STEPS;
      const raisedCandidate = {
        x: options.feetPosition.x + direction.x * forwardDistance,
        y: options.feetPosition.y + lift,
        z: options.feetPosition.z + direction.z * forwardDistance
      };

      if (!options.canOccupyShape(raisedCandidate, options.shape)) {
        continue;
      }

      const ground = options.probeGround(
        raisedCandidate,
        options.shape,
        maxGroundProbeDistance
      );

      if (!ground.grounded || ground.distance === null) {
        continue;
      }

      const groundedCandidate = {
        x: raisedCandidate.x,
        y: raisedCandidate.y - ground.distance,
        z: raisedCandidate.z
      };
      const topOutHeight = groundedCandidate.y - options.feetPosition.y;

      if (
        topOutHeight < EDGE_ASSIST_MIN_TOP_OUT_HEIGHT_METERS ||
        topOutHeight > options.pushToTopHeight + VECTOR_EPSILON ||
        !options.canOccupyShape(groundedCandidate, options.shape)
      ) {
        continue;
      }

      return {
        feetPosition: groundedCandidate,
        lift: topOutHeight,
        forwardDistance
      };
    }
  }

  return null;
}

export function resolvePlayerLedgeGrabTarget(options: {
  feetPosition: Vec3;
  shape: FirstPersonPlayerShape;
  direction: Vec3;
  pushToTopHeight: number;
  canOccupyShape(feetPosition: Vec3, shape: FirstPersonPlayerShape): boolean;
  probeGround(
    feetPosition: Vec3,
    shape: FirstPersonPlayerShape,
    maxDistance: number
  ): PlayerGroundProbeResult;
}): RuntimePlayerLedgeGrabTarget | null {
  if (
    options.shape.mode === "none" ||
    options.pushToTopHeight < EDGE_ASSIST_MIN_TOP_OUT_HEIGHT_METERS
  ) {
    return null;
  }

  const direction = normalizePlanarDirection(options.direction);

  if (direction === null) {
    return null;
  }

  const minLedgeHeight =
    options.pushToTopHeight + EDGE_ASSIST_MIN_TOP_OUT_HEIGHT_METERS;
  const maxLedgeHeight = getPlayerShapeUpperReachHeight(options.shape);

  if (maxLedgeHeight <= minLedgeHeight + VECTOR_EPSILON) {
    return null;
  }

  const horizontalRadius = getPlayerShapeHorizontalRadius(options.shape);
  const maxForwardDistance =
    horizontalRadius + LEDGE_GRAB_FORWARD_PADDING_METERS;
  const maxGroundProbeDistance = Math.max(
    EDGE_ASSIST_GROUND_PROBE_DISTANCE_METERS,
    (maxLedgeHeight - minLedgeHeight) / LEDGE_GRAB_VERTICAL_STEPS +
      EDGE_ASSIST_MIN_TOP_OUT_HEIGHT_METERS
  );

  for (
    let verticalStep = 1;
    verticalStep <= LEDGE_GRAB_VERTICAL_STEPS;
    verticalStep += 1
  ) {
    const lift =
      minLedgeHeight +
      ((maxLedgeHeight - minLedgeHeight) * verticalStep) /
        LEDGE_GRAB_VERTICAL_STEPS;

    for (
      let forwardStep = 1;
      forwardStep <= LEDGE_GRAB_FORWARD_STEPS;
      forwardStep += 1
    ) {
      const forwardDistance =
        (maxForwardDistance * forwardStep) / LEDGE_GRAB_FORWARD_STEPS;
      const raisedCandidate = {
        x: options.feetPosition.x + direction.x * forwardDistance,
        y: options.feetPosition.y + lift,
        z: options.feetPosition.z + direction.z * forwardDistance
      };

      if (!options.canOccupyShape(raisedCandidate, options.shape)) {
        continue;
      }

      const ground = options.probeGround(
        raisedCandidate,
        options.shape,
        maxGroundProbeDistance
      );

      if (!ground.grounded || ground.distance === null) {
        continue;
      }

      const standFeetPosition = {
        x: raisedCandidate.x,
        y: raisedCandidate.y - ground.distance,
        z: raisedCandidate.z
      };
      const topOutHeight = standFeetPosition.y - options.feetPosition.y;

      if (
        topOutHeight <= minLedgeHeight + VECTOR_EPSILON ||
        topOutHeight > maxLedgeHeight + VECTOR_EPSILON ||
        !options.canOccupyShape(standFeetPosition, options.shape)
      ) {
        continue;
      }

      const hangFeetPosition = resolveHangFeetPosition({
        feetPosition: options.feetPosition,
        standFeetPosition,
        shape: options.shape,
        canOccupyShape: options.canOccupyShape
      });

      if (hangFeetPosition === null) {
        continue;
      }

      return {
        hangFeetPosition,
        standFeetPosition,
        direction,
        topOutHeight,
        forwardDistance,
        topSurfaceY: standFeetPosition.y
      };
    }
  }

  return null;
}
