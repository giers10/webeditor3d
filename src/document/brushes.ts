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
export const WEDGE_FACE_IDS = ["bottom", "back", "slope", "left", "right"] as const;
export const WEDGE_EDGE_IDS = [
  "bottomBack",
  "bottomFront",
  "bottomLeft",
  "bottomRight",
  "topBack",
  "leftBack",
  "rightBack",
  "leftSlope",
  "rightSlope"
] as const;
export const WEDGE_VERTEX_IDS = [
  "negX_negY_negZ",
  "posX_negY_negZ",
  "negX_negY_posZ",
  "posX_negY_posZ",
  "negX_posY_negZ",
  "posX_posY_negZ"
] as const;
export const FACE_UV_ROTATION_QUARTER_TURNS = [0, 1, 2, 3] as const;
export const BOX_BRUSH_VOLUME_MODES = ["none", "water", "fog", "light"] as const;
export const BOX_BRUSH_LIGHT_FALLOFF_MODES = ["linear", "smoothstep"] as const;
export const DEFAULT_RADIAL_PRISM_SIDE_COUNT = 12 as const;
export const DEFAULT_CONE_SIDE_COUNT = 12 as const;
export const DEFAULT_TORUS_MAJOR_SEGMENT_COUNT = 16 as const;
export const DEFAULT_TORUS_TUBE_SEGMENT_COUNT = 8 as const;

export type BoxFaceId = (typeof BOX_FACE_IDS)[number];
export type BoxEdgeId = (typeof BOX_EDGE_IDS)[number];
export type BoxVertexId = (typeof BOX_VERTEX_IDS)[number];
export type WedgeFaceId = (typeof WEDGE_FACE_IDS)[number];
export type WedgeEdgeId = (typeof WEDGE_EDGE_IDS)[number];
export type WedgeVertexId = (typeof WEDGE_VERTEX_IDS)[number];
export type RadialPrismFaceId = "top" | "bottom" | `side-${number}`;
export type RadialPrismEdgeId =
  | `top-${number}`
  | `bottom-${number}`
  | `vertical-${number}`;
export type RadialPrismVertexId = `top-${number}` | `bottom-${number}`;
export type ConeFaceId = "bottom" | `side-${number}`;
export type ConeEdgeId = `bottom-${number}` | `side-${number}`;
export type ConeVertexId = "apex" | `bottom-${number}`;
export type TorusFaceId = `face-${number}-${number}`;
export type TorusEdgeId = `major-${number}-${number}` | `tube-${number}-${number}`;
export type TorusVertexId = `vertex-${number}-${number}`;
export type WhiteboxFaceId = string;
export type WhiteboxEdgeId = string;
export type WhiteboxVertexId = string;
export type FaceUvRotationQuarterTurns = (typeof FACE_UV_ROTATION_QUARTER_TURNS)[number];
export type BoxBrushVolumeMode = (typeof BOX_BRUSH_VOLUME_MODES)[number];
export type BoxBrushLightFalloffMode =
  (typeof BOX_BRUSH_LIGHT_FALLOFF_MODES)[number];
export type BrushKind = "box" | "wedge" | "radialPrism" | "cone" | "torus";

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

export const WEDGE_FACE_LABELS: Record<WedgeFaceId, string> = {
  bottom: "Bottom",
  back: "Back",
  slope: "Slope",
  left: "Left",
  right: "Right"
};

export const WEDGE_EDGE_LABELS: Record<WedgeEdgeId, string> = {
  bottomBack: "Bottom Back",
  bottomFront: "Bottom Front",
  bottomLeft: "Bottom Left",
  bottomRight: "Bottom Right",
  topBack: "Top Back",
  leftBack: "Left Back",
  rightBack: "Right Back",
  leftSlope: "Left Slope",
  rightSlope: "Right Slope"
};

export const WEDGE_VERTEX_LABELS: Record<WedgeVertexId, string> = {
  negX_negY_negZ: "Back Left Bottom",
  posX_negY_negZ: "Back Right Bottom",
  negX_negY_posZ: "Front Left Bottom",
  posX_negY_posZ: "Front Right Bottom",
  negX_posY_negZ: "Back Left Top",
  posX_posY_negZ: "Back Right Top"
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

export interface BoxBrushWaterSettings {
  colorHex: string;
  surfaceOpacity: number;
  waveStrength: number;
  foamContactLimit: number;
  surfaceDisplacementEnabled: boolean;
}

export interface BoxBrushFogSettings {
  colorHex: string;
  density: number;
  padding: number;
}

export interface BoxBrushLightSettings {
  colorHex: string;
  intensity: number;
  padding: number;
  falloff: BoxBrushLightFalloffMode;
}

export type BoxBrushVolumeSettings =
  | {
      mode: "none";
    }
  | {
      mode: "water";
      water: BoxBrushWaterSettings;
    }
  | {
      mode: "fog";
      fog: BoxBrushFogSettings;
    }
  | {
      mode: "light";
      light: BoxBrushLightSettings;
    };

export type BrushVolumeSettings = BoxBrushVolumeSettings;
export interface BrushGeometry {
  vertices: Record<WhiteboxVertexId, Vec3>;
}

export type BoxBrushFaces = Record<WhiteboxFaceId, BrushFace> &
  Record<BoxFaceId, BrushFace>;
export type BoxBrushGeometryVertices = Record<WhiteboxVertexId, Vec3> &
  Record<BoxVertexId, Vec3>;
export interface BoxBrushGeometry extends BrushGeometry {
  vertices: BoxBrushGeometryVertices;
}

export type WedgeBrushFaces = Record<WhiteboxFaceId, BrushFace> &
  Record<WedgeFaceId, BrushFace>;
export type WedgeBrushGeometryVertices = Record<WhiteboxVertexId, Vec3> &
  Record<WedgeVertexId, Vec3>;
export interface WedgeBrushGeometry extends BrushGeometry {
  vertices: WedgeBrushGeometryVertices;
}

export interface RadialPrismBrushGeometry extends BrushGeometry {
  vertices: Record<WhiteboxVertexId, Vec3> & Record<RadialPrismVertexId, Vec3>;
}

export interface ConeBrushGeometry extends BrushGeometry {
  vertices: Record<WhiteboxVertexId, Vec3> & Record<ConeVertexId, Vec3>;
}

export interface TorusBrushGeometry extends BrushGeometry {
  vertices: Record<WhiteboxVertexId, Vec3> & Record<TorusVertexId, Vec3>;
}

interface BrushBase {
  id: string;
  name?: string;
  visible: boolean;
  enabled: boolean;
  center: Vec3;
  rotationDegrees: Vec3;
  size: Vec3;
  layerId?: string;
  groupId?: string;
}

export interface BoxBrush extends BrushBase {
  kind: "box";
  geometry: BoxBrushGeometry;
  faces: BoxBrushFaces;
  volume: BoxBrushVolumeSettings;
}

export interface WedgeBrush extends BrushBase {
  kind: "wedge";
  geometry: WedgeBrushGeometry;
  faces: WedgeBrushFaces;
  volume: BoxBrushVolumeSettings;
}

export interface RadialPrismBrush extends BrushBase {
  kind: "radialPrism";
  sideCount: number;
  geometry: RadialPrismBrushGeometry;
  faces: Record<WhiteboxFaceId, BrushFace> & Record<RadialPrismFaceId, BrushFace>;
  volume: BoxBrushVolumeSettings;
}

export interface ConeBrush extends BrushBase {
  kind: "cone";
  sideCount: number;
  geometry: ConeBrushGeometry;
  faces: Record<WhiteboxFaceId, BrushFace> & Record<ConeFaceId, BrushFace>;
  volume: BoxBrushVolumeSettings;
}

export interface TorusBrush extends BrushBase {
  kind: "torus";
  majorSegmentCount: number;
  tubeSegmentCount: number;
  geometry: TorusBrushGeometry;
  faces: Record<WhiteboxFaceId, BrushFace> & Record<TorusFaceId, BrushFace>;
  volume: BoxBrushVolumeSettings;
}

export type Brush =
  | BoxBrush
  | WedgeBrush
  | RadialPrismBrush
  | ConeBrush
  | TorusBrush;

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

export const DEFAULT_WEDGE_BRUSH_ROTATION_DEGREES: Vec3 = {
  x: 0,
  y: 0,
  z: 180
};

export const DEFAULT_BOX_BRUSH_VISIBLE = true;
export const DEFAULT_BOX_BRUSH_ENABLED = true;

export const DEFAULT_TORUS_BRUSH_SIZE: Vec3 = {
  x: 4,
  y: 1,
  z: 4
};

export const DEFAULT_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT = 6;
export const MAX_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT = 24;

const DEFAULT_BOX_BRUSH_WATER_SETTINGS: BoxBrushWaterSettings = {
  colorHex: "#4da6d9",
  surfaceOpacity: 0.55,
  waveStrength: 0.35,
  foamContactLimit: DEFAULT_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT,
  surfaceDisplacementEnabled: false
};

const DEFAULT_BOX_BRUSH_FOG_SETTINGS: BoxBrushFogSettings = {
  colorHex: "#9cb7c7",
  density: 0.08,
  padding: 0.2
};

const DEFAULT_BOX_BRUSH_LIGHT_SETTINGS: BoxBrushLightSettings = {
  colorHex: "#ffffff",
  intensity: 1.25,
  padding: 0.35,
  falloff: "smoothstep"
};

function cloneVec3(vector: Vec3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

export function normalizeBrushName(name: string | null | undefined): string | undefined {
  if (name === undefined || name === null) {
    return undefined;
  }

  const trimmedName = name.trim();
  return trimmedName.length === 0 ? undefined : trimmedName;
}

export function isBoxBrush(brush: Brush): brush is BoxBrush {
  return brush.kind === "box";
}

export function isWedgeBrush(brush: Brush): brush is WedgeBrush {
  return brush.kind === "wedge";
}

export function isRadialPrismBrush(brush: Brush): brush is RadialPrismBrush {
  return brush.kind === "radialPrism";
}

export function isConeBrush(brush: Brush): brush is ConeBrush {
  return brush.kind === "cone";
}

export function isTorusBrush(brush: Brush): brush is TorusBrush {
  return brush.kind === "torus";
}

function cloneBrushFace(face: BrushFace): BrushFace {
  return {
    materialId: face.materialId,
    uv: cloneFaceUvState(face.uv)
  };
}

function cloneBrushGeometryVertex(vertex: Vec3): Vec3 {
  return {
    x: vertex.x,
    y: vertex.y,
    z: vertex.z
  };
}

export function cloneBrushGeometry<T extends BrushGeometry>(geometry: T): T {
  return {
    vertices: Object.fromEntries(
      Object.entries(geometry.vertices).map(([vertexId, vertex]) => [
        vertexId,
        cloneBrushGeometryVertex(vertex)
      ])
    ) as T["vertices"]
  } as T;
}

export function cloneBoxBrushGeometry(geometry: BoxBrushGeometry): BoxBrushGeometry {
  return cloneBrushGeometry(geometry);
}

export function getBrushGeometryLocalBounds(
  geometry: BrushGeometry
): { min: Vec3; max: Vec3 } {
  const vertices = Object.values(geometry.vertices);
  const firstVertex = vertices[0];
  const min = { ...firstVertex };
  const max = { ...firstVertex };

  for (const vertex of vertices.slice(1)) {
    min.x = Math.min(min.x, vertex.x);
    min.y = Math.min(min.y, vertex.y);
    min.z = Math.min(min.z, vertex.z);
    max.x = Math.max(max.x, vertex.x);
    max.y = Math.max(max.y, vertex.y);
    max.z = Math.max(max.z, vertex.z);
  }

  return {
    min,
    max
  };
}

export function getBoxBrushGeometryLocalBounds(
  geometry: BoxBrushGeometry
): { min: Vec3; max: Vec3 } {
  return getBrushGeometryLocalBounds(geometry);
}

export function deriveBrushSizeFromGeometry(geometry: BrushGeometry): Vec3 {
  const bounds = getBrushGeometryLocalBounds(geometry);

  return {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z
  };
}

export function deriveBoxBrushSizeFromGeometry(geometry: BoxBrushGeometry): Vec3 {
  return deriveBrushSizeFromGeometry(geometry);
}

export function scaleBrushGeometryToSize<T extends BrushGeometry>(
  geometry: T,
  size: Vec3
): T {
  const bounds = getBrushGeometryLocalBounds(geometry);
  const currentSize = deriveBrushSizeFromGeometry(geometry);

  if (!hasPositiveBoxSize(currentSize) || !hasPositiveBoxSize(size)) {
    throw new Error("Whitebox geometry size must remain positive on every axis.");
  }

  const center = {
    x: (bounds.min.x + bounds.max.x) * 0.5,
    y: (bounds.min.y + bounds.max.y) * 0.5,
    z: (bounds.min.z + bounds.max.z) * 0.5
  };
  const scale = {
    x: size.x / currentSize.x,
    y: size.y / currentSize.y,
    z: size.z / currentSize.z
  };

  return {
    vertices: Object.fromEntries(
      Object.entries(geometry.vertices).map(([vertexId, vertex]) => [
        vertexId,
        {
          x: center.x + (vertex.x - center.x) * scale.x,
          y: center.y + (vertex.y - center.y) * scale.y,
          z: center.z + (vertex.z - center.z) * scale.z
        }
      ])
    ) as T["vertices"]
  } as T;
}

export function scaleBoxBrushGeometryToSize(
  geometry: BoxBrushGeometry,
  size: Vec3
): BoxBrushGeometry {
  return scaleBrushGeometryToSize(geometry, size);
}

export function createDefaultBoxBrushGeometry(
  size: Vec3 = DEFAULT_BOX_BRUSH_SIZE
): BoxBrushGeometry {
  const halfSize = {
    x: size.x * 0.5,
    y: size.y * 0.5,
    z: size.z * 0.5
  };

  return {
    vertices: {
      negX_negY_negZ: { x: -halfSize.x, y: -halfSize.y, z: -halfSize.z },
      posX_negY_negZ: { x: halfSize.x, y: -halfSize.y, z: -halfSize.z },
      negX_posY_negZ: { x: -halfSize.x, y: halfSize.y, z: -halfSize.z },
      posX_posY_negZ: { x: halfSize.x, y: halfSize.y, z: -halfSize.z },
      negX_negY_posZ: { x: -halfSize.x, y: -halfSize.y, z: halfSize.z },
      posX_negY_posZ: { x: halfSize.x, y: -halfSize.y, z: halfSize.z },
      negX_posY_posZ: { x: -halfSize.x, y: halfSize.y, z: halfSize.z },
      posX_posY_posZ: { x: halfSize.x, y: halfSize.y, z: halfSize.z }
    }
  };
}

export function createDefaultWedgeBrushGeometry(
  size: Vec3 = DEFAULT_BOX_BRUSH_SIZE
): WedgeBrushGeometry {
  const halfSize = {
    x: size.x * 0.5,
    y: size.y * 0.5,
    z: size.z * 0.5
  };

  return {
    vertices: {
      negX_negY_negZ: { x: -halfSize.x, y: -halfSize.y, z: -halfSize.z },
      posX_negY_negZ: { x: halfSize.x, y: -halfSize.y, z: -halfSize.z },
      negX_negY_posZ: { x: -halfSize.x, y: -halfSize.y, z: halfSize.z },
      posX_negY_posZ: { x: halfSize.x, y: -halfSize.y, z: halfSize.z },
      negX_posY_negZ: { x: -halfSize.x, y: halfSize.y, z: -halfSize.z },
      posX_posY_negZ: { x: halfSize.x, y: halfSize.y, z: -halfSize.z }
    }
  };
}

export function normalizeRadialPrismSideCount(value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 3) {
    throw new Error("Radial prism side count must be an integer of at least 3.");
  }

  return value;
}

export function normalizeConeSideCount(value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 3) {
    throw new Error("Cone side count must be an integer of at least 3.");
  }

  return value;
}

export function normalizeTorusMajorSegmentCount(value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 3) {
    throw new Error("Torus major segment count must be an integer of at least 3.");
  }

  return value;
}

export function normalizeTorusTubeSegmentCount(value: number): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 3) {
    throw new Error("Torus tube segment count must be an integer of at least 3.");
  }

  return value;
}

export function getRadialPrismFaceIds(sideCount: number): RadialPrismFaceId[] {
  const normalizedSideCount = normalizeRadialPrismSideCount(sideCount);
  return [
    "top",
    "bottom",
    ...Array.from({ length: normalizedSideCount }, (_, index) => `side-${index}` as const)
  ];
}

export function getRadialPrismEdgeIds(sideCount: number): RadialPrismEdgeId[] {
  const normalizedSideCount = normalizeRadialPrismSideCount(sideCount);
  return [
    ...Array.from({ length: normalizedSideCount }, (_, index) => `top-${index}` as const),
    ...Array.from({ length: normalizedSideCount }, (_, index) => `bottom-${index}` as const),
    ...Array.from({ length: normalizedSideCount }, (_, index) => `vertical-${index}` as const)
  ];
}

export function getRadialPrismVertexIds(
  sideCount: number
): RadialPrismVertexId[] {
  const normalizedSideCount = normalizeRadialPrismSideCount(sideCount);
  return [
    ...Array.from({ length: normalizedSideCount }, (_, index) => `top-${index}` as const),
    ...Array.from({ length: normalizedSideCount }, (_, index) => `bottom-${index}` as const)
  ];
}

export function createDefaultRadialPrismBrushGeometry(
  size: Vec3 = DEFAULT_BOX_BRUSH_SIZE,
  sideCount: number = DEFAULT_RADIAL_PRISM_SIDE_COUNT
): RadialPrismBrushGeometry {
  const normalizedSideCount = normalizeRadialPrismSideCount(sideCount);
  const halfHeight = size.y * 0.5;
  const radiusX = size.x * 0.5;
  const radiusZ = size.z * 0.5;
  const vertices: Record<RadialPrismVertexId, Vec3> = {} as Record<
    RadialPrismVertexId,
    Vec3
  >;

  for (let index = 0; index < normalizedSideCount; index += 1) {
    const angle = (Math.PI * 2 * index) / normalizedSideCount;
    const x = Math.sin(angle) * radiusX;
    const z = Math.cos(angle) * radiusZ;
    vertices[`top-${index}`] = { x, y: halfHeight, z };
    vertices[`bottom-${index}`] = { x, y: -halfHeight, z };
  }

  return {
    vertices
  };
}

export function getConeFaceIds(sideCount: number): ConeFaceId[] {
  const normalizedSideCount = normalizeConeSideCount(sideCount);
  return [
    "bottom",
    ...Array.from({ length: normalizedSideCount }, (_, index) => `side-${index}` as const)
  ];
}

export function getConeEdgeIds(sideCount: number): ConeEdgeId[] {
  const normalizedSideCount = normalizeConeSideCount(sideCount);
  return [
    ...Array.from({ length: normalizedSideCount }, (_, index) => `bottom-${index}` as const),
    ...Array.from({ length: normalizedSideCount }, (_, index) => `side-${index}` as const)
  ];
}

export function getConeVertexIds(sideCount: number): ConeVertexId[] {
  const normalizedSideCount = normalizeConeSideCount(sideCount);
  return [
    "apex",
    ...Array.from({ length: normalizedSideCount }, (_, index) => `bottom-${index}` as const)
  ];
}

export function createDefaultConeBrushGeometry(
  size: Vec3 = DEFAULT_BOX_BRUSH_SIZE,
  sideCount: number = DEFAULT_CONE_SIDE_COUNT
): ConeBrushGeometry {
  const normalizedSideCount = normalizeConeSideCount(sideCount);
  const halfHeight = size.y * 0.5;
  const radiusX = size.x * 0.5;
  const radiusZ = size.z * 0.5;
  const vertices: Record<ConeVertexId, Vec3> = {
    apex: { x: 0, y: halfHeight, z: 0 }
  } as Record<ConeVertexId, Vec3>;

  for (let index = 0; index < normalizedSideCount; index += 1) {
    const angle = (Math.PI * 2 * index) / normalizedSideCount;
    vertices[`bottom-${index}`] = {
      x: Math.sin(angle) * radiusX,
      y: -halfHeight,
      z: Math.cos(angle) * radiusZ
    };
  }

  return {
    vertices
  };
}

export function getTorusFaceIds(
  majorSegmentCount: number,
  tubeSegmentCount: number
): TorusFaceId[] {
  const normalizedMajorSegmentCount =
    normalizeTorusMajorSegmentCount(majorSegmentCount);
  const normalizedTubeSegmentCount =
    normalizeTorusTubeSegmentCount(tubeSegmentCount);

  return Array.from(
    { length: normalizedMajorSegmentCount * normalizedTubeSegmentCount },
    (_, index) => {
      const majorIndex = Math.floor(index / normalizedTubeSegmentCount);
      const tubeIndex = index % normalizedTubeSegmentCount;
      return `face-${majorIndex}-${tubeIndex}` as const;
    }
  );
}

export function getTorusEdgeIds(
  majorSegmentCount: number,
  tubeSegmentCount: number
): TorusEdgeId[] {
  const normalizedMajorSegmentCount =
    normalizeTorusMajorSegmentCount(majorSegmentCount);
  const normalizedTubeSegmentCount =
    normalizeTorusTubeSegmentCount(tubeSegmentCount);

  return [
    ...Array.from(
      { length: normalizedMajorSegmentCount * normalizedTubeSegmentCount },
      (_, index) => {
        const majorIndex = Math.floor(index / normalizedTubeSegmentCount);
        const tubeIndex = index % normalizedTubeSegmentCount;
        return `major-${majorIndex}-${tubeIndex}` as const;
      }
    ),
    ...Array.from(
      { length: normalizedMajorSegmentCount * normalizedTubeSegmentCount },
      (_, index) => {
        const majorIndex = Math.floor(index / normalizedTubeSegmentCount);
        const tubeIndex = index % normalizedTubeSegmentCount;
        return `tube-${majorIndex}-${tubeIndex}` as const;
      }
    )
  ];
}

export function getTorusVertexIds(
  majorSegmentCount: number,
  tubeSegmentCount: number
): TorusVertexId[] {
  const normalizedMajorSegmentCount =
    normalizeTorusMajorSegmentCount(majorSegmentCount);
  const normalizedTubeSegmentCount =
    normalizeTorusTubeSegmentCount(tubeSegmentCount);

  return Array.from(
    { length: normalizedMajorSegmentCount * normalizedTubeSegmentCount },
    (_, index) => {
      const majorIndex = Math.floor(index / normalizedTubeSegmentCount);
      const tubeIndex = index % normalizedTubeSegmentCount;
      return `vertex-${majorIndex}-${tubeIndex}` as const;
    }
  );
}

function createDefaultBaseTorusBrushGeometry(
  majorSegmentCount: number,
  tubeSegmentCount: number
): TorusBrushGeometry {
  const normalizedMajorSegmentCount =
    normalizeTorusMajorSegmentCount(majorSegmentCount);
  const normalizedTubeSegmentCount =
    normalizeTorusTubeSegmentCount(tubeSegmentCount);
  const majorRadius = 0.75;
  const tubeRadius = 0.25;
  const vertices: Record<TorusVertexId, Vec3> = {} as Record<TorusVertexId, Vec3>;

  for (let majorIndex = 0; majorIndex < normalizedMajorSegmentCount; majorIndex += 1) {
    const majorAngle =
      (Math.PI * 2 * majorIndex) / normalizedMajorSegmentCount;
    const majorCos = Math.cos(majorAngle);
    const majorSin = Math.sin(majorAngle);

    for (let tubeIndex = 0; tubeIndex < normalizedTubeSegmentCount; tubeIndex += 1) {
      const tubeAngle = (Math.PI * 2 * tubeIndex) / normalizedTubeSegmentCount;
      const tubeCos = Math.cos(tubeAngle);
      const tubeSin = Math.sin(tubeAngle);
      const ringRadius = majorRadius + tubeRadius * tubeCos;

      vertices[`vertex-${majorIndex}-${tubeIndex}`] = {
        x: ringRadius * majorCos,
        y: tubeRadius * tubeSin,
        z: ringRadius * majorSin
      };
    }
  }

  return {
    vertices
  };
}

export function createDefaultTorusBrushGeometry(
  size: Vec3 = DEFAULT_TORUS_BRUSH_SIZE,
  majorSegmentCount: number = DEFAULT_TORUS_MAJOR_SEGMENT_COUNT,
  tubeSegmentCount: number = DEFAULT_TORUS_TUBE_SEGMENT_COUNT
): TorusBrushGeometry {
  return scaleBrushGeometryToSize(
    createDefaultBaseTorusBrushGeometry(majorSegmentCount, tubeSegmentCount),
    size
  );
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

export function isWedgeFaceId(value: unknown): value is WedgeFaceId {
  return typeof value === "string" && WEDGE_FACE_IDS.some((faceId) => faceId === value);
}

export function isWedgeEdgeId(value: unknown): value is WedgeEdgeId {
  return typeof value === "string" && WEDGE_EDGE_IDS.some((edgeId) => edgeId === value);
}

export function isWedgeVertexId(value: unknown): value is WedgeVertexId {
  return typeof value === "string" && WEDGE_VERTEX_IDS.some((vertexId) => vertexId === value);
}

export function isRadialPrismFaceId(value: unknown): value is RadialPrismFaceId {
  return (
    value === "top" ||
    value === "bottom" ||
    (typeof value === "string" && value.startsWith("side-"))
  );
}

export function isRadialPrismEdgeId(value: unknown): value is RadialPrismEdgeId {
  return (
    typeof value === "string" &&
    (value.startsWith("top-") ||
      value.startsWith("bottom-") ||
      value.startsWith("vertical-"))
  );
}

export function isRadialPrismVertexId(
  value: unknown
): value is RadialPrismVertexId {
  return (
    typeof value === "string" &&
    (value.startsWith("top-") || value.startsWith("bottom-"))
  );
}

export function isConeFaceId(value: unknown): value is ConeFaceId {
  return value === "bottom" || (typeof value === "string" && value.startsWith("side-"));
}

export function isConeEdgeId(value: unknown): value is ConeEdgeId {
  return (
    typeof value === "string" &&
    (value.startsWith("bottom-") || value.startsWith("side-"))
  );
}

export function isConeVertexId(value: unknown): value is ConeVertexId {
  return value === "apex" || (typeof value === "string" && value.startsWith("bottom-"));
}

export function isTorusFaceId(value: unknown): value is TorusFaceId {
  return typeof value === "string" && value.startsWith("face-");
}

export function isTorusEdgeId(value: unknown): value is TorusEdgeId {
  return (
    typeof value === "string" &&
    (value.startsWith("major-") || value.startsWith("tube-"))
  );
}

export function isTorusVertexId(value: unknown): value is TorusVertexId {
  return typeof value === "string" && value.startsWith("vertex-");
}

export function isFaceUvRotationQuarterTurns(value: unknown): value is FaceUvRotationQuarterTurns {
  return typeof value === "number" && FACE_UV_ROTATION_QUARTER_TURNS.includes(value as FaceUvRotationQuarterTurns);
}

export function isBoxBrushVolumeMode(value: unknown): value is BoxBrushVolumeMode {
  return typeof value === "string" && BOX_BRUSH_VOLUME_MODES.includes(value as BoxBrushVolumeMode);
}

export function isBoxBrushLightFalloffMode(
  value: unknown
): value is BoxBrushLightFalloffMode {
  return (
    typeof value === "string" &&
    BOX_BRUSH_LIGHT_FALLOFF_MODES.includes(value as BoxBrushLightFalloffMode)
  );
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

export function cloneBrushFaces<T extends Record<WhiteboxFaceId, BrushFace>>(
  faces: T
): T {
  return Object.fromEntries(
    Object.entries(faces).map(([faceId, face]) => [faceId, cloneBrushFace(face)])
  ) as T;
}

export function cloneBoxBrushFaces(faces: BoxBrushFaces): BoxBrushFaces {
  return cloneBrushFaces(faces);
}

export function createDefaultBrushFaces<FaceId extends WhiteboxFaceId>(
  faceIds: readonly FaceId[]
): Record<FaceId, BrushFace> {
  return Object.fromEntries(
    faceIds.map((faceId) => [
      faceId,
      {
        materialId: null,
        uv: createDefaultFaceUvState()
      }
    ])
  ) as Record<FaceId, BrushFace>;
}

export function createDefaultBoxBrushFaces(): BoxBrushFaces {
  return createDefaultBrushFaces(BOX_FACE_IDS);
}

export function createDefaultWedgeBrushFaces(): WedgeBrushFaces {
  return createDefaultBrushFaces(WEDGE_FACE_IDS);
}

export function createDefaultRadialPrismBrushFaces(
  sideCount: number = DEFAULT_RADIAL_PRISM_SIDE_COUNT
): Record<RadialPrismFaceId, BrushFace> {
  return createDefaultBrushFaces(getRadialPrismFaceIds(sideCount));
}

export function createDefaultConeBrushFaces(
  sideCount: number = DEFAULT_CONE_SIDE_COUNT
): Record<ConeFaceId, BrushFace> {
  return createDefaultBrushFaces(getConeFaceIds(sideCount));
}

export function createDefaultTorusBrushFaces(
  majorSegmentCount: number = DEFAULT_TORUS_MAJOR_SEGMENT_COUNT,
  tubeSegmentCount: number = DEFAULT_TORUS_TUBE_SEGMENT_COUNT
): Record<TorusFaceId, BrushFace> {
  return createDefaultBrushFaces(
    getTorusFaceIds(majorSegmentCount, tubeSegmentCount)
  );
}

export function createDefaultBoxBrushWaterSettings(): BoxBrushWaterSettings {
  return {
    colorHex: DEFAULT_BOX_BRUSH_WATER_SETTINGS.colorHex,
    surfaceOpacity: DEFAULT_BOX_BRUSH_WATER_SETTINGS.surfaceOpacity,
    waveStrength: DEFAULT_BOX_BRUSH_WATER_SETTINGS.waveStrength,
    foamContactLimit: DEFAULT_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT,
    surfaceDisplacementEnabled: DEFAULT_BOX_BRUSH_WATER_SETTINGS.surfaceDisplacementEnabled
  };
}

export function createDefaultBoxBrushFogSettings(): BoxBrushFogSettings {
  return {
    colorHex: DEFAULT_BOX_BRUSH_FOG_SETTINGS.colorHex,
    density: DEFAULT_BOX_BRUSH_FOG_SETTINGS.density,
    padding: DEFAULT_BOX_BRUSH_FOG_SETTINGS.padding
  };
}

export function createDefaultBoxBrushLightSettings(): BoxBrushLightSettings {
  return {
    colorHex: DEFAULT_BOX_BRUSH_LIGHT_SETTINGS.colorHex,
    intensity: DEFAULT_BOX_BRUSH_LIGHT_SETTINGS.intensity,
    padding: DEFAULT_BOX_BRUSH_LIGHT_SETTINGS.padding,
    falloff: DEFAULT_BOX_BRUSH_LIGHT_SETTINGS.falloff
  };
}

export function createDefaultBoxBrushVolumeSettings(): BoxBrushVolumeSettings {
  return {
    mode: "none"
  };
}

export function cloneBoxBrushVolumeSettings(volume: BoxBrushVolumeSettings): BoxBrushVolumeSettings {
  switch (volume.mode) {
    case "none":
      return {
        mode: "none"
      };
    case "water":
      return {
        mode: "water",
        water: {
          colorHex: volume.water.colorHex,
          surfaceOpacity: volume.water.surfaceOpacity,
          waveStrength: volume.water.waveStrength,
          foamContactLimit: volume.water.foamContactLimit,
          surfaceDisplacementEnabled: volume.water.surfaceDisplacementEnabled
        }
      };
    case "fog":
      return {
        mode: "fog",
        fog: {
          colorHex: volume.fog.colorHex,
          density: volume.fog.density,
          padding: volume.fog.padding
        }
      };
    case "light":
      return {
        mode: "light",
        light: {
          colorHex: volume.light.colorHex,
          intensity: volume.light.intensity,
          padding: volume.light.padding,
          falloff: volume.light.falloff
        }
      };
  }
}

function createBrushBase<Geometry extends BrushGeometry>(
  overrides: Partial<
    Pick<
      BrushBase,
      "id" | "name" | "visible" | "enabled" | "center" | "rotationDegrees" | "size" | "layerId" | "groupId"
    >
  >,
  geometry: Geometry
): BrushBase {
  const center = cloneVec3(overrides.center ?? DEFAULT_BOX_BRUSH_CENTER);
  const rotationDegrees = cloneVec3(
    overrides.rotationDegrees ?? DEFAULT_BOX_BRUSH_ROTATION_DEGREES
  );
  const size = deriveBrushSizeFromGeometry(geometry);
  const visible = overrides.visible ?? DEFAULT_BOX_BRUSH_VISIBLE;
  const enabled = overrides.enabled ?? DEFAULT_BOX_BRUSH_ENABLED;

  if (!hasPositiveBoxSize(size)) {
    throw new Error("Whitebox solid size must remain positive on every axis.");
  }

  if (typeof visible !== "boolean") {
    throw new Error("Whitebox solid visible must be a boolean.");
  }

  if (typeof enabled !== "boolean") {
    throw new Error("Whitebox solid enabled must be a boolean.");
  }

  return {
    id: overrides.id ?? createOpaqueId("brush"),
    name: normalizeBrushName(overrides.name),
    visible,
    enabled,
    center,
    rotationDegrees,
    size,
    layerId: overrides.layerId,
    groupId: overrides.groupId
  };
}

export function createBoxBrush(
  overrides: Partial<
    Pick<
      BoxBrush,
      | "id"
      | "name"
      | "visible"
      | "enabled"
      | "center"
      | "rotationDegrees"
      | "size"
      | "geometry"
      | "faces"
      | "volume"
      | "layerId"
      | "groupId"
    >
  > = {}
): BoxBrush {
  const fallbackSize = cloneVec3(overrides.size ?? DEFAULT_BOX_BRUSH_SIZE);
  const geometry =
    overrides.geometry === undefined
      ? createDefaultBoxBrushGeometry(fallbackSize)
      : cloneBoxBrushGeometry(overrides.geometry);

  return {
    ...createBrushBase(overrides, geometry),
    kind: "box",
    geometry,
    faces:
      overrides.faces === undefined
        ? createDefaultBoxBrushFaces()
        : cloneBoxBrushFaces(overrides.faces),
    volume:
      overrides.volume === undefined
        ? createDefaultBoxBrushVolumeSettings()
        : cloneBoxBrushVolumeSettings(overrides.volume)
  };
}

export function createWedgeBrush(
  overrides: Partial<
    Pick<
      WedgeBrush,
      | "id"
      | "name"
      | "visible"
      | "enabled"
      | "center"
      | "rotationDegrees"
      | "size"
      | "geometry"
      | "faces"
      | "volume"
      | "layerId"
      | "groupId"
    >
  > = {}
): WedgeBrush {
  const fallbackSize = cloneVec3(overrides.size ?? DEFAULT_BOX_BRUSH_SIZE);
  const geometry =
    overrides.geometry === undefined
      ? createDefaultWedgeBrushGeometry(fallbackSize)
      : cloneBrushGeometry(overrides.geometry);
  const baseOverrides = {
    ...overrides,
    rotationDegrees:
      overrides.rotationDegrees ?? DEFAULT_WEDGE_BRUSH_ROTATION_DEGREES
  };

  return {
    ...createBrushBase(baseOverrides, geometry),
    kind: "wedge",
    geometry,
    faces:
      overrides.faces === undefined
        ? createDefaultWedgeBrushFaces()
        : cloneBrushFaces(overrides.faces),
    volume:
      overrides.volume === undefined
        ? createDefaultBoxBrushVolumeSettings()
        : cloneBoxBrushVolumeSettings(overrides.volume)
  };
}

export function createRadialPrismBrush(
  overrides: Partial<
    Pick<
      RadialPrismBrush,
      | "id"
      | "name"
      | "visible"
      | "enabled"
      | "center"
      | "rotationDegrees"
      | "size"
      | "sideCount"
      | "geometry"
      | "faces"
      | "volume"
      | "layerId"
      | "groupId"
    >
  > = {}
): RadialPrismBrush {
  const sideCount = normalizeRadialPrismSideCount(
    overrides.sideCount ?? DEFAULT_RADIAL_PRISM_SIDE_COUNT
  );
  const fallbackSize = cloneVec3(overrides.size ?? DEFAULT_BOX_BRUSH_SIZE);
  const geometry =
    overrides.geometry === undefined
      ? createDefaultRadialPrismBrushGeometry(fallbackSize, sideCount)
      : cloneBrushGeometry(overrides.geometry);

  return {
    ...createBrushBase(overrides, geometry),
    kind: "radialPrism",
    sideCount,
    geometry,
    faces:
      overrides.faces === undefined
        ? createDefaultRadialPrismBrushFaces(sideCount)
        : cloneBrushFaces(overrides.faces),
    volume:
      overrides.volume === undefined
        ? createDefaultBoxBrushVolumeSettings()
        : cloneBoxBrushVolumeSettings(overrides.volume)
  };
}

export function createConeBrush(
  overrides: Partial<
    Pick<
      ConeBrush,
      | "id"
      | "name"
      | "visible"
      | "enabled"
      | "center"
      | "rotationDegrees"
      | "size"
      | "sideCount"
      | "geometry"
      | "faces"
      | "volume"
      | "layerId"
      | "groupId"
    >
  > = {}
): ConeBrush {
  const sideCount = normalizeConeSideCount(
    overrides.sideCount ?? DEFAULT_CONE_SIDE_COUNT
  );
  const fallbackSize = cloneVec3(overrides.size ?? DEFAULT_BOX_BRUSH_SIZE);
  const geometry =
    overrides.geometry === undefined
      ? createDefaultConeBrushGeometry(fallbackSize, sideCount)
      : cloneBrushGeometry(overrides.geometry);

  return {
    ...createBrushBase(overrides, geometry),
    kind: "cone",
    sideCount,
    geometry,
    faces:
      overrides.faces === undefined
        ? createDefaultConeBrushFaces(sideCount)
        : cloneBrushFaces(overrides.faces),
    volume:
      overrides.volume === undefined
        ? createDefaultBoxBrushVolumeSettings()
        : cloneBoxBrushVolumeSettings(overrides.volume)
  };
}

export function createTorusBrush(
  overrides: Partial<
    Pick<
      TorusBrush,
      | "id"
      | "name"
      | "visible"
      | "enabled"
      | "center"
      | "rotationDegrees"
      | "size"
      | "majorSegmentCount"
      | "tubeSegmentCount"
      | "geometry"
      | "faces"
      | "volume"
      | "layerId"
      | "groupId"
    >
  > = {}
): TorusBrush {
  const majorSegmentCount = normalizeTorusMajorSegmentCount(
    overrides.majorSegmentCount ?? DEFAULT_TORUS_MAJOR_SEGMENT_COUNT
  );
  const tubeSegmentCount = normalizeTorusTubeSegmentCount(
    overrides.tubeSegmentCount ?? DEFAULT_TORUS_TUBE_SEGMENT_COUNT
  );
  const fallbackSize = cloneVec3(overrides.size ?? DEFAULT_TORUS_BRUSH_SIZE);
  const geometry =
    overrides.geometry === undefined
      ? createDefaultTorusBrushGeometry(
          fallbackSize,
          majorSegmentCount,
          tubeSegmentCount
        )
      : cloneBrushGeometry(overrides.geometry);

  return {
    ...createBrushBase(overrides, geometry),
    kind: "torus",
    majorSegmentCount,
    tubeSegmentCount,
    geometry,
    faces:
      overrides.faces === undefined
        ? createDefaultTorusBrushFaces(majorSegmentCount, tubeSegmentCount)
        : cloneBrushFaces(overrides.faces),
    volume:
      overrides.volume === undefined
        ? createDefaultBoxBrushVolumeSettings()
        : cloneBoxBrushVolumeSettings(overrides.volume)
  };
}

export function cloneBoxBrush(brush: BoxBrush): BoxBrush {
  return createBoxBrush(brush);
}

export function cloneBrush(brush: Brush): Brush {
  switch (brush.kind) {
    case "box":
      return createBoxBrush(brush);
    case "wedge":
      return createWedgeBrush(brush);
    case "radialPrism":
      return createRadialPrismBrush(brush);
    case "cone":
      return createConeBrush(brush);
    case "torus":
      return createTorusBrush(brush);
  }
}

export function updateBrush<T extends Brush>(
  brush: T,
  overrides: Partial<Omit<T, "kind">>
): T {
  switch (brush.kind) {
    case "box":
      return createBoxBrush({
        ...brush,
        ...(overrides as Partial<Omit<BoxBrush, "kind">>)
      }) as T;
    case "wedge":
      return createWedgeBrush({
        ...brush,
        ...(overrides as Partial<Omit<WedgeBrush, "kind">>)
      }) as T;
    case "radialPrism":
      return createRadialPrismBrush({
        ...brush,
        ...(overrides as Partial<Omit<RadialPrismBrush, "kind">>)
      }) as T;
    case "cone":
      return createConeBrush({
        ...brush,
        ...(overrides as Partial<Omit<ConeBrush, "kind">>)
      }) as T;
    case "torus":
      return createTorusBrush({
        ...brush,
        ...(overrides as Partial<Omit<TorusBrush, "kind">>)
      }) as T;
  }
}
