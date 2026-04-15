import { describe, expect, it } from "vitest";

import {
  createRadialPrismBrush,
  createWedgeBrush
} from "../../src/document/brushes";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { buildRuntimeSceneFromDocument } from "../../src/runtime-three/runtime-scene-build";

describe("whitebox primitives runtime build", () => {
  it("builds runtime meshes and colliders for wedge and cylinder solids", () => {
    const document = createEmptySceneDocument({ name: "Primitive Runtime" });
    const wedge = createWedgeBrush({
      id: "brush-wedge-runtime",
      center: { x: -2, y: 1, z: 0 }
    });
    const cylinder = createRadialPrismBrush({
      id: "brush-cylinder-runtime",
      center: { x: 2, y: 1, z: 0 },
      sideCount: 12
    });
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-primitives"
    });

    document.brushes[wedge.id] = wedge;
    document.brushes[cylinder.id] = cylinder;
    document.entities[playerStart.id] = playerStart;

    const runtimeScene = buildRuntimeSceneFromDocument(document);

    expect(runtimeScene.brushes.map((brush) => brush.kind)).toEqual([
      "wedge",
      "radialPrism"
    ]);
    expect(runtimeScene.colliders).toHaveLength(2);
    expect(
      runtimeScene.colliders.every(
        (collider) =>
          collider.kind === "trimesh" &&
          collider.source === "brush" &&
          collider.vertices.length > 0 &&
          collider.indices.length > 0
      )
    ).toBe(true);
  });
});
