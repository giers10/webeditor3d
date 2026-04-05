import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
const DEBUG_COLLIDER_COLORS = {
    simple: 0x87d2ff,
    terrain: 0x7be7b4,
    static: 0xffc66d,
    dynamic: 0xff8b7a
};
function createWireframeMaterial(color) {
    return new MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        toneMapped: false
    });
}
function markDebugMesh(mesh) {
    mesh.userData.shadowIgnored = true;
    mesh.userData.nonPickable = true;
    mesh.renderOrder = 3_500;
}
function createBoxColliderDebugMesh(collider) {
    const mesh = new Mesh(new BoxGeometry(collider.size.x, collider.size.y, collider.size.z), createWireframeMaterial(DEBUG_COLLIDER_COLORS.simple));
    mesh.position.set(collider.center.x, collider.center.y, collider.center.z);
    markDebugMesh(mesh);
    return mesh;
}
function createTriMeshColliderDebugMesh(collider) {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(collider.vertices, 3));
    geometry.setIndex(Array.from(collider.indices));
    const mesh = new Mesh(geometry, createWireframeMaterial(DEBUG_COLLIDER_COLORS.static));
    markDebugMesh(mesh);
    return mesh;
}
function createHeightfieldColliderDebugMesh(collider) {
    const vertices = [];
    const indices = [];
    const width = collider.maxX - collider.minX;
    const depth = collider.maxZ - collider.minZ;
    for (let zIndex = 0; zIndex < collider.cols; zIndex += 1) {
        const zLerp = collider.cols === 1 ? 0 : zIndex / (collider.cols - 1);
        const z = collider.minZ + depth * zLerp;
        for (let xIndex = 0; xIndex < collider.rows; xIndex += 1) {
            const xLerp = collider.rows === 1 ? 0 : xIndex / (collider.rows - 1);
            const x = collider.minX + width * xLerp;
            const y = collider.heights[xIndex + zIndex * collider.rows];
            vertices.push(x, y, z);
        }
    }
    for (let zIndex = 0; zIndex < collider.cols - 1; zIndex += 1) {
        for (let xIndex = 0; xIndex < collider.rows - 1; xIndex += 1) {
            const topLeft = xIndex + zIndex * collider.rows;
            const topRight = topLeft + 1;
            const bottomLeft = topLeft + collider.rows;
            const bottomRight = bottomLeft + 1;
            indices.push(topLeft, bottomLeft, bottomRight, topLeft, bottomRight, topRight);
        }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    const mesh = new Mesh(geometry, createWireframeMaterial(DEBUG_COLLIDER_COLORS.terrain));
    markDebugMesh(mesh);
    return mesh;
}
function createCompoundColliderDebugGroup(collider) {
    const group = new Group();
    for (const piece of collider.pieces) {
        const points = [];
        for (let index = 0; index < piece.points.length; index += 3) {
            points.push(new Vector3(piece.points[index], piece.points[index + 1], piece.points[index + 2]));
        }
        const mesh = new Mesh(new ConvexGeometry(points), createWireframeMaterial(DEBUG_COLLIDER_COLORS.dynamic));
        markDebugMesh(mesh);
        group.add(mesh);
    }
    return group;
}
export function createModelColliderDebugGroup(collider) {
    const group = new Group();
    switch (collider.kind) {
        case "box":
            group.add(createBoxColliderDebugMesh(collider));
            break;
        case "trimesh":
            group.add(createTriMeshColliderDebugMesh(collider));
            break;
        case "heightfield":
            group.add(createHeightfieldColliderDebugMesh(collider));
            break;
        case "compound":
            group.add(createCompoundColliderDebugGroup(collider));
            break;
    }
    group.userData.nonPickable = true;
    return group;
}
function disposeMaterial(material) {
    if (Array.isArray(material)) {
        for (const item of material) {
            item.dispose();
        }
        return;
    }
    material.dispose();
}
export function disposeModelColliderDebugGroup(group) {
    group.traverse((object) => {
        const maybeMesh = object;
        if (maybeMesh.isMesh !== true) {
            return;
        }
        maybeMesh.geometry.dispose();
        disposeMaterial(maybeMesh.material);
    });
}
