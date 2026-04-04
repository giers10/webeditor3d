import { createOpaqueId } from "../core/ids";
import type { Vec2, Vec3 } from "../core/vector";

export const BOX_FACE_IDS = ["posX", "negX", "posY", "negY", "posZ", "negZ"] as const;
export const BOX_EDGE_IDS = [
  "edgeX_negY_negZ",
  "edgeX_posY_negZ",
  "edgeX_negY_posZ",
  "edgeX_posY_posZ",
  "edgeY_negX_negZ",
  "edgeY_posX_negZ",
  "edgeY_negX_posZ",
  "edgeY_posX_posZ",
  "edgeZ_negX_negY",
  "edgeZ_posX_negY",
  "edgeZ_negX_posY",
  "edgeZ_posX_posY"
] as const;
export const BOX_VERTEX_IDS = [
  "negX_negY_negZ",
  "posX_negY_negZ",
  "negX_posY_negZ",
  "posX_posY_negZ",
  "negX_negY_posZ",
  "posX_negY_posZ",
  "negX_posY_posZ",
  "posX_posY_posZ"
] as const;
export const FACE_UV_ROTATION_QUARTER_TURNS = [0, 1, 2, 3] as const;

export type BoxFaceId = (typeof BOX_FACE_IDS)[number];
export type BoxEdgeId = (typeof BOX_EDGE_IDS)[number];
export type BoxVertexId = (typeof BOX_VERTEX_IDS)[number];
export type FaceUvRotationQuarterTurns = (typeof FACE_UV_ROTATION_QUARTER_TURNS)[number];

export const BOX_FACE_LABELS: Record<BoxFaceId, string> = {
  posX: "Right",
  negX: "Left",
  posY: "Top",
  negY: "Bottom",
  posZ: "Front",
  negZ: "Back"
};

export const BOX_EDGE_LABELS: Record<BoxEdgeId, string> = {
  edgeX_negY_negZ: "X Edge (-Y, -Z)",
  edgeX_posY_negZ: "X Edge (+Y, -Z)",
  edgeX_negY_posZ: "X Edge (-Y, +Z)",
  edgeX_posY_posZ: "X Edge (+Y, +Z)",
  edgeY_negX_negZ: "Y Edge (-X, -Z)",
  edgeY_posX_negZ: "Y Edge (+X, -Z)",
  edgeY_negX_posZ: "Y Edge (-X, +Z)",
  edgeY_posX_posZ: "Y Edge (+X, +Z)",
  edgeZ_negX_negY: "Z Edge (-X, -Y)",
  edgeZ_posX_negY: "Z Edge (+X, -Y)",
  edgeZ_negX_posY: "Z Edge (-X, +Y)",
  edgeZ_posX_posY: "Z Edge (+X, +Y)"
};

export const BOX_VERTEX_LABELS: Record<BoxVertexId, string> = {
  negX_negY_negZ: "Vertex (-X, -Y, -Z)",
  posX_negY_negZ: "Vertex (+X, -Y, -Z)",
  negX_posY_negZ: "Vertex (-X, +Y, -Z)",
  posX_posY_negZ: "Vertex (+X, +Y, -Z)",
  negX_negY_posZ: "Vertex (-X, -Y, +Z)",
  posX_negY_posZ: "Vertex (+X, -Y, +Z)",
  negX_posY_posZ: "Vertex (-X, +Y, +Z)",
  posX_posY_posZ: "Vertex (+X, +Y, +Z)"
};

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
  name?: string;
  center: Vec3;
  rotationDegrees: Vec3;
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

export const DEFAULT_BOX_BRUSH_ROTATION_DEGREES: Vec3 = {
  x: 0,
  y: 0,
  z: 0
};

export function normalizeBrushName(name: string | null | undefined): string | undefined {
  if (name === undefined || name === null) {
    return undefined;
  }

  const trimmedName = name.trim();
  return trimmedName.length === 0 ? undefined : trimmedName;
}

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

export function isBoxEdgeId(value: unknown): value is BoxEdgeId {
  return typeof value === "string" && BOX_EDGE_IDS.some((edgeId) => edgeId === value);
}

export function isBoxVertexId(value: unknown): value is BoxVertexId {
  return typeof value === "string" && BOX_VERTEX_IDS.some((vertexId) => vertexId === value);
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
  overrides: Partial<Pick<BoxBrush, "id" | "name" | "center" | "rotationDegrees" | "size" | "faces" | "layerId" | "groupId">> = {}
): BoxBrush {
  const center = cloneVec3(overrides.center ?? DEFAULT_BOX_BRUSH_CENTER);
  const rotationDegrees = cloneVec3(overrides.rotationDegrees ?? DEFAULT_BOX_BRUSH_ROTATION_DEGREES);
  const size = cloneVec3(overrides.size ?? DEFAULT_BOX_BRUSH_SIZE);

  if (!hasPositiveBoxSize(size)) {
    throw new Error("Box brush size must remain positive on every axis.");
  }

  return {
    id: overrides.id ?? createOpaqueId("brush"),
    kind: "box",
    name: normalizeBrushName(overrides.name),
    center,
    rotationDegrees,
    size,
    faces: overrides.faces === undefined ? createDefaultBoxBrushFaces() : cloneBoxBrushFaces(overrides.faces),
    layerId: overrides.layerId,
    groupId: overrides.groupId
  };
}

export function cloneBoxBrush(brush: BoxBrush): BoxBrush {
  return createBoxBrush(brush);
}
