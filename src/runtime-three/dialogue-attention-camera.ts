import type { Vec3 } from "../core/vector";

export type DialogueAttentionSideSign = -1 | 1;

export interface DialogueAttentionCameraSolution {
  pivot: Vec3;
  position: Vec3;
  lookTarget: Vec3;
  sideSign: DialogueAttentionSideSign;
  subjectDistance: number;
}

export interface ResolveDialogueAttentionCameraOptions {
  playerFocusPoint: Vec3;
  npcFocusPoint: Vec3;
  referenceCameraPosition: Vec3;
  referenceLookTarget: Vec3;
  previousSideSign?: DialogueAttentionSideSign | null;
  preferredConversationDistance?: number;
  preferredConversationHeight?: number;
  cameraVerticalFovRadians?: number;
  cameraAspect?: number;
}

const DEFAULT_DIALOGUE_ATTENTION_DISTANCE = 3.8;
const DEFAULT_DIALOGUE_ATTENTION_HEIGHT = 0.48;
const DEFAULT_DIALOGUE_ATTENTION_VERTICAL_FOV_RADIANS = (70 * Math.PI) / 180;
const DEFAULT_DIALOGUE_ATTENTION_CAMERA_ASPECT = 16 / 9;
const MIN_DIALOGUE_ATTENTION_DISTANCE = 3.2;
const MAX_DIALOGUE_ATTENTION_DISTANCE = 7.5;
const MIN_DIALOGUE_ATTENTION_LOOK_AHEAD = 0.08;
const MAX_DIALOGUE_ATTENTION_LOOK_AHEAD = 0.28;
const MIN_DIALOGUE_ATTENTION_COMPOSITION_OFFSET = 0.03;
const MAX_DIALOGUE_ATTENTION_COMPOSITION_OFFSET = 0.14;
const MIN_DIALOGUE_ATTENTION_SHOULDER_ORBIT_RADIANS = 0.56;
const MAX_DIALOGUE_ATTENTION_SHOULDER_ORBIT_RADIANS = 0.68;
const DIALOGUE_ATTENTION_SAFE_FRAME_MAX_ABS_NDC_X = 0.74;
const DIALOGUE_ATTENTION_SAFE_FRAME_MAX_ABS_NDC_Y = 0.76;
const DIALOGUE_ATTENTION_TARGET_MIN_ABS_FOCUS_SEPARATION_NDC_X = 0.46;
const DIALOGUE_ATTENTION_PARTICIPANT_HALF_WIDTH = 0.24;
const DIALOGUE_ATTENTION_PARTICIPANT_HEAD_RISE = 0.26;
const DIALOGUE_ATTENTION_PARTICIPANT_TORSO_DROP = 0.82;
const MAX_DIALOGUE_ATTENTION_FIT_ITERATIONS = 6;
const MAX_DIALOGUE_ATTENTION_TIGHTEN_ITERATIONS = 4;
const CAMERA_SIDE_EPSILON = 1e-4;

function addVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z
  };
}

function subtractVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z
  };
}

function scaleVec3(vector: Vec3, scalar: number): Vec3 {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar,
    z: vector.z * scalar
  };
}

function dotVec3(left: Vec3, right: Vec3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function crossVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x
  };
}

function lengthVec3(vector: Vec3): number {
  return Math.sqrt(dotVec3(vector, vector));
}

function normalizeVec3(vector: Vec3): Vec3 | null {
  const length = lengthVec3(vector);

  if (length <= CAMERA_SIDE_EPSILON) {
    return null;
  }

  return scaleVec3(vector, 1 / length);
}

function clampScalar(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerpVec3(start: Vec3, end: Vec3, t: number): Vec3 {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
    z: start.z + (end.z - start.z) * t
  };
}

function toHorizontal(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: 0,
    z: vector.z
  };
}

function rotateHorizontalRight(vector: Vec3): Vec3 {
  return {
    x: vector.z,
    y: 0,
    z: -vector.x
  };
}

function createDialogueParticipantSamplePoints(
  focusPoint: Vec3,
  pairRight: Vec3
): Vec3[] {
  const horizontalOffset = scaleVec3(
    pairRight,
    DIALOGUE_ATTENTION_PARTICIPANT_HALF_WIDTH
  );

  return [
    focusPoint,
    addVec3(focusPoint, horizontalOffset),
    subtractVec3(focusPoint, horizontalOffset),
    addVec3(focusPoint, {
      x: 0,
      y: DIALOGUE_ATTENTION_PARTICIPANT_HEAD_RISE,
      z: 0
    }),
    addVec3(focusPoint, {
      x: 0,
      y: -DIALOGUE_ATTENTION_PARTICIPANT_TORSO_DROP,
      z: 0
    })
  ];
}

function resolveDialogueAttentionCameraPosition(
  conversationMidpoint: Vec3,
  pairDirection: Vec3,
  pairRight: Vec3,
  sideSign: DialogueAttentionSideSign,
  verticalOffset: number,
  shoulderOrbitRadians: number,
  distance: number
): Vec3 {
  const horizontalDistance = Math.sqrt(
    Math.max(distance * distance - verticalOffset * verticalOffset, distance * distance * 0.45)
  );
  const lateralOffset = horizontalDistance * Math.sin(shoulderOrbitRadians);
  const backOffset = horizontalDistance * Math.cos(shoulderOrbitRadians);

  return addVec3(
    addVec3(conversationMidpoint, scaleVec3(pairDirection, -backOffset)),
    {
      x: pairRight.x * lateralOffset * sideSign,
      y: verticalOffset,
      z: pairRight.z * lateralOffset * sideSign
    }
  );
}

function projectPointToDialogueViewNdc(
  point: Vec3,
  cameraPosition: Vec3,
  cameraForward: Vec3,
  cameraRight: Vec3,
  cameraUp: Vec3,
  verticalFovRadians: number,
  aspect: number
) {
  const relativePoint = subtractVec3(point, cameraPosition);
  const depth = Math.max(dotVec3(relativePoint, cameraForward), CAMERA_SIDE_EPSILON);
  const tanVerticalHalfFov = Math.tan(verticalFovRadians * 0.5);
  const tanHorizontalHalfFov = tanVerticalHalfFov * aspect;

  return {
    x:
      dotVec3(relativePoint, cameraRight) /
      Math.max(depth * tanHorizontalHalfFov, CAMERA_SIDE_EPSILON),
    y:
      dotVec3(relativePoint, cameraUp) /
      Math.max(depth * tanVerticalHalfFov, CAMERA_SIDE_EPSILON)
  };
}

function measureDialogueAttentionFrame(
  playerFocusPoint: Vec3,
  npcFocusPoint: Vec3,
  pairRight: Vec3,
  cameraPosition: Vec3,
  lookTarget: Vec3,
  verticalFovRadians: number,
  aspect: number
) {
  const worldUp = {
    x: 0,
    y: 1,
    z: 0
  };
  const cameraForward =
    normalizeVec3(subtractVec3(lookTarget, cameraPosition)) ?? {
      x: 0,
      y: 0,
      z: 1
    };
  const cameraRight =
    normalizeVec3(crossVec3(cameraForward, worldUp)) ??
    normalizeVec3(pairRight) ?? {
      x: 1,
      y: 0,
      z: 0
    };
  const cameraUp =
    normalizeVec3(crossVec3(cameraRight, cameraForward)) ?? worldUp;
  const samplePoints = [
    ...createDialogueParticipantSamplePoints(playerFocusPoint, pairRight),
    ...createDialogueParticipantSamplePoints(npcFocusPoint, pairRight)
  ];
  let maxAbsNdcX = 0;
  let maxAbsNdcY = 0;

  for (const point of samplePoints) {
    const projected = projectPointToDialogueViewNdc(
      point,
      cameraPosition,
      cameraForward,
      cameraRight,
      cameraUp,
      verticalFovRadians,
      aspect
    );
    maxAbsNdcX = Math.max(maxAbsNdcX, Math.abs(projected.x));
    maxAbsNdcY = Math.max(maxAbsNdcY, Math.abs(projected.y));
  }

  const projectedPlayerFocus = projectPointToDialogueViewNdc(
    playerFocusPoint,
    cameraPosition,
    cameraForward,
    cameraRight,
    cameraUp,
    verticalFovRadians,
    aspect
  );
  const projectedNpcFocus = projectPointToDialogueViewNdc(
    npcFocusPoint,
    cameraPosition,
    cameraForward,
    cameraRight,
    cameraUp,
    verticalFovRadians,
    aspect
  );

  return {
    maxAbsNdcX,
    maxAbsNdcY,
    focusSeparationNdcX: Math.abs(projectedNpcFocus.x - projectedPlayerFocus.x)
  };
}

function resolveDialogueAttentionSideSign(
  options: ResolveDialogueAttentionCameraOptions,
  conversationMidpoint: Vec3,
  pairRight: Vec3
): DialogueAttentionSideSign {
  if (options.previousSideSign !== undefined && options.previousSideSign !== null) {
    return options.previousSideSign;
  }

  const referenceOffset = subtractVec3(
    options.referenceCameraPosition,
    conversationMidpoint
  );
  const sideMetric = dotVec3(toHorizontal(referenceOffset), pairRight);

  if (Math.abs(sideMetric) > CAMERA_SIDE_EPSILON) {
    return sideMetric >= 0 ? 1 : -1;
  }

  const referenceForward =
    normalizeVec3(
      toHorizontal(
        subtractVec3(
          options.referenceLookTarget,
          options.referenceCameraPosition
        )
      )
    ) ??
    normalizeVec3(toHorizontal(subtractVec3(options.npcFocusPoint, options.playerFocusPoint))) ??
    {
      x: 0,
      y: 0,
      z: 1
    };
  const referenceRight = rotateHorizontalRight(referenceForward);
  const facingMetric = dotVec3(referenceRight, pairRight);

  if (Math.abs(facingMetric) > CAMERA_SIDE_EPSILON) {
    return facingMetric >= 0 ? 1 : -1;
  }

  return 1;
}

export function resolveDialogueAttentionCameraSolution(
  options: ResolveDialogueAttentionCameraOptions
): DialogueAttentionCameraSolution {
  const pairVector = subtractVec3(options.npcFocusPoint, options.playerFocusPoint);
  const subjectDistance = lengthVec3(pairVector);
  const pairDirection =
    normalizeVec3(toHorizontal(pairVector)) ??
    normalizeVec3(
      toHorizontal(
        subtractVec3(
          options.referenceLookTarget,
          options.referenceCameraPosition
        )
      )
    ) ?? {
      x: 0,
      y: 0,
      z: 1
    };
  const pairRight = rotateHorizontalRight(pairDirection);
  const conversationMidpoint = lerpVec3(
    options.playerFocusPoint,
    options.npcFocusPoint,
    0.5
  );
  const sideSign = resolveDialogueAttentionSideSign(
    options,
    conversationMidpoint,
    pairRight
  );
  const preferredConversationDistance =
    options.preferredConversationDistance ??
    DEFAULT_DIALOGUE_ATTENTION_DISTANCE;
  const preferredConversationHeight =
    options.preferredConversationHeight ?? DEFAULT_DIALOGUE_ATTENTION_HEIGHT;
  const verticalFovRadians =
    options.cameraVerticalFovRadians ??
    DEFAULT_DIALOGUE_ATTENTION_VERTICAL_FOV_RADIANS;
  const aspect = Math.max(
    options.cameraAspect ?? DEFAULT_DIALOGUE_ATTENTION_CAMERA_ASPECT,
    CAMERA_SIDE_EPSILON
  );
  let desiredDistance = clampScalar(
    preferredConversationDistance + subjectDistance * 0.18,
    MIN_DIALOGUE_ATTENTION_DISTANCE,
    MAX_DIALOGUE_ATTENTION_DISTANCE
  );
  const verticalOffset =
    preferredConversationHeight + Math.min(0.42, subjectDistance * 0.05);
  const shoulderOrbitRadians = clampScalar(
    MIN_DIALOGUE_ATTENTION_SHOULDER_ORBIT_RADIANS + subjectDistance * 0.02,
    MIN_DIALOGUE_ATTENTION_SHOULDER_ORBIT_RADIANS,
    MAX_DIALOGUE_ATTENTION_SHOULDER_ORBIT_RADIANS
  );
  const lookTarget = addVec3(
    addVec3(
      conversationMidpoint,
      scaleVec3(
        pairDirection,
        clampScalar(
          subjectDistance * 0.12,
          MIN_DIALOGUE_ATTENTION_LOOK_AHEAD,
          MAX_DIALOGUE_ATTENTION_LOOK_AHEAD
        )
      )
    ),
    addVec3(
      scaleVec3(
        pairRight,
        -sideSign *
          clampScalar(
            subjectDistance * 0.03,
            MIN_DIALOGUE_ATTENTION_COMPOSITION_OFFSET,
            MAX_DIALOGUE_ATTENTION_COMPOSITION_OFFSET
          )
      ),
      {
        x: 0,
        y: 0.05,
        z: 0
      }
    )
  );
  let position = resolveDialogueAttentionCameraPosition(
    conversationMidpoint,
    pairDirection,
    pairRight,
    sideSign,
    verticalOffset,
    shoulderOrbitRadians,
    desiredDistance
  );

  for (let iteration = 0; iteration < MAX_DIALOGUE_ATTENTION_FIT_ITERATIONS; iteration += 1) {
    const frame = measureDialogueAttentionFrame(
      options.playerFocusPoint,
      options.npcFocusPoint,
      pairRight,
      position,
      lookTarget,
      verticalFovRadians,
      aspect
    );
    const widthRatio =
      frame.maxAbsNdcX / DIALOGUE_ATTENTION_SAFE_FRAME_MAX_ABS_NDC_X;
    const heightRatio =
      frame.maxAbsNdcY / DIALOGUE_ATTENTION_SAFE_FRAME_MAX_ABS_NDC_Y;
    const requiredScale = Math.max(widthRatio, heightRatio, 1);

    if (requiredScale <= 1.001 || desiredDistance >= MAX_DIALOGUE_ATTENTION_DISTANCE) {
      break;
    }

    desiredDistance = clampScalar(
      desiredDistance * Math.min(requiredScale * 1.04, 1.35),
      MIN_DIALOGUE_ATTENTION_DISTANCE,
      MAX_DIALOGUE_ATTENTION_DISTANCE
    );
    position = resolveDialogueAttentionCameraPosition(
      conversationMidpoint,
      pairDirection,
      pairRight,
      sideSign,
      verticalOffset,
      shoulderOrbitRadians,
      desiredDistance
    );
  }

  for (
    let iteration = 0;
    iteration < MAX_DIALOGUE_ATTENTION_TIGHTEN_ITERATIONS;
    iteration += 1
  ) {
    const currentFrame = measureDialogueAttentionFrame(
      options.playerFocusPoint,
      options.npcFocusPoint,
      pairRight,
      position,
      lookTarget,
      verticalFovRadians,
      aspect
    );

    if (
      currentFrame.focusSeparationNdcX >=
        DIALOGUE_ATTENTION_TARGET_MIN_ABS_FOCUS_SEPARATION_NDC_X ||
      desiredDistance <= MIN_DIALOGUE_ATTENTION_DISTANCE + 1e-3
    ) {
      break;
    }

    const tightenedDistance = clampScalar(
      desiredDistance *
        Math.max(
          currentFrame.focusSeparationNdcX /
            DIALOGUE_ATTENTION_TARGET_MIN_ABS_FOCUS_SEPARATION_NDC_X,
          0.84
        ),
      MIN_DIALOGUE_ATTENTION_DISTANCE,
      MAX_DIALOGUE_ATTENTION_DISTANCE
    );

    if (tightenedDistance >= desiredDistance - 1e-3) {
      break;
    }

    const tightenedPosition = resolveDialogueAttentionCameraPosition(
      conversationMidpoint,
      pairDirection,
      pairRight,
      sideSign,
      verticalOffset,
      shoulderOrbitRadians,
      tightenedDistance
    );
    const tightenedFrame = measureDialogueAttentionFrame(
      options.playerFocusPoint,
      options.npcFocusPoint,
      pairRight,
      tightenedPosition,
      lookTarget,
      verticalFovRadians,
      aspect
    );

    if (
      tightenedFrame.maxAbsNdcX > DIALOGUE_ATTENTION_SAFE_FRAME_MAX_ABS_NDC_X ||
      tightenedFrame.maxAbsNdcY > DIALOGUE_ATTENTION_SAFE_FRAME_MAX_ABS_NDC_Y
    ) {
      break;
    }

    desiredDistance = tightenedDistance;
    position = tightenedPosition;
  }

  return {
    pivot: conversationMidpoint,
    position,
    lookTarget,
    sideSign,
    subjectDistance
  };
}
