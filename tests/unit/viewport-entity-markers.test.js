import { BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { describe, expect, it } from "vitest";
import { createSoundEmitterMarkerMeshes } from "../../src/viewport-three/viewport-entity-markers";
describe("createSoundEmitterMarkerMeshes", () => {
    it("builds a speaker-like marker instead of a sphere", () => {
        const meshes = createSoundEmitterMarkerMeshes(0x72d7c9, false);
        expect(meshes).toHaveLength(5);
        expect(meshes[0].geometry).toBeInstanceOf(BoxGeometry);
        expect(meshes[1].geometry).toBeInstanceOf(TorusGeometry);
        expect(meshes[2].geometry).toBeInstanceOf(CylinderGeometry);
        expect(meshes[3].geometry).toBeInstanceOf(TorusGeometry);
        expect(meshes[4].geometry).toBeInstanceOf(CylinderGeometry);
        expect(meshes.some((mesh) => mesh.geometry instanceof SphereGeometry)).toBe(false);
        expect(meshes[0].position).toMatchObject({
            x: 0,
            y: 0,
            z: 0
        });
        expect(meshes[1].position.y).toBeGreaterThan(meshes[3].position.y);
        expect(meshes[1].position.z).toBeGreaterThan(0);
        expect(meshes[3].position.z).toBeGreaterThan(0);
    });
});
