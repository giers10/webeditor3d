import { createOpaqueId } from "../core/ids";
import type { Vec2, Vec3 } from "../core/vector";

export const BOX_FACE_IDS = ["posX", "negX", "posY", "negY", "posZ", "negZ"] as const;
export const FACE_UV_ROTATION_QUARTER_TURNS = [0, 1, 2, 3] as const;

export type BoxFaceId = (typeof BOX_FACE_IDS)[number];
export type FaceUvRotationQuarterTurns = (typeof FACE_UV_ROTATION_QUARTER_TURNS)[number];

export interface FaceUvState {
  offset: Vec2;
  scale: Vec2;
  rotationQuarterTurns: FaceUvRotationQuarterTurns;
  flipU: boolean;
  flipV: boolean;
}

export interface BrushFace {
  materialId: string | null;
  uv: FaceUvState;
}

export type BoxBrushFaces = Record<BoxFaceId, BrushFace>;

export interface BoxBrush {
  id: string;
  kind: "box";
  center: Vec3;
  size: Vec3;
  faces: BoxBrushFaces;
  layerId?: string;
  groupId?: string;
}

export type Brush = BoxBrush;

export const DEFAULT_BOX_BRUSH_CENTER: Vec3 = {
  x: 0,
  y: 1,
  z: 0
};

export const DEFAULT_BOX_BRUSH_SIZE: Vec3 = {
  x: 2,
  y: 2,
  z: 2
};

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function cloneBrushFace(face: BrushFace): BrushFace {
  return {
    materialId: face.materialId,
    uv: cloneFaceUvState(face.uv)
  };
}

export function isBoxFaceId(value: unknown): value is BoxFaceId {
  return typeof value === "string" && BOX_FACE_IDS.some((faceId) => faceId === value);
}

export function isFaceUvRotationQuarterTurns(value: unknown): value is FaceUvRotationQuarterTurns {
  return typeof value === "number" && FACE_UV_ROTATION_QUARTER_TURNS.includes(value as FaceUvRotationQuarterTurns);
}

export function hasPositiveBoxSize(size: Vec3): boolean {
  return size.x > 0 && size.y > 0 && size.z > 0;
}

export function createDefaultFaceUvState(): FaceUvState {
  return {
    offset: {
      x: 0,
      y: 0
    },
    scale: {
      x: 1,
      y: 1
    },
    rotationQuarterTurns: 0,
    flipU: false,
    flipV: false
  };
}

export function cloneFaceUvState(uv: FaceUvState): FaceUvState {
  return {
    offset: {
      ...uv.offset
    },
    scale: {
      ...uv.scale
    },
    rotationQuarterTurns: uv.rotationQuarterTurns,
    flipU: uv.flipU,
    flipV: uv.flipV
  };
}

export function cloneBoxBrushFaces(faces: BoxBrushFaces): BoxBrushFaces {
  return {
    posX: cloneBrushFace(faces.posX),
    negX: cloneBrushFace(faces.negX),
    posY: cloneBrushFace(faces.posY),
    negY: cloneBrushFace(faces.negY),
    posZ: cloneBrushFace(faces.posZ),
    negZ: cloneBrushFace(faces.negZ)
  };
}

export function createDefaultBoxBrushFaces(): BoxBrushFaces {
  return {
    posX: {
      materialId: null,
      uv: createDefaultFaceUvState()
    },
    negX: {
      materialId: null,
      uv: createDefaultFaceUvState()
    },
    posY: {
      materialId: null,
      uv: createDefaultFaceUvState()
    },
    negY: {
      materialId: null,
      uv: createDefaultFaceUvState()
    },
    posZ: {
      materialId: null,
      uv: createDefaultFaceUvState()
    },
    negZ: {
      materialId: null,
      uv: createDefaultFaceUvState()
    }
  };
}

export function createBoxBrush(
  overrides: Partial<Pick<BoxBrush, "id" | "center" | "size" | "faces" | "layerId" | "groupId">> = {}
): BoxBrush {
  const center = cloneVec3(overrides.center ?? DEFAULT_BOX_BRUSH_CENTER);
  const size = cloneVec3(overrides.size ?? DEFAULT_BOX_BRUSH_SIZE);

  if (!hasPositiveBoxSize(size)) {
    throw new Error("Box brush size must remain positive on every axis.");
  }

  return {
    id: overrides.id ?? createOpaqueId("brush"),
    kind: "box",
    center,
    size,
    faces: overrides.faces === undefined ? createDefaultBoxBrushFaces() : cloneBoxBrushFaces(overrides.faces),
    layerId: overrides.layerId,
    groupId: overrides.groupId
  };
}

export function cloneBoxBrush(brush: BoxBrush): BoxBrush {
  return createBoxBrush(brush);
}
