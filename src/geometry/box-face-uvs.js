import { BoxGeometry } from "three";
import { BOX_FACE_IDS, createDefaultFaceUvState } from "../document/brushes";
import { getBoxBrushHalfSize } from "./box-brush";
export function getBoxBrushFaceSize(brush, faceId) {
    switch (faceId) {
        case "posX":
        case "negX":
            return {
                x: brush.size.z,
                y: brush.size.y
            };
        case "posY":
        case "negY":
            return {
                x: brush.size.x,
                y: brush.size.z
            };
        case "posZ":
        case "negZ":
            return {
                x: brush.size.x,
                y: brush.size.y
            };
    }
}
export function createFitToFaceBoxBrushFaceUvState(brush, faceId) {
    const faceSize = getBoxBrushFaceSize(brush, faceId);
    return {
        ...createDefaultFaceUvState(),
        scale: {
            x: 1 / faceSize.x,
            y: 1 / faceSize.y
        }
    };
}
export function projectBoxFaceVertexToUv(vertexPosition, brush, faceId) {
    const halfSize = getBoxBrushHalfSize(brush);
    switch (faceId) {
        case "posX":
            return {
                x: halfSize.z - vertexPosition.z,
                y: vertexPosition.y + halfSize.y
            };
        case "negX":
            return {
                x: vertexPosition.z + halfSize.z,
                y: vertexPosition.y + halfSize.y
            };
        case "posY":
            return {
                x: vertexPosition.x + halfSize.x,
                y: halfSize.z - vertexPosition.z
            };
        case "negY":
            return {
                x: vertexPosition.x + halfSize.x,
                y: vertexPosition.z + halfSize.z
            };
        case "posZ":
            return {
                x: vertexPosition.x + halfSize.x,
                y: vertexPosition.y + halfSize.y
            };
        case "negZ":
            return {
                x: halfSize.x - vertexPosition.x,
                y: vertexPosition.y + halfSize.y
            };
    }
}
export function transformProjectedFaceUv(baseUv, faceSize, uvState) {
    let u = (baseUv.x - faceSize.x * 0.5) * uvState.scale.x;
    let v = (baseUv.y - faceSize.y * 0.5) * uvState.scale.y;
    if (uvState.flipU) {
        u *= -1;
    }
    if (uvState.flipV) {
        v *= -1;
    }
    switch (uvState.rotationQuarterTurns) {
        case 1: {
            const nextU = -v;
            v = u;
            u = nextU;
            break;
        }
        case 2:
            u *= -1;
            v *= -1;
            break;
        case 3: {
            const nextU = v;
            v = -u;
            u = nextU;
            break;
        }
    }
    return {
        x: u + faceSize.x * 0.5 * uvState.scale.x + uvState.offset.x,
        y: v + faceSize.y * 0.5 * uvState.scale.y + uvState.offset.y
    };
}
export function applyBoxBrushFaceUvsToGeometry(geometry, brush) {
    const positionAttribute = geometry.getAttribute("position");
    const uvAttribute = geometry.getAttribute("uv");
    const indexAttribute = geometry.getIndex();
    if (indexAttribute === null) {
        throw new Error("BoxGeometry is expected to be indexed for face UV projection.");
    }
    // BoxGeometry groups follow the same px, nx, py, ny, pz, nz order as the canonical face ids.
    for (const [materialIndex, faceId] of BOX_FACE_IDS.entries()) {
        const group = geometry.groups.find((candidate) => candidate.materialIndex === materialIndex);
        if (group === undefined) {
            continue;
        }
        const faceSize = getBoxBrushFaceSize(brush, faceId);
        const vertexIndices = new Set();
        for (let indexOffset = group.start; indexOffset < group.start + group.count; indexOffset += 1) {
            vertexIndices.add(indexAttribute.getX(indexOffset));
        }
        for (const vertexIndex of vertexIndices) {
            const localVertexPosition = {
                x: positionAttribute.getX(vertexIndex),
                y: positionAttribute.getY(vertexIndex),
                z: positionAttribute.getZ(vertexIndex)
            };
            const projectedUv = projectBoxFaceVertexToUv(localVertexPosition, brush, faceId);
            const transformedUv = transformProjectedFaceUv(projectedUv, faceSize, brush.faces[faceId].uv);
            uvAttribute.setXY(vertexIndex, transformedUv.x, transformedUv.y);
        }
    }
    uvAttribute.needsUpdate = true;
}
