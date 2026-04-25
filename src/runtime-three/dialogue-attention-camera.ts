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
}

const DEFAULT_DIALOGUE_ATTENTION_DISTANCE = 3.8;
const DEFAULT_DIALOGUE_ATTENTION_HEIGHT = 0.48;
const MIN_DIALOGUE_ATTENTION_DISTANCE = 3.2;
const MAX_DIALOGUE_ATTENTION_DISTANCE = 7.5;
const MIN_DIALOGUE_ATTENTION_LOOK_AHEAD = 0.08;
const MAX_DIALOGUE_ATTENTION_LOOK_AHEAD = 0.28;
const MIN_DIALOGUE_ATTENTION_COMPOSITION_OFFSET = 0.03;
const MAX_DIALOGUE_ATTENTION_COMPOSITION_OFFSET = 0.14;
const MIN_DIALOGUE_ATTENTION_SHOULDER_ORBIT_RADIANS = 0.56;
const MAX_DIALOGUE_ATTENTION_SHOULDER_ORBIT_RADIANS = 0.68;
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
  const desiredDistance = clampScalar(
    preferredConversationDistance + subjectDistance * 0.42,
    MIN_DIALOGUE_ATTENTION_DISTANCE,
    MAX_DIALOGUE_ATTENTION_DISTANCE
  );
  const verticalOffset =
    preferredConversationHeight + Math.min(0.42, subjectDistance * 0.05);
  const horizontalDistance = Math.sqrt(
    Math.max(
      desiredDistance * desiredDistance - verticalOffset * verticalOffset,
      desiredDistance * desiredDistance * 0.45
    )
  );
  const shoulderOrbitRadians = clampScalar(
    MIN_DIALOGUE_ATTENTION_SHOULDER_ORBIT_RADIANS + subjectDistance * 0.02,
    MIN_DIALOGUE_ATTENTION_SHOULDER_ORBIT_RADIANS,
    MAX_DIALOGUE_ATTENTION_SHOULDER_ORBIT_RADIANS
  );
  const lateralOffset = horizontalDistance * Math.sin(shoulderOrbitRadians);
  const backOffset = horizontalDistance * Math.cos(shoulderOrbitRadians);
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

  return {
    pivot: conversationMidpoint,
    position: addVec3(
      addVec3(
        conversationMidpoint,
        scaleVec3(pairDirection, -backOffset)
      ),
      {
        x: pairRight.x * lateralOffset * sideSign,
        y: verticalOffset,
        z: pairRight.z * lateralOffset * sideSign
      }
    ),
    lookTarget,
    sideSign,
    subjectDistance
  };
}
