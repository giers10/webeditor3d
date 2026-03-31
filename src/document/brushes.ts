import { createOpaqueId } from "../core/ids";
import type { Vec3 } from "../core/vector";

export const BOX_FACE_IDS = ["posX", "negX", "posY", "negY", "posZ", "negZ"] as const;

export type BoxFaceId = (typeof BOX_FACE_IDS)[number];

export interface BrushFace {
  materialId: string | null;
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
    materialId: face.materialId
  };
}

export function isBoxFaceId(value: unknown): value is BoxFaceId {
  return typeof value === "string" && BOX_FACE_IDS.some((faceId) => faceId === value);
}

export function hasPositiveBoxSize(size: Vec3): boolean {
  return size.x > 0 && size.y > 0 && size.z > 0;
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
      materialId: null
    },
    negX: {
      materialId: null
    },
    posY: {
      materialId: null
    },
    negY: {
      materialId: null
    },
    posZ: {
      materialId: null
    },
    negZ: {
      materialId: null
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
