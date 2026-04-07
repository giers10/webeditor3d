import { DoubleSide, Euler, MeshBasicMaterial, Quaternion, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";

const MAX_WATER_CONTACT_PATCHES = 6;
const WATER_CONTACT_EPSILON = 1e-4;

function createBoundsCorners(bounds) {
    return [
        new Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
        new Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
        new Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
        new Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
        new Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
        new Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
        new Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
        new Vector3(bounds.max.x, bounds.max.y, bounds.max.z)
    ];
}

function createOrientedBoxCorners(box) {
    const halfSize = {
        x: box.size.x * 0.5,
        y: box.size.y * 0.5,
        z: box.size.z * 0.5
    };
    const rotation = new Quaternion().setFromEuler(new Euler((box.rotationDegrees.x * Math.PI) / 180, (box.rotationDegrees.y * Math.PI) / 180, (box.rotationDegrees.z * Math.PI) / 180, "XYZ"));
    return [
        new Vector3(-halfSize.x, -halfSize.y, -halfSize.z),
        new Vector3(-halfSize.x, -halfSize.y, halfSize.z),
        new Vector3(-halfSize.x, halfSize.y, -halfSize.z),
        new Vector3(-halfSize.x, halfSize.y, halfSize.z),
        new Vector3(halfSize.x, -halfSize.y, -halfSize.z),
        new Vector3(halfSize.x, -halfSize.y, halfSize.z),
        new Vector3(halfSize.x, halfSize.y, -halfSize.z),
        new Vector3(halfSize.x, halfSize.y, halfSize.z)
    ].map((corner) => corner.applyQuaternion(rotation).add(new Vector3(box.center.x, box.center.y, box.center.z)));
}

function createRotationQuaternion(rotationDegrees) {
    return new Quaternion().setFromEuler(new Euler((rotationDegrees.x * Math.PI) / 180, (rotationDegrees.y * Math.PI) / 180, (rotationDegrees.z * Math.PI) / 180, "XYZ"));
}

function createInverseVolumeRotation(rotationDegrees) {
    return createRotationQuaternion(rotationDegrees).invert();
}

function cross2d(origin, pointA, pointB) {
    return (pointA.x - origin.x) * (pointB.y - origin.y) - (pointA.y - origin.y) * (pointB.x - origin.x);
}

function buildConvexHull(points) {
    const sortedPoints = [...points]
        .map((point) => point.clone())
        .sort((left, right) => (left.x === right.x ? left.y - right.y : left.x - right.x));
    const uniquePoints = [];
    for (const point of sortedPoints) {
        const lastPoint = uniquePoints.at(-1);
        if (lastPoint === undefined || Math.abs(point.x - lastPoint.x) > WATER_CONTACT_EPSILON || Math.abs(point.y - lastPoint.y) > WATER_CONTACT_EPSILON) {
            uniquePoints.push(point);
        }
    }
    if (uniquePoints.length <= 2) {
        return uniquePoints;
    }
    const lowerHull = [];
    for (const point of uniquePoints) {
        while (lowerHull.length >= 2 && cross2d(lowerHull[lowerHull.length - 2], lowerHull[lowerHull.length - 1], point) <= WATER_CONTACT_EPSILON) {
            lowerHull.pop();
        }
        lowerHull.push(point);
    }
    const upperHull = [];
    for (let index = uniquePoints.length - 1; index >= 0; index -= 1) {
        const point = uniquePoints[index];
        if (point === undefined) {
            continue;
        }
        while (upperHull.length >= 2 && cross2d(upperHull[upperHull.length - 2], upperHull[upperHull.length - 1], point) <= WATER_CONTACT_EPSILON) {
            upperHull.pop();
        }
        upperHull.push(point);
    }
    lowerHull.pop();
    upperHull.pop();
    return [...lowerHull, ...upperHull];
}

function clipPolygonAgainstVerticalBoundary(polygon, limit, keepGreater) {
    if (polygon.length === 0) {
        return [];
    }
    const clipped = [];
    let previousPoint = polygon[polygon.length - 1] ?? null;
    if (previousPoint === null) {
        return [];
    }
    let previousInside = keepGreater ? previousPoint.x >= limit - WATER_CONTACT_EPSILON : previousPoint.x <= limit + WATER_CONTACT_EPSILON;
    for (const point of polygon) {
        const inside = keepGreater ? point.x >= limit - WATER_CONTACT_EPSILON : point.x <= limit + WATER_CONTACT_EPSILON;
        if (inside !== previousInside) {
            const deltaX = point.x - previousPoint.x;
            if (Math.abs(deltaX) > WATER_CONTACT_EPSILON) {
                const interpolation = (limit - previousPoint.x) / deltaX;
                clipped.push(new Vector2(limit, previousPoint.y + (point.y - previousPoint.y) * interpolation));
            }
        }
        if (inside) {
            clipped.push(point.clone());
        }
        previousPoint = point;
        previousInside = inside;
    }
    return clipped;
}

function clipPolygonAgainstHorizontalBoundary(polygon, limit, keepGreater) {
    if (polygon.length === 0) {
        return [];
    }
    const clipped = [];
    let previousPoint = polygon[polygon.length - 1] ?? null;
    if (previousPoint === null) {
        return [];
    }
    let previousInside = keepGreater ? previousPoint.y >= limit - WATER_CONTACT_EPSILON : previousPoint.y <= limit + WATER_CONTACT_EPSILON;
    for (const point of polygon) {
        const inside = keepGreater ? point.y >= limit - WATER_CONTACT_EPSILON : point.y <= limit + WATER_CONTACT_EPSILON;
        if (inside !== previousInside) {
            const deltaY = point.y - previousPoint.y;
            if (Math.abs(deltaY) > WATER_CONTACT_EPSILON) {
                const interpolation = (limit - previousPoint.y) / deltaY;
                clipped.push(new Vector2(previousPoint.x + (point.x - previousPoint.x) * interpolation, limit));
            }
        }
        if (inside) {
            clipped.push(point.clone());
        }
        previousPoint = point;
        previousInside = inside;
    }
    return clipped;
}

function clipPolygonToRectangle(polygon, minX, maxX, minZ, maxZ) {
    let clippedPolygon = polygon;
    clippedPolygon = clipPolygonAgainstVerticalBoundary(clippedPolygon, minX, true);
    clippedPolygon = clipPolygonAgainstVerticalBoundary(clippedPolygon, maxX, false);
    clippedPolygon = clipPolygonAgainstHorizontalBoundary(clippedPolygon, minZ, true);
    clippedPolygon = clipPolygonAgainstHorizontalBoundary(clippedPolygon, maxZ, false);
    return clippedPolygon;
}

function clipPolygonAgainstPlane3d(polygon, signedDistance) {
    if (polygon.length === 0) {
        return [];
    }
    const clipped = [];
    let previousPoint = polygon[polygon.length - 1] ?? null;
    if (previousPoint === null) {
        return [];
    }
    let previousDistance = signedDistance(previousPoint);
    let previousInside = previousDistance >= -WATER_CONTACT_EPSILON;
    for (const point of polygon) {
        const distance = signedDistance(point);
        const inside = distance >= -WATER_CONTACT_EPSILON;
        if (inside !== previousInside) {
            const interpolation = previousDistance / (previousDistance - distance);
            clipped.push(previousPoint.clone().lerp(point, interpolation));
        }
        if (inside) {
            clipped.push(point.clone());
        }
        previousPoint = point;
        previousDistance = distance;
        previousInside = inside;
    }
    return clipped;
}

function clipPolygonToContactVolume(polygon, halfX, minY, maxY, halfZ) {
    let clippedPolygon = polygon;
    clippedPolygon = clipPolygonAgainstPlane3d(clippedPolygon, (point) => point.x + halfX);
    clippedPolygon = clipPolygonAgainstPlane3d(clippedPolygon, (point) => halfX - point.x);
    clippedPolygon = clipPolygonAgainstPlane3d(clippedPolygon, (point) => point.y - minY);
    clippedPolygon = clipPolygonAgainstPlane3d(clippedPolygon, (point) => maxY - point.y);
    clippedPolygon = clipPolygonAgainstPlane3d(clippedPolygon, (point) => point.z + halfZ);
    clippedPolygon = clipPolygonAgainstPlane3d(clippedPolygon, (point) => halfZ - point.z);
    return clippedPolygon;
}

function calculatePolygonArea(polygon) {
    if (polygon.length < 3) {
        return 0;
    }
    let doubledArea = 0;
    for (let index = 0; index < polygon.length; index += 1) {
        const point = polygon[index];
        const nextPoint = polygon[(index + 1) % polygon.length];
        if (point === undefined || nextPoint === undefined) {
            continue;
        }
        doubledArea += point.x * nextPoint.y - nextPoint.x * point.y;
    }
    return Math.abs(doubledArea) * 0.5;
}

function createPatchFromProjectedPoints(projectedPoints, preferredAxis, minimumThickness) {
    const hull = buildConvexHull(projectedPoints);
    if (hull.length === 0) {
        return null;
    }
    const primaryAxis = preferredAxis !== null && preferredAxis.lengthSq() > WATER_CONTACT_EPSILON ? preferredAxis.clone().normalize() : new Vector2(1, 0);
    if (preferredAxis === null || preferredAxis.lengthSq() <= WATER_CONTACT_EPSILON) {
        let longestSegmentLength = 0;
        for (let index = 0; index < hull.length; index += 1) {
            const startPoint = hull[index];
            const endPoint = hull[(index + 1) % hull.length];
            if (startPoint === undefined || endPoint === undefined) {
                continue;
            }
            const segment = endPoint.clone().sub(startPoint);
            const segmentLength = segment.lengthSq();
            if (segmentLength > longestSegmentLength) {
                longestSegmentLength = segmentLength;
                primaryAxis.copy(segment.normalize());
            }
        }
    }
    if (primaryAxis.lengthSq() <= WATER_CONTACT_EPSILON) {
        return null;
    }
    const secondaryAxis = new Vector2(-primaryAxis.y, primaryAxis.x);
    let minPrimary = Number.POSITIVE_INFINITY;
    let maxPrimary = Number.NEGATIVE_INFINITY;
    let minSecondary = Number.POSITIVE_INFINITY;
    let maxSecondary = Number.NEGATIVE_INFINITY;
    for (const point of hull) {
        const primaryDistance = point.dot(primaryAxis);
        const secondaryDistance = point.dot(secondaryAxis);
        minPrimary = Math.min(minPrimary, primaryDistance);
        maxPrimary = Math.max(maxPrimary, primaryDistance);
        minSecondary = Math.min(minSecondary, secondaryDistance);
        maxSecondary = Math.max(maxSecondary, secondaryDistance);
    }
    const halfWidth = (maxPrimary - minPrimary) * 0.5;
    let halfDepth = (maxSecondary - minSecondary) * 0.5;
    if (halfWidth <= WATER_CONTACT_EPSILON) {
        return null;
    }
    if (halfDepth <= WATER_CONTACT_EPSILON || calculatePolygonArea(hull) <= WATER_CONTACT_EPSILON) {
        halfDepth = Math.max(halfDepth, minimumThickness);
    }
    if (halfDepth <= WATER_CONTACT_EPSILON) {
        return null;
    }
    const patchCenterPrimary = (minPrimary + maxPrimary) * 0.5;
    const patchCenterSecondary = (minSecondary + maxSecondary) * 0.5;
    return {
        x: primaryAxis.x * patchCenterPrimary + secondaryAxis.x * patchCenterSecondary,
        z: primaryAxis.y * patchCenterPrimary + secondaryAxis.y * patchCenterSecondary,
        halfWidth,
        halfDepth,
        axisX: primaryAxis.x,
        axisZ: primaryAxis.y
    };
}

function computeTriangleNormal(pointA, pointB, pointC) {
    const edgeAB = pointB.clone().sub(pointA);
    const edgeAC = pointC.clone().sub(pointA);
    const normal = edgeAB.cross(edgeAC);
    if (normal.lengthSq() <= WATER_CONTACT_EPSILON) {
        return null;
    }
    return normal.normalize();
}

function createPatchCornerPoints(patch) {
    const axis = new Vector2(patch.axisX, patch.axisZ);
    if (axis.lengthSq() <= WATER_CONTACT_EPSILON) {
        axis.set(1, 0);
    }
    else {
        axis.normalize();
    }
    const perpendicularAxis = new Vector2(-axis.y, axis.x);
    const center = new Vector2(patch.x, patch.z);
    return [
        center.clone().add(axis.clone().multiplyScalar(patch.halfWidth)).add(perpendicularAxis.clone().multiplyScalar(patch.halfDepth)),
        center.clone().add(axis.clone().multiplyScalar(patch.halfWidth)).add(perpendicularAxis.clone().multiplyScalar(-patch.halfDepth)),
        center.clone().add(axis.clone().multiplyScalar(-patch.halfWidth)).add(perpendicularAxis.clone().multiplyScalar(patch.halfDepth)),
        center.clone().add(axis.clone().multiplyScalar(-patch.halfWidth)).add(perpendicularAxis.clone().multiplyScalar(-patch.halfDepth))
    ];
}

function measurePatchExtentsInBasis(points, axis) {
    const perpendicularAxis = new Vector2(-axis.y, axis.x);
    let minPrimary = Number.POSITIVE_INFINITY;
    let maxPrimary = Number.NEGATIVE_INFINITY;
    let minSecondary = Number.POSITIVE_INFINITY;
    let maxSecondary = Number.NEGATIVE_INFINITY;
    for (const point of points) {
        const primaryDistance = point.dot(axis);
        const secondaryDistance = point.dot(perpendicularAxis);
        minPrimary = Math.min(minPrimary, primaryDistance);
        maxPrimary = Math.max(maxPrimary, primaryDistance);
        minSecondary = Math.min(minSecondary, secondaryDistance);
        maxSecondary = Math.max(maxSecondary, secondaryDistance);
    }
    return {
        minPrimary,
        maxPrimary,
        minSecondary,
        maxSecondary
    };
}

function getTriangleMeshMergeSettings(mergeProfile, minimumThickness) {
    if (mergeProfile === "aggressive") {
        return {
            axisAlignment: 0.88,
            normalAlignment: 0.9,
            minimumPrimaryGap: Math.max(0.26, minimumThickness * 2.8),
            minimumSecondaryGap: Math.max(0.18, minimumThickness * 2.2),
            primaryGapScale: 0.34,
            secondaryGapScale: 0.55
        };
    }
    return {
        axisAlignment: 0.95,
        normalAlignment: 0.97,
        minimumPrimaryGap: Math.max(0.08, minimumThickness * 1.25),
        minimumSecondaryGap: Math.max(0.1, minimumThickness * 1.4),
        primaryGapScale: 0.12,
        secondaryGapScale: 0.3
    };
}

function mergeTriangleMeshContactPatches(rawPatches, minimumThickness, mergeProfile) {
    const mergeSettings = getTriangleMeshMergeSettings(mergeProfile, minimumThickness);
    const clusters = [];
    for (const rawPatch of rawPatches) {
        const patchPoints = createPatchCornerPoints(rawPatch.patch);
        const patchAxis = new Vector2(rawPatch.patch.axisX, rawPatch.patch.axisZ);
        if (patchAxis.lengthSq() <= WATER_CONTACT_EPSILON) {
            patchAxis.set(1, 0);
        }
        else {
            patchAxis.normalize();
        }
        let merged = false;
        for (const cluster of clusters) {
            const alignment = Math.abs(cluster.axis.dot(patchAxis));
            if (alignment < mergeSettings.axisAlignment) {
                continue;
            }
            const normalAlignment = Math.abs(cluster.normal.dot(rawPatch.normal));
            if (normalAlignment < mergeSettings.normalAlignment) {
                continue;
            }
            const patchExtents = measurePatchExtentsInBasis(patchPoints, cluster.axis);
            const primaryGap = Math.max(0, Math.max(cluster.extents.minPrimary - patchExtents.maxPrimary, patchExtents.minPrimary - cluster.extents.maxPrimary));
            const secondaryGap = Math.max(0, Math.max(cluster.extents.minSecondary - patchExtents.maxSecondary, patchExtents.minSecondary - cluster.extents.maxSecondary));
            const clusterPrimarySpan = cluster.extents.maxPrimary - cluster.extents.minPrimary;
            const clusterSecondarySpan = cluster.extents.maxSecondary - cluster.extents.minSecondary;
            const allowedPrimaryGap = Math.max(mergeSettings.minimumPrimaryGap, Math.max(rawPatch.patch.halfWidth, clusterPrimarySpan) * mergeSettings.primaryGapScale);
            const allowedSecondaryGap = Math.max(mergeSettings.minimumSecondaryGap, Math.max(rawPatch.patch.halfDepth, clusterSecondarySpan) * mergeSettings.secondaryGapScale);
            if (primaryGap > allowedPrimaryGap || secondaryGap > allowedSecondaryGap) {
                continue;
            }
            cluster.points.push(...patchPoints.map((point) => point.clone()));
            cluster.extents = measurePatchExtentsInBasis(cluster.points, cluster.axis);
            merged = true;
            break;
        }
        if (!merged) {
            clusters.push({
                axis: patchAxis,
                normal: rawPatch.normal.clone(),
                points: patchPoints.map((point) => point.clone()),
                extents: measurePatchExtentsInBasis(patchPoints, patchAxis)
            });
        }
    }
    return clusters
        .map((cluster) => createPatchFromProjectedPoints(cluster.points, cluster.axis, minimumThickness))
        .filter((patch) => patch !== null);
}

function appendTriangleMeshContactPatches(patches, source, volume, inverseRotation, halfX, surfaceY, surfaceBand, halfZ) {
    const position = new Vector3(source.transform?.position.x ?? 0, source.transform?.position.y ?? 0, source.transform?.position.z ?? 0);
    const rotation = source.transform !== undefined ? createRotationQuaternion(source.transform.rotationDegrees) : null;
    const scale = new Vector3(source.transform?.scale.x ?? 1, source.transform?.scale.y ?? 1, source.transform?.scale.z ?? 1);
    const bandMinimumThickness = Math.max(0.08, Math.min(0.22, surfaceBand * 0.45));
    const triangleVertices = [new Vector3(), new Vector3(), new Vector3()];
    const rawPatches = [];
    for (let indexOffset = 0; indexOffset <= source.indices.length - 3; indexOffset += 3) {
        const polygon = [];
        for (let cornerIndex = 0; cornerIndex < 3; cornerIndex += 1) {
            const vertexIndex = source.indices[indexOffset + cornerIndex] ?? 0;
            const vertex = triangleVertices[cornerIndex] ?? new Vector3();
            vertex.set(source.vertices[vertexIndex * 3] ?? 0, source.vertices[vertexIndex * 3 + 1] ?? 0, source.vertices[vertexIndex * 3 + 2] ?? 0);
            vertex.multiply(scale);
            if (rotation !== null) {
                vertex.applyQuaternion(rotation);
            }
            vertex.add(position);
            vertex.x -= volume.center.x;
            vertex.y -= volume.center.y;
            vertex.z -= volume.center.z;
            vertex.applyQuaternion(inverseRotation);
            polygon.push(vertex.clone());
        }
        const triangleNormal = computeTriangleNormal(polygon[0] ?? new Vector3(), polygon[1] ?? new Vector3(), polygon[2] ?? new Vector3());
        if (triangleNormal === null) {
            continue;
        }
        const clippedPolygon = clipPolygonToContactVolume(polygon, halfX, surfaceY - surfaceBand, surfaceY + surfaceBand, halfZ);
        if (clippedPolygon.length < 2) {
            continue;
        }
        const patch = createPatchFromProjectedPoints(clippedPolygon.map((point) => new Vector2(point.x, point.z)), null, bandMinimumThickness);
        if (patch !== null) {
            rawPatches.push({
                patch,
                normal: triangleNormal
            });
        }
    }
    patches.push(...mergeTriangleMeshContactPatches(rawPatches, bandMinimumThickness, source.mergeProfile));
}

export function collectWaterContactPatches(volume, contactBounds) {
    const inverseRotation = createInverseVolumeRotation(volume.rotationDegrees);
    const halfX = Math.max(volume.size.x * 0.5, WATER_CONTACT_EPSILON);
    const halfY = Math.max(volume.size.y * 0.5, WATER_CONTACT_EPSILON);
    const halfZ = Math.max(volume.size.z * 0.5, WATER_CONTACT_EPSILON);
    const surfaceY = halfY;
    const surfaceBand = Math.max(0.18, Math.min(0.55, volume.size.y * 0.2));
    const localPoint = new Vector3();
    const patches = [];

    for (const source of contactBounds) {
        if ("kind" in source && source.kind === "triangleMesh") {
            appendTriangleMeshContactPatches(patches, source, volume, inverseRotation, halfX, surfaceY, surfaceBand, halfZ);
            continue;
        }
        const corners = "kind" in source ? createOrientedBoxCorners(source) : createBoundsCorners(source);
        const localCorners = [];
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;

        for (const corner of corners) {
            localPoint.copy(corner);
            localPoint.x -= volume.center.x;
            localPoint.y -= volume.center.y;
            localPoint.z -= volume.center.z;
            localPoint.applyQuaternion(inverseRotation);
            localCorners.push(localPoint.clone());
            minX = Math.min(minX, localPoint.x);
            minY = Math.min(minY, localPoint.y);
            minZ = Math.min(minZ, localPoint.z);
            maxX = Math.max(maxX, localPoint.x);
            maxY = Math.max(maxY, localPoint.y);
            maxZ = Math.max(maxZ, localPoint.z);
        }

        if (maxX <= -halfX || minX >= halfX || maxZ <= -halfZ || minZ >= halfZ) {
            continue;
        }

        if (maxY < surfaceY - surfaceBand || minY > surfaceY + surfaceBand) {
            continue;
        }

        const clippedFootprint = clipPolygonToRectangle(buildConvexHull(localCorners.map((corner) => new Vector2(corner.x, corner.z))), -halfX, halfX, -halfZ, halfZ);

        if (calculatePolygonArea(clippedFootprint) <= WATER_CONTACT_EPSILON) {
            continue;
        }

        const verticalDistance = Math.min(Math.abs(surfaceY - minY), Math.abs(maxY - surfaceY));

        if (1 - Math.min(verticalDistance / surfaceBand, 1) <= WATER_CONTACT_EPSILON) {
            continue;
        }

        let preferredAxis = null;

        if ("kind" in source) {
            const sourceRotation = createRotationQuaternion(source.rotationDegrees);
            const projectedSourceX = new Vector2(new Vector3(1, 0, 0).applyQuaternion(sourceRotation).applyQuaternion(inverseRotation).x, new Vector3(1, 0, 0).applyQuaternion(sourceRotation).applyQuaternion(inverseRotation).z);
            const projectedSourceZ = new Vector2(new Vector3(0, 0, 1).applyQuaternion(sourceRotation).applyQuaternion(inverseRotation).x, new Vector3(0, 0, 1).applyQuaternion(sourceRotation).applyQuaternion(inverseRotation).z);
            const nextPrimaryAxis = projectedSourceX.lengthSq() >= projectedSourceZ.lengthSq() ? projectedSourceX : projectedSourceZ;

            if (nextPrimaryAxis.lengthSq() > WATER_CONTACT_EPSILON) {
                preferredAxis = nextPrimaryAxis.normalize();
            }
        }
        const patch = createPatchFromProjectedPoints(clippedFootprint, preferredAxis, Math.max(0.08, Math.min(0.18, surfaceBand * 0.4)));
        if (patch !== null) {
            patches.push(patch);
        }
    }

    return patches
        .sort((left, right) => right.halfWidth * right.halfDepth - left.halfWidth * left.halfDepth)
        .slice(0, MAX_WATER_CONTACT_PATCHES);
}

export function createWaterContactPatchUniformValue(contactPatches) {
    return Array.from({ length: MAX_WATER_CONTACT_PATCHES }, (_, index) => {
        const patch = contactPatches?.[index];
        return new Vector4(patch?.x ?? 0, patch?.z ?? 0, patch?.halfWidth ?? 0, patch?.halfDepth ?? 0);
    });
}

export function createWaterContactPatchAxisUniformValue(contactPatches) {
    return Array.from({ length: MAX_WATER_CONTACT_PATCHES }, (_, index) => {
        const patch = contactPatches?.[index];
        return new Vector2(patch?.axisX ?? 1, patch?.axisZ ?? 0);
    });
}

export function createWaterMaterial(options) {
    if (options.wireframe) {
        return {
            material: new MeshBasicMaterial({
                color: options.colorHex,
                wireframe: true,
                transparent: true,
                opacity: Math.min(1, options.opacity + 0.2),
                depthWrite: false
            }),
            animationUniform: null,
            contactPatchesUniform: null,
            contactPatchAxesUniform: null
        };
    }

    if (!options.quality) {
        return {
            material: new MeshBasicMaterial({
                color: options.colorHex,
                transparent: true,
                opacity: options.opacity,
                depthWrite: false
            }),
            animationUniform: null,
            contactPatchesUniform: null,
            contactPatchAxesUniform: null
        };
    }

    const animationUniform = { value: options.time };
    const halfSize = new Vector2(Math.max(options.halfSize.x, WATER_CONTACT_EPSILON), Math.max(options.halfSize.z, WATER_CONTACT_EPSILON));
    const contactPatchesUniform = { value: createWaterContactPatchUniformValue(options.contactPatches) };
    const contactPatchAxesUniform = { value: createWaterContactPatchAxisUniformValue(options.contactPatches) };
    const waveStrength = Math.max(0, options.waveStrength);
    const waveAmplitude = 0.016 + Math.min(0.12, waveStrength * 0.06);
    const clampedOpacity = Math.max(0.14, Math.min(1, options.opacity));
    const topFaceFlag = options.isTopFace ? 1 : 0;
    const hex = options.colorHex.replace("#", "");
    const cr = parseInt(hex.substring(0, 2), 16) / 255;
    const cg = parseInt(hex.substring(2, 4), 16) / 255;
    const cb = parseInt(hex.substring(4, 6), 16) / 255;

    const vertexShader = /* glsl */ `
        uniform float time;
        uniform float waveStrength;
        uniform float waveAmplitude;
        uniform float isTopFace;

        varying vec2 vLocalSurfaceUv;
        varying vec3 vWaveNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewDir;

        void main() {
            vec3 transformedPosition = position;
            vLocalSurfaceUv = position.xz;
            vWaveNormal = vec3(0.0, 1.0, 0.0);

            if (isTopFace > 0.5) {
                vec2 dirA = normalize(vec2(0.92, 0.38));
                vec2 dirB = normalize(vec2(-0.34, 0.94));
                vec2 dirC = normalize(vec2(0.58, -0.81));
                float phaseA = dot(vLocalSurfaceUv, dirA) / 2.3 + time * 0.92;
                float phaseB = dot(vLocalSurfaceUv, dirB) / 1.45 - time * 1.08;
                float phaseC = dot(vLocalSurfaceUv, dirC) / 0.82 + time * 1.42;
                float waveA = sin(phaseA) * 0.55;
                float waveB = sin(phaseB) * 0.30;
                float waveC = sin(phaseC) * 0.15;

                transformedPosition.y += (waveA + waveB + waveC) * waveAmplitude;

                vec2 slope =
                    dirA * (cos(phaseA) / 2.3) * 0.55 +
                    dirB * (cos(phaseB) / 1.45) * 0.30 +
                    dirC * (cos(phaseC) / 0.82) * 0.15;
                vWaveNormal = normalize(vec3(-slope.x * (0.3 + waveStrength * 0.7), 1.0, -slope.y * (0.3 + waveStrength * 0.7)));
            }

            vec4 worldPos = modelMatrix * vec4(transformedPosition, 1.0);
            vWorldPos = worldPos.xyz;
            vViewDir = normalize(cameraPosition - worldPos.xyz);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `;

    const fragmentShader = /* glsl */ `
        precision highp float;

        uniform vec3 waterColor;
        uniform float surfaceOpacity;
        uniform float waveStrength;
        uniform float time;
        uniform float isTopFace;
        uniform vec2 halfSize;
        uniform vec4 contactPatches[${MAX_WATER_CONTACT_PATCHES}];
        uniform vec2 contactPatchAxes[${MAX_WATER_CONTACT_PATCHES}];

        varying vec2 vLocalSurfaceUv;
        varying vec3 vWaveNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewDir;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);

            return mix(
                mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
                u.y
            );
        }

        float fbm(vec2 p) {
            float value = 0.0;
            float amplitude = 0.5;

            for (int octave = 0; octave < 4; octave += 1) {
                value += noise(p) * amplitude;
                p = p * 2.02 + vec2(17.1, 11.7);
                amplitude *= 0.5;
            }

            return value;
        }

        void main() {
            vec3 normal = normalize(vWaveNormal);
            vec3 viewDir = normalize(vViewDir);
            float fresnel = pow(1.0 - clamp(dot(viewDir, normal), 0.0, 1.0), 2.8);

            float largeWave = fbm(vLocalSurfaceUv * 0.42 + vec2(time * 0.06, -time * 0.04));
            float mediumWave = fbm(vLocalSurfaceUv * 0.95 + normal.xz * 0.55 + vec2(-time * 0.11, time * 0.09));
            float microWave = noise(vLocalSurfaceUv * 3.6 + normal.xz * 1.6 + vec2(time * 0.24, -time * 0.19));
            float caustics = fbm(vLocalSurfaceUv * 1.8 + normal.xz * 1.2 + vec2(time * 0.16, -time * 0.14));
            caustics *= fbm(vLocalSurfaceUv * 2.7 - normal.xz * 1.4 + vec2(-time * 0.21, time * 0.18));

            vec3 deepTint = waterColor * vec3(0.52, 0.66, 0.78);
            vec3 shallowTint = mix(waterColor, vec3(0.72, 0.9, 1.0), 0.2 + fresnel * 0.24);
            float contactFoam = 0.0;
            float contactRipple = 0.0;
            float contactSheen = 0.0;

            float edgeDistance = min(halfSize.x - abs(vLocalSurfaceUv.x), halfSize.y - abs(vLocalSurfaceUv.y));
            float edgeBand = max(0.22, min(halfSize.x, halfSize.y) * 0.12);
            float edgeFoam = isTopFace > 0.5 ? 1.0 - smoothstep(0.0, edgeBand, edgeDistance) : 0.0;

            if (isTopFace > 0.5) {
                for (int patchIndex = 0; patchIndex < ${MAX_WATER_CONTACT_PATCHES}; patchIndex += 1) {
                    vec4 patchData = contactPatches[patchIndex];
                    if (patchData.z <= 0.0 || patchData.w <= 0.0) {
                        continue;
                    }

                    vec2 patchAxis = normalize(contactPatchAxes[patchIndex]);
                    vec2 patchPerpendicular = vec2(-patchAxis.y, patchAxis.x);
                    vec2 patchDelta = vLocalSurfaceUv - patchData.xy;
                    vec2 orientedDelta = vec2(dot(patchDelta, patchAxis), dot(patchDelta, patchPerpendicular));
                    vec2 regionDelta = abs(orientedDelta) - patchData.zw;
                    vec2 outsideDelta = max(regionDelta, 0.0);
                    float outsideDistance = length(outsideDelta);
                    float insideDistance = min(max(regionDelta.x, regionDelta.y), 0.0);
                    float signedDistance = outsideDistance + insideDistance;
                    float boundaryScale = max(min(patchData.z, patchData.w), 0.18);
                    float normalizedDistance = abs(signedDistance) / boundaryScale;
                    float contactBody = 1.0 - smoothstep(0.0, 0.65, max(signedDistance, 0.0) / boundaryScale);
                    float ripple = (sin(normalizedDistance * 13.0 - time * 3.2) * 0.5 + 0.5) * exp(-normalizedDistance * 2.6);
                    float wakeNoise = noise(vLocalSurfaceUv * 3.4 + vec2(time * 0.34, -time * 0.28));
                    float foamField = max(contactBody * 0.42, ripple * (0.72 + wakeNoise * 0.28));
                    contactFoam = max(contactFoam, foamField);
                    contactRipple = max(contactRipple, ripple);
                    contactSheen = max(contactSheen, contactBody);
                }
            }

            float refraction = (largeWave - 0.5) * 0.18 + (mediumWave - 0.5) * 0.14 + (microWave - 0.5) * 0.08 + contactRipple * 0.06;
            float glints = smoothstep(0.78, 0.97, fbm(vLocalSurfaceUv * 4.8 + normal.xz * 2.2 + vec2(time * 0.38, -time * 0.31))) * (0.14 + fresnel * 0.28);
            vec3 color = mix(deepTint, shallowTint, clamp(0.46 + refraction + fresnel * 0.24 + caustics * 0.08, 0.05, 0.98));
            float foam = clamp(max(edgeFoam * 0.48, contactFoam) * (0.52 + waveStrength * 0.8) + caustics * 0.08 + glints * 0.06, 0.0, 0.84);
            vec3 specular = vec3(pow(max(0.0, dot(reflect(-viewDir, normal), normalize(vec3(0.25, 0.88, 0.35)))), 18.0)) * (0.14 + fresnel * 0.56 + caustics * 0.14 + contactSheen * 0.12);

            color = mix(color, vec3(0.97, 0.99, 1.0), foam);
            color += specular;
            color += vec3(0.05, 0.08, 0.12) * fresnel;
            color += vec3(0.02, 0.05, 0.08) * caustics;

            float alpha = isTopFace > 0.5
                ? clamp(surfaceOpacity + fresnel * 0.18 + foam * 0.16 + contactRipple * 0.08, 0.32, 0.92)
                : clamp(surfaceOpacity * 0.72 + refraction * 0.08 + caustics * 0.04, 0.16, 0.7);

            gl_FragColor = vec4(color, alpha);
        }
    `;

    const material = new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            time: animationUniform,
            waterColor: { value: [cr, cg, cb] },
            surfaceOpacity: { value: clampedOpacity },
            waveStrength: { value: waveStrength },
            waveAmplitude: { value: waveAmplitude },
            isTopFace: { value: topFaceFlag },
            halfSize: { value: halfSize },
            contactPatches: contactPatchesUniform,
            contactPatchAxes: contactPatchAxesUniform
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide
    });

    return {
        material,
        animationUniform,
        contactPatchesUniform,
        contactPatchAxesUniform
    };
}