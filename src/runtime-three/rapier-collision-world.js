import RAPIER from "@dimforge/rapier3d-compat";
import { Euler, MathUtils, Quaternion } from "three";
const CHARACTER_CONTROLLER_OFFSET = 0.01;
const COLLISION_EPSILON = 1e-5;
let rapierInitPromise = null;
function componentScale(vector, scale) {
    return {
        x: vector.x * scale.x,
        y: vector.y * scale.y,
        z: vector.z * scale.z
    };
}
function createRapierQuaternion(rotationDegrees) {
    const quaternion = new Quaternion().setFromEuler(new Euler(MathUtils.degToRad(rotationDegrees.x), MathUtils.degToRad(rotationDegrees.y), MathUtils.degToRad(rotationDegrees.z), "XYZ"));
    return {
        x: quaternion.x,
        y: quaternion.y,
        z: quaternion.z,
        w: quaternion.w
    };
}
function scaleVertices(vertices, scale) {
    const scaledVertices = new Float32Array(vertices.length);
    for (let index = 0; index < vertices.length; index += 3) {
        scaledVertices[index] = vertices[index] * scale.x;
        scaledVertices[index + 1] = vertices[index + 1] * scale.y;
        scaledVertices[index + 2] = vertices[index + 2] * scale.z;
    }
    return scaledVertices;
}
function scaleBoundsCenter(bounds, scale) {
    return {
        x: ((bounds.min.x + bounds.max.x) * 0.5) * scale.x,
        y: ((bounds.min.y + bounds.max.y) * 0.5) * scale.y,
        z: ((bounds.min.z + bounds.max.z) * 0.5) * scale.z
    };
}
function createRapierHeightfieldHeights(collider) {
    const heights = new Float32Array(collider.heights.length);
    // Rapier's heightfield samples are column-major, with the Z axis varying
    // fastest inside each X column. Our generated collider stores X-major rows
    // for easier editor/debug mesh reconstruction, so transpose here.
    for (let zIndex = 0; zIndex < collider.cols; zIndex += 1) {
        for (let xIndex = 0; xIndex < collider.rows; xIndex += 1) {
            heights[zIndex + xIndex * collider.cols] = collider.heights[xIndex + zIndex * collider.rows];
        }
    }
    return heights;
}
function createFixedBodyForModelCollider(world, collider) {
    return world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
        .setTranslation(collider.transform.position.x, collider.transform.position.y, collider.transform.position.z)
        .setRotation(createRapierQuaternion(collider.transform.rotationDegrees)));
}
function attachBrushCollider(world, collider) {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
        .setTranslation(collider.center.x, collider.center.y, collider.center.z)
        .setRotation(createRapierQuaternion(collider.rotationDegrees)));
    const halfExtents = {
        x: collider.size.x * 0.5,
        y: collider.size.y * 0.5,
        z: collider.size.z * 0.5
    };
    world.createCollider(RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z), body);
}
function attachSimpleModelCollider(world, collider) {
    const body = createFixedBodyForModelCollider(world, collider);
    const scaledCenter = componentScale(collider.center, collider.transform.scale);
    const scaledHalfExtents = componentScale({
        x: collider.size.x * 0.5,
        y: collider.size.y * 0.5,
        z: collider.size.z * 0.5
    }, collider.transform.scale);
    world.createCollider(RAPIER.ColliderDesc.cuboid(scaledHalfExtents.x, scaledHalfExtents.y, scaledHalfExtents.z).setTranslation(scaledCenter.x, scaledCenter.y, scaledCenter.z), body);
}
function attachStaticModelCollider(world, collider) {
    const body = createFixedBodyForModelCollider(world, collider);
    world.createCollider(RAPIER.ColliderDesc.trimesh(scaleVertices(collider.vertices, collider.transform.scale), collider.indices), body);
}
function attachTerrainModelCollider(world, collider) {
    if (collider.rows < 2 || collider.cols < 2) {
        throw new Error(`Terrain collider ${collider.instanceId} must have at least a 2x2 height sample grid.`);
    }
    const body = createFixedBodyForModelCollider(world, collider);
    const center = scaleBoundsCenter({
        min: {
            x: collider.minX,
            y: 0,
            z: collider.minZ
        },
        max: {
            x: collider.maxX,
            y: 0,
            z: collider.maxZ
        }
    }, collider.transform.scale);
    const rowSubdivisions = collider.rows - 1;
    const colSubdivisions = collider.cols - 1;
    world.createCollider(
    // Rapier expects the number of grid subdivisions here, while our generated
    // collider stores the sampled height grid dimensions.
    RAPIER.ColliderDesc.heightfield(rowSubdivisions, colSubdivisions, createRapierHeightfieldHeights(collider), {
        x: (collider.maxX - collider.minX) * collider.transform.scale.x,
        y: collider.transform.scale.y,
        z: (collider.maxZ - collider.minZ) * collider.transform.scale.z
    }).setTranslation(center.x, center.y, center.z), body);
}
function attachDynamicModelCollider(world, collider) {
    const body = createFixedBodyForModelCollider(world, collider);
    for (const piece of collider.pieces) {
        const scaledPoints = scaleVertices(piece.points, collider.transform.scale);
        const descriptor = RAPIER.ColliderDesc.convexHull(scaledPoints);
        if (descriptor === null) {
            throw new Error(`Dynamic collider piece ${piece.id} could not form a valid convex hull.`);
        }
        world.createCollider(descriptor, body);
    }
}
function attachModelCollider(world, collider) {
    switch (collider.kind) {
        case "box":
            attachSimpleModelCollider(world, collider);
            break;
        case "trimesh":
            attachStaticModelCollider(world, collider);
            break;
        case "heightfield":
            attachTerrainModelCollider(world, collider);
            break;
        case "compound":
            attachDynamicModelCollider(world, collider);
            break;
    }
}
function feetPositionToColliderCenter(feetPosition, shape) {
    switch (shape.mode) {
        case "capsule": {
            const cylindricalHalfHeight = Math.max(0, (shape.height - shape.radius * 2) * 0.5);
            return {
                x: feetPosition.x,
                y: feetPosition.y + shape.radius + cylindricalHalfHeight,
                z: feetPosition.z
            };
        }
        case "box":
            return {
                x: feetPosition.x,
                y: feetPosition.y + shape.size.y * 0.5,
                z: feetPosition.z
            };
        case "none":
            return {
                ...feetPosition
            };
    }
}
function colliderCenterToFeetPosition(center, shape) {
    switch (shape.mode) {
        case "capsule": {
            const cylindricalHalfHeight = Math.max(0, (shape.height - shape.radius * 2) * 0.5);
            return {
                x: center.x,
                y: center.y - (shape.radius + cylindricalHalfHeight),
                z: center.z
            };
        }
        case "box":
            return {
                x: center.x,
                y: center.y - shape.size.y * 0.5,
                z: center.z
            };
        case "none":
            return {
                ...center
            };
    }
}
function createPlayerCollider(world, rapier, playerShape) {
    switch (playerShape.mode) {
        case "capsule":
            return world.createCollider(rapier.ColliderDesc.capsule(Math.max(0, (playerShape.height - playerShape.radius * 2) * 0.5), playerShape.radius));
        case "box":
            return world.createCollider(rapier.ColliderDesc.cuboid(playerShape.size.x * 0.5, playerShape.size.y * 0.5, playerShape.size.z * 0.5));
        case "none":
            return null;
    }
}
export async function initializeRapierCollisionWorld() {
    rapierInitPromise ??= RAPIER.init().then(() => RAPIER);
    return rapierInitPromise;
}
export class RapierCollisionWorld {
    world;
    characterController;
    playerCollider;
    static async create(colliders, playerShape) {
        const rapier = await initializeRapierCollisionWorld();
        const world = new rapier.World({
            x: 0,
            y: 0,
            z: 0
        });
        for (const collider of colliders) {
            if (collider.source === "brush") {
                attachBrushCollider(world, collider);
                continue;
            }
            attachModelCollider(world, collider);
        }
        const playerCollider = createPlayerCollider(world, rapier, playerShape);
        const characterController = playerCollider === null ? null : world.createCharacterController(CHARACTER_CONTROLLER_OFFSET);
        if (characterController !== null) {
            characterController.setUp({ x: 0, y: 1, z: 0 });
            characterController.setSlideEnabled(true);
            characterController.enableSnapToGround(0.2);
            characterController.enableAutostep(0.35, 0.15, false);
            characterController.setMaxSlopeClimbAngle(Math.PI * 0.45);
            characterController.setMinSlopeSlideAngle(Math.PI * 0.5);
        }
        world.step();
        return new RapierCollisionWorld(world, characterController, playerCollider);
    }
    constructor(world, characterController, playerCollider) {
        this.world = world;
        this.characterController = characterController;
        this.playerCollider = playerCollider;
    }
    resolveFirstPersonMotion(feetPosition, motion, shape) {
        if (this.playerCollider === null || this.characterController === null || shape.mode === "none") {
            return {
                feetPosition: {
                    x: feetPosition.x + motion.x,
                    y: feetPosition.y + motion.y,
                    z: feetPosition.z + motion.z
                },
                grounded: false,
                collidedAxes: {
                    x: false,
                    y: false,
                    z: false
                }
            };
        }
        const currentCenter = feetPositionToColliderCenter(feetPosition, shape);
        this.playerCollider.setTranslation(currentCenter);
        this.characterController.computeColliderMovement(this.playerCollider, motion);
        const correctedMovement = this.characterController.computedMovement();
        const collidedAxes = {
            x: Math.abs(correctedMovement.x - motion.x) > COLLISION_EPSILON,
            y: Math.abs(correctedMovement.y - motion.y) > COLLISION_EPSILON,
            z: Math.abs(correctedMovement.z - motion.z) > COLLISION_EPSILON
        };
        const nextCenter = {
            x: currentCenter.x + correctedMovement.x,
            y: currentCenter.y + correctedMovement.y,
            z: currentCenter.z + correctedMovement.z
        };
        this.playerCollider.setTranslation(nextCenter);
        return {
            feetPosition: colliderCenterToFeetPosition(nextCenter, shape),
            grounded: this.characterController.computedGrounded() || (motion.y < 0 && collidedAxes.y),
            collidedAxes
        };
    }
    dispose() {
        if (this.characterController !== null) {
            this.world.removeCharacterController(this.characterController);
        }
        this.world.free();
    }
}
