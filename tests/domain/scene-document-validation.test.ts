import { describe, expect, it } from "vitest";

import { createBoxBrush } from "../../src/document/brushes";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { validateSceneDocument } from "../../src/document/scene-document-validation";
import { createPlayerStartEntity } from "../../src/entities/entity-instances";

describe("validateSceneDocument", () => {
  it("accepts a valid first-room document", () => {
    const brush = createBoxBrush({
      id: "brush-room-shell"
    });
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-main"
    });
    const document = {
      ...createEmptySceneDocument({ name: "First Room" }),
      brushes: {
        [brush.id]: brush
      },
      entities: {
        [playerStart.id]: playerStart
      }
    };

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual([]);
    expect(validation.warnings).toEqual([]);
  });

  it("detects duplicate authored ids across collections", () => {
    const brush = createBoxBrush({
      id: "shared-room-id"
    });
    const playerStart = createPlayerStartEntity({
      id: "shared-room-id"
    });
    const document = {
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      },
      entities: {
        "entity-player-start-main": playerStart
      }
    };

    const validation = validateSceneDocument(document);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "entity-id-mismatch"
        }),
        expect.objectContaining({
          code: "duplicate-authored-id"
        })
      ])
    );
  });

  it("detects invalid box sizes and missing material references", () => {
    const brush = createBoxBrush({
      id: "brush-invalid"
    });
    brush.size.x = 0;
    brush.faces.posZ.materialId = "material-that-does-not-exist";

    const validation = validateSceneDocument({
      ...createEmptySceneDocument(),
      brushes: {
        [brush.id]: brush
      }
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-box-size",
          path: "brushes.brush-invalid.size"
        }),
        expect.objectContaining({
          code: "missing-material-ref",
          path: "brushes.brush-invalid.faces.posZ.materialId"
        })
      ])
    );
  });

  it("detects invalid Player Start values", () => {
    const validation = validateSceneDocument({
      ...createEmptySceneDocument(),
      entities: {
        "entity-player-start-main": {
          id: "entity-player-start-main",
          kind: "playerStart",
          position: {
            x: 0,
            y: Number.NaN,
            z: 0
          },
          yawDegrees: Number.NaN
        }
      }
    });

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-player-start-position"
        }),
        expect.objectContaining({
          code: "invalid-player-start-yaw"
        })
      ])
    );
  });
});
