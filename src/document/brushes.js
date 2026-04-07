import { createOpaqueId } from "../core/ids";
export const BOX_FACE_IDS = ["posX", "negX", "posY", "negY", "posZ", "negZ"];
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
];
export const BOX_VERTEX_IDS = [
    "negX_negY_negZ",
    "posX_negY_negZ",
    "negX_posY_negZ",
    "posX_posY_negZ",
    "negX_negY_posZ",
    "posX_negY_posZ",
    "negX_posY_posZ",
    "posX_posY_posZ"
];
export const FACE_UV_ROTATION_QUARTER_TURNS = [0, 1, 2, 3];
export const BOX_BRUSH_VOLUME_MODES = ["none", "water", "fog"];
export const BOX_FACE_LABELS = {
    posX: "Right",
    negX: "Left",
    posY: "Top",
    negY: "Bottom",
    posZ: "Front",
    negZ: "Back"
};
export const BOX_EDGE_LABELS = {
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
export const BOX_VERTEX_LABELS = {
    negX_negY_negZ: "Vertex (-X, -Y, -Z)",
    posX_negY_negZ: "Vertex (+X, -Y, -Z)",
    negX_posY_negZ: "Vertex (-X, +Y, -Z)",
    posX_posY_negZ: "Vertex (+X, +Y, -Z)",
    negX_negY_posZ: "Vertex (-X, -Y, +Z)",
    posX_negY_posZ: "Vertex (+X, -Y, +Z)",
    negX_posY_posZ: "Vertex (-X, +Y, +Z)",
    posX_posY_posZ: "Vertex (+X, +Y, +Z)"
};
export const DEFAULT_BOX_BRUSH_CENTER = {
    x: 0,
    y: 1,
    z: 0
};
export const DEFAULT_BOX_BRUSH_SIZE = {
    x: 2,
    y: 2,
    z: 2
};
export const DEFAULT_BOX_BRUSH_ROTATION_DEGREES = {
    x: 0,
    y: 0,
    z: 0
};
export const DEFAULT_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT = 6;
export const MAX_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT = 24;
const DEFAULT_BOX_BRUSH_WATER_SETTINGS = {
    colorHex: "#4da6d9",
    surfaceOpacity: 0.55,
    waveStrength: 0.35,
    foamContactLimit: DEFAULT_BOX_BRUSH_WATER_FOAM_CONTACT_LIMIT,
    surfaceDisplacementEnabled: false
};
const DEFAULT_BOX_BRUSH_FOG_SETTINGS = {
    colorHex: "#9cb7c7",
    density: 0.08,
    padding: 0.2
};
export function normalizeBrushName(name) {
    if (name === undefined || name === null) {
        return undefined;
    }
    const trimmedName = name.trim();
    return trimmedName.length === 0 ? undefined : trimmedName;
}
function cloneVec3(vector) {
    return {
        x: vector.x,
        y: vector.y,
        z: vector.z
    };
}
function cloneBrushFace(face) {
    return {
        materialId: face.materialId,
        uv: cloneFaceUvState(face.uv)
    };
}
function cloneBoxBrushGeometryVertex(vertex) {
    return {
        x: vertex.x,
        y: vertex.y,
        z: vertex.z
    };
}
export function cloneBoxBrushGeometry(geometry) {
    return {
        vertices: {
            negX_negY_negZ: cloneBoxBrushGeometryVertex(geometry.vertices.negX_negY_negZ),
            posX_negY_negZ: cloneBoxBrushGeometryVertex(geometry.vertices.posX_negY_negZ),
            negX_posY_negZ: cloneBoxBrushGeometryVertex(geometry.vertices.negX_posY_negZ),
            posX_posY_negZ: cloneBoxBrushGeometryVertex(geometry.vertices.posX_posY_negZ),
            negX_negY_posZ: cloneBoxBrushGeometryVertex(geometry.vertices.negX_negY_posZ),
            posX_negY_posZ: cloneBoxBrushGeometryVertex(geometry.vertices.posX_negY_posZ),
            negX_posY_posZ: cloneBoxBrushGeometryVertex(geometry.vertices.negX_posY_posZ),
            posX_posY_posZ: cloneBoxBrushGeometryVertex(geometry.vertices.posX_posY_posZ)
        }
    };
}
export function getBoxBrushGeometryLocalBounds(geometry) {
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
export function deriveBoxBrushSizeFromGeometry(geometry) {
    const bounds = getBoxBrushGeometryLocalBounds(geometry);
    return {
        x: bounds.max.x - bounds.min.x,
        y: bounds.max.y - bounds.min.y,
        z: bounds.max.z - bounds.min.z
    };
}
export function scaleBoxBrushGeometryToSize(geometry, size) {
    const bounds = getBoxBrushGeometryLocalBounds(geometry);
    const currentSize = deriveBoxBrushSizeFromGeometry(geometry);
    if (!hasPositiveBoxSize(currentSize) || !hasPositiveBoxSize(size)) {
        throw new Error("Box brush geometry size must remain positive on every axis.");
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
        vertices: {
            negX_negY_negZ: {
                x: center.x + (geometry.vertices.negX_negY_negZ.x - center.x) * scale.x,
                y: center.y + (geometry.vertices.negX_negY_negZ.y - center.y) * scale.y,
                z: center.z + (geometry.vertices.negX_negY_negZ.z - center.z) * scale.z
            },
            posX_negY_negZ: {
                x: center.x + (geometry.vertices.posX_negY_negZ.x - center.x) * scale.x,
                y: center.y + (geometry.vertices.posX_negY_negZ.y - center.y) * scale.y,
                z: center.z + (geometry.vertices.posX_negY_negZ.z - center.z) * scale.z
            },
            negX_posY_negZ: {
                x: center.x + (geometry.vertices.negX_posY_negZ.x - center.x) * scale.x,
                y: center.y + (geometry.vertices.negX_posY_negZ.y - center.y) * scale.y,
                z: center.z + (geometry.vertices.negX_posY_negZ.z - center.z) * scale.z
            },
            posX_posY_negZ: {
                x: center.x + (geometry.vertices.posX_posY_negZ.x - center.x) * scale.x,
                y: center.y + (geometry.vertices.posX_posY_negZ.y - center.y) * scale.y,
                z: center.z + (geometry.vertices.posX_posY_negZ.z - center.z) * scale.z
            },
            negX_negY_posZ: {
                x: center.x + (geometry.vertices.negX_negY_posZ.x - center.x) * scale.x,
                y: center.y + (geometry.vertices.negX_negY_posZ.y - center.y) * scale.y,
                z: center.z + (geometry.vertices.negX_negY_posZ.z - center.z) * scale.z
            },
            posX_negY_posZ: {
                x: center.x + (geometry.vertices.posX_negY_posZ.x - center.x) * scale.x,
                y: center.y + (geometry.vertices.posX_negY_posZ.y - center.y) * scale.y,
                z: center.z + (geometry.vertices.posX_negY_posZ.z - center.z) * scale.z
            },
            negX_posY_posZ: {
                x: center.x + (geometry.vertices.negX_posY_posZ.x - center.x) * scale.x,
                y: center.y + (geometry.vertices.negX_posY_posZ.y - center.y) * scale.y,
                z: center.z + (geometry.vertices.negX_posY_posZ.z - center.z) * scale.z
            },
            posX_posY_posZ: {
                x: center.x + (geometry.vertices.posX_posY_posZ.x - center.x) * scale.x,
                y: center.y + (geometry.vertices.posX_posY_posZ.y - center.y) * scale.y,
                z: center.z + (geometry.vertices.posX_posY_posZ.z - center.z) * scale.z
            }
        }
    };
}
export function createDefaultBoxBrushGeometry(size = DEFAULT_BOX_BRUSH_SIZE) {
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
export function isBoxFaceId(value) {
    return typeof value === "string" && BOX_FACE_IDS.some((faceId) => faceId === value);
}
export function isBoxEdgeId(value) {
    return typeof value === "string" && BOX_EDGE_IDS.some((edgeId) => edgeId === value);
}
export function isBoxVertexId(value) {
    return typeof value === "string" && BOX_VERTEX_IDS.some((vertexId) => vertexId === value);
}
export function isFaceUvRotationQuarterTurns(value) {
    return typeof value === "number" && FACE_UV_ROTATION_QUARTER_TURNS.includes(value);
}
export function isBoxBrushVolumeMode(value) {
    return typeof value === "string" && BOX_BRUSH_VOLUME_MODES.includes(value);
}
export function hasPositiveBoxSize(size) {
    return size.x > 0 && size.y > 0 && size.z > 0;
}
export function createDefaultFaceUvState() {
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
export function cloneFaceUvState(uv) {
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
export function cloneBoxBrushFaces(faces) {
    return {
        posX: cloneBrushFace(faces.posX),
        negX: cloneBrushFace(faces.negX),
        posY: cloneBrushFace(faces.posY),
        negY: cloneBrushFace(faces.negY),
        posZ: cloneBrushFace(faces.posZ),
        negZ: cloneBrushFace(faces.negZ)
    };
}
export function createDefaultBoxBrushFaces() {
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
export function createDefaultBoxBrushWaterSettings() {
    return {
        colorHex: DEFAULT_BOX_BRUSH_WATER_SETTINGS.colorHex,
        surfaceOpacity: DEFAULT_BOX_BRUSH_WATER_SETTINGS.surfaceOpacity,
        waveStrength: DEFAULT_BOX_BRUSH_WATER_SETTINGS.waveStrength,
        foamContactLimit: DEFAULT_BOX_BRUSH_WATER_SETTINGS.foamContactLimit,
        surfaceDisplacementEnabled: DEFAULT_BOX_BRUSH_WATER_SETTINGS.surfaceDisplacementEnabled
    };
}
export function createDefaultBoxBrushFogSettings() {
    return {
        colorHex: DEFAULT_BOX_BRUSH_FOG_SETTINGS.colorHex,
        density: DEFAULT_BOX_BRUSH_FOG_SETTINGS.density,
        padding: DEFAULT_BOX_BRUSH_FOG_SETTINGS.padding
    };
}
export function createDefaultBoxBrushVolumeSettings() {
    return {
        mode: "none"
    };
}
export function cloneBoxBrushVolumeSettings(volume) {
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
    }
}
export function createBoxBrush(overrides = {}) {
    const center = cloneVec3(overrides.center ?? DEFAULT_BOX_BRUSH_CENTER);
    const rotationDegrees = cloneVec3(overrides.rotationDegrees ?? DEFAULT_BOX_BRUSH_ROTATION_DEGREES);
    const fallbackSize = cloneVec3(overrides.size ?? DEFAULT_BOX_BRUSH_SIZE);
    const geometry = overrides.geometry === undefined ? createDefaultBoxBrushGeometry(fallbackSize) : cloneBoxBrushGeometry(overrides.geometry);
    const size = deriveBoxBrushSizeFromGeometry(geometry);
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
        geometry,
        faces: overrides.faces === undefined ? createDefaultBoxBrushFaces() : cloneBoxBrushFaces(overrides.faces),
        volume: overrides.volume === undefined ? createDefaultBoxBrushVolumeSettings() : cloneBoxBrushVolumeSettings(overrides.volume),
        layerId: overrides.layerId,
        groupId: overrides.groupId
    };
}
export function cloneBoxBrush(brush) {
    return createBoxBrush(brush);
}
