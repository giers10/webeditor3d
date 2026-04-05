import { BufferAttribute, BufferGeometry } from "three";
import { BOX_EDGE_IDS, BOX_FACE_IDS } from "../document/brushes";
import { transformProjectedFaceUv } from "./box-face-uvs";
const FACE_VERTEX_IDS = {
    posX: ["posX_negY_posZ", "posX_negY_negZ", "posX_posY_negZ", "posX_posY_posZ"],
    negX: ["negX_negY_negZ", "negX_negY_posZ", "negX_posY_posZ", "negX_posY_negZ"],
    posY: ["negX_posY_posZ", "posX_posY_posZ", "posX_posY_negZ", "negX_posY_negZ"],
    negY: ["negX_negY_negZ", "posX_negY_negZ", "posX_negY_posZ", "negX_negY_posZ"],
    posZ: ["negX_negY_posZ", "posX_negY_posZ", "posX_posY_posZ", "negX_posY_posZ"],
    negZ: ["posX_negY_negZ", "negX_negY_negZ", "negX_posY_negZ", "posX_posY_negZ"]
};
const EDGE_VERTEX_IDS = {
    edgeX_negY_negZ: ["negX_negY_negZ", "posX_negY_negZ"],
    edgeX_posY_negZ: ["negX_posY_negZ", "posX_posY_negZ"],
    edgeX_negY_posZ: ["negX_negY_posZ", "posX_negY_posZ"],
    edgeX_posY_posZ: ["negX_posY_posZ", "posX_posY_posZ"],
    edgeY_negX_negZ: ["negX_negY_negZ", "negX_posY_negZ"],
    edgeY_posX_negZ: ["posX_negY_negZ", "posX_posY_negZ"],
    edgeY_negX_posZ: ["negX_negY_posZ", "negX_posY_posZ"],
    edgeY_posX_posZ: ["posX_negY_posZ", "posX_posY_posZ"],
    edgeZ_negX_negY: ["negX_negY_negZ", "negX_negY_posZ"],
    edgeZ_posX_negY: ["posX_negY_negZ", "posX_negY_posZ"],
    edgeZ_negX_posY: ["negX_posY_negZ", "negX_posY_posZ"],
    edgeZ_posX_posY: ["posX_posY_negZ", "posX_posY_posZ"]
};
function cloneVec3(vector) {
    return { x: vector.x, y: vector.y, z: vector.z };
}
function subtractVec3(left, right) {
    return {
        x: left.x - right.x,
        y: left.y - right.y,
        z: left.z - right.z
    };
}
function crossVec3(left, right) {
    return {
        x: left.y * right.z - left.z * right.y,
        y: left.z * right.x - left.x * right.z,
        z: left.x * right.y - left.y * right.x
    };
}
function dotVec3(left, right) {
    return left.x * right.x + left.y * right.y + left.z * right.z;
}
function getVectorLength(vector) {
    return Math.sqrt(dotVec3(vector, vector));
}
function normalizeVec3(vector) {
    const length = getVectorLength(vector);
    if (length <= 1e-8) {
        return { x: 0, y: 0, z: 0 };
    }
    return {
        x: vector.x / length,
        y: vector.y / length,
        z: vector.z / length
    };
}
function computeNewellNormal(vertices) {
    let normal = { x: 0, y: 0, z: 0 };
    for (let index = 0; index < vertices.length; index += 1) {
        const current = vertices[index];
        const next = vertices[(index + 1) % vertices.length];
        normal.x += (current.y - next.y) * (current.z + next.z);
        normal.y += (current.z - next.z) * (current.x + next.x);
        normal.z += (current.x - next.x) * (current.y + next.y);
    }
    return normalizeVec3(normal);
}
function chooseProjectionAxes(normal) {
    const absoluteNormal = {
        x: Math.abs(normal.x),
        y: Math.abs(normal.y),
        z: Math.abs(normal.z)
    };
    if (absoluteNormal.x >= absoluteNormal.y && absoluteNormal.x >= absoluteNormal.z) {
        return ["y", "z"];
    }
    if (absoluteNormal.y >= absoluteNormal.z) {
        return ["x", "z"];
    }
    return ["x", "y"];
}
function projectVerticesTo2d(vertices, normal) {
    const [uAxis, vAxis] = chooseProjectionAxes(normal);
    return vertices.map((vertex) => ({
        x: vertex[uAxis],
        y: vertex[vAxis]
    }));
}
function computeSignedArea(points) {
    let area = 0;
    for (let index = 0; index < points.length; index += 1) {
        const current = points[index];
        const next = points[(index + 1) % points.length];
        area += current.x * next.y - next.x * current.y;
    }
    return area * 0.5;
}
function isPointInTriangle(point, triangle, orientation) {
    const [a, b, c] = triangle;
    const edges = [
        (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x),
        (c.x - b.x) * (point.y - b.y) - (c.y - b.y) * (point.x - b.x),
        (a.x - c.x) * (point.y - c.y) - (a.y - c.y) * (point.x - c.x)
    ];
    return orientation > 0 ? edges.every((value) => value >= -1e-8) : edges.every((value) => value <= 1e-8);
}
function triangulateQuad(vertices) {
    const normal = computeNewellNormal(vertices);
    const projected = projectVerticesTo2d(vertices, normal);
    const orientation = computeSignedArea(projected);
    if (Math.abs(orientation) <= 1e-8) {
        throw new Error("Face projection is degenerate.");
    }
    const remaining = [0, 1, 2, 3];
    const triangles = [];
    while (remaining.length > 3) {
        let earFound = false;
        for (let offset = 0; offset < remaining.length; offset += 1) {
            const previousIndex = remaining[(offset + remaining.length - 1) % remaining.length];
            const currentIndex = remaining[offset];
            const nextIndex = remaining[(offset + 1) % remaining.length];
            const previousPoint = projected[previousIndex];
            const currentPoint = projected[currentIndex];
            const nextPoint = projected[nextIndex];
            const cross = (currentPoint.x - previousPoint.x) * (nextPoint.y - previousPoint.y) -
                (currentPoint.y - previousPoint.y) * (nextPoint.x - previousPoint.x);
            if ((orientation > 0 && cross <= 1e-8) || (orientation < 0 && cross >= -1e-8)) {
                continue;
            }
            const candidateTriangle = [previousPoint, currentPoint, nextPoint];
            const containsOtherPoint = remaining.some((candidateIndex) => {
                if (candidateIndex === previousIndex || candidateIndex === currentIndex || candidateIndex === nextIndex) {
                    return false;
                }
                return isPointInTriangle(projected[candidateIndex], candidateTriangle, orientation);
            });
            if (containsOtherPoint) {
                continue;
            }
            triangles.push([previousIndex, currentIndex, nextIndex]);
            remaining.splice(offset, 1);
            earFound = true;
            break;
        }
        if (!earFound) {
            throw new Error("Face triangulation could not find a stable ear.");
        }
    }
    triangles.push([remaining[0], remaining[1], remaining[2]]);
    return triangles;
}
function projectLocalVertexToFaceUv(vertexPosition, faceId, faceBounds) {
    switch (faceId) {
        case "posX":
            return {
                x: faceBounds.max.z - vertexPosition.z,
                y: vertexPosition.y - faceBounds.min.y
            };
        case "negX":
            return {
                x: vertexPosition.z - faceBounds.min.z,
                y: vertexPosition.y - faceBounds.min.y
            };
        case "posY":
            return {
                x: vertexPosition.x - faceBounds.min.x,
                y: faceBounds.max.z - vertexPosition.z
            };
        case "negY":
            return {
                x: vertexPosition.x - faceBounds.min.x,
                y: vertexPosition.z - faceBounds.min.z
            };
        case "posZ":
            return {
                x: vertexPosition.x - faceBounds.min.x,
                y: vertexPosition.y - faceBounds.min.y
            };
        case "negZ":
            return {
                x: faceBounds.max.x - vertexPosition.x,
                y: vertexPosition.y - faceBounds.min.y
            };
    }
}
function getFaceUvSize(faceId, faceBounds) {
    switch (faceId) {
        case "posX":
        case "negX":
            return {
                x: faceBounds.max.z - faceBounds.min.z,
                y: faceBounds.max.y - faceBounds.min.y
            };
        case "posY":
        case "negY":
            return {
                x: faceBounds.max.x - faceBounds.min.x,
                y: faceBounds.max.z - faceBounds.min.z
            };
        case "posZ":
        case "negZ":
            return {
                x: faceBounds.max.x - faceBounds.min.x,
                y: faceBounds.max.y - faceBounds.min.y
            };
    }
}
function computeFaceBounds(vertices) {
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
    return { min, max };
}
export function getBoxBrushFaceVertexIds(faceId) {
    return FACE_VERTEX_IDS[faceId];
}
export function getBoxBrushEdgeVertexIds(edgeId) {
    return EDGE_VERTEX_IDS[edgeId];
}
export function getBoxBrushLocalVertexPosition(brush, vertexId) {
    return cloneVec3(brush.geometry.vertices[vertexId]);
}
export function buildBoxBrushDerivedMeshData(brush) {
    const diagnostics = validateBoxBrushGeometry(brush);
    if (diagnostics.length > 0) {
        throw new Error(diagnostics[0].message);
    }
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const colliderVertices = [];
    const colliderIndices = [];
    const faceSurfaces = [];
    const groups = [];
    const vertexIndexMap = new Map();
    for (const vertexId of Object.keys(brush.geometry.vertices)) {
        const vertex = brush.geometry.vertices[vertexId];
        vertexIndexMap.set(vertexId, colliderVertices.length / 3);
        colliderVertices.push(vertex.x, vertex.y, vertex.z);
    }
    for (const [materialIndex, faceId] of BOX_FACE_IDS.entries()) {
        const faceVertexIds = FACE_VERTEX_IDS[faceId];
        const faceVertices = faceVertexIds.map((vertexId) => getBoxBrushLocalVertexPosition(brush, vertexId));
        const triangles = triangulateQuad(faceVertices);
        const normal = computeNewellNormal(faceVertices);
        const faceBounds = computeFaceBounds(faceVertices);
        const uvSize = getFaceUvSize(faceId, faceBounds);
        const indexStart = indices.length;
        faceSurfaces.push({
            faceId,
            vertexIds: faceVertexIds,
            triangles,
            normal
        });
        for (const triangle of triangles) {
            for (const vertexOffset of triangle) {
                const vertex = faceVertices[vertexOffset];
                const projectedUv = projectLocalVertexToFaceUv(vertex, faceId, faceBounds);
                const transformedUv = transformProjectedFaceUv(projectedUv, uvSize, brush.faces[faceId].uv);
                positions.push(vertex.x, vertex.y, vertex.z);
                normals.push(normal.x, normal.y, normal.z);
                uvs.push(transformedUv.x, transformedUv.y);
                indices.push(indices.length);
            }
        }
        groups.push({
            start: indexStart,
            count: indices.length - indexStart,
            materialIndex
        });
        for (const triangle of triangles) {
            colliderIndices.push(vertexIndexMap.get(faceVertexIds[triangle[0]]) ?? 0, vertexIndexMap.get(faceVertexIds[triangle[1]]) ?? 0, vertexIndexMap.get(faceVertexIds[triangle[2]]) ?? 0);
        }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
    geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    geometry.setIndex(indices);
    for (const group of groups) {
        geometry.addGroup(group.start, group.count, group.materialIndex);
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const firstVertex = brush.geometry.vertices.negX_negY_negZ;
    const localBounds = {
        min: cloneVec3(firstVertex),
        max: cloneVec3(firstVertex)
    };
    for (const vertex of Object.values(brush.geometry.vertices)) {
        localBounds.min.x = Math.min(localBounds.min.x, vertex.x);
        localBounds.min.y = Math.min(localBounds.min.y, vertex.y);
        localBounds.min.z = Math.min(localBounds.min.z, vertex.z);
        localBounds.max.x = Math.max(localBounds.max.x, vertex.x);
        localBounds.max.y = Math.max(localBounds.max.y, vertex.y);
        localBounds.max.z = Math.max(localBounds.max.z, vertex.z);
    }
    return {
        geometry,
        faceSurfaces,
        edgeSegments: BOX_EDGE_IDS.map((edgeId) => {
            const [startId, endId] = EDGE_VERTEX_IDS[edgeId];
            return {
                edgeId,
                start: getBoxBrushLocalVertexPosition(brush, startId),
                end: getBoxBrushLocalVertexPosition(brush, endId)
            };
        }),
        colliderVertices: new Float32Array(colliderVertices),
        colliderIndices: new Uint32Array(colliderIndices),
        localBounds
    };
}
export function validateBoxBrushGeometry(brush) {
    const diagnostics = [];
    for (const [vertexId, vertex] of Object.entries(brush.geometry.vertices)) {
        if (!Number.isFinite(vertex.x) || !Number.isFinite(vertex.y) || !Number.isFinite(vertex.z)) {
            diagnostics.push({
                code: "invalid-box-geometry-vertex",
                message: `Whitebox vertex ${vertexId} must remain finite.`
            });
        }
    }
    for (const faceId of BOX_FACE_IDS) {
        const faceVertices = FACE_VERTEX_IDS[faceId].map((vertexId) => brush.geometry.vertices[vertexId]);
        const normal = computeNewellNormal(faceVertices);
        if (getVectorLength(normal) <= 1e-8) {
            diagnostics.push({
                code: "degenerate-box-face",
                message: `Whitebox face ${faceId} is degenerate and cannot be triangulated.`,
                faceId
            });
            continue;
        }
        try {
            triangulateQuad(faceVertices);
        }
        catch (error) {
            diagnostics.push({
                code: "invalid-box-face-triangulation",
                message: error instanceof Error ? `Whitebox face ${faceId} could not be triangulated: ${error.message}` : `Whitebox face ${faceId} could not be triangulated.`,
                faceId
            });
        }
    }
    return diagnostics;
}
