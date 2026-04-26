import { describe, expect, it } from "vitest";

import { migrateSceneDocument } from "../../src/document/migrate-scene-document";
import {
  createEmptySceneDocument,
  SHADER_SKY_AURORA_SCENE_DOCUMENT_VERSION
} from "../../src/document/scene-document";
import {
  DEFAULT_PLAYER_START_INTERACTION_REACH_METERS,
  createPlayerStartEntity
} from "../../src/entities/entity-instances";
import {
  parseSceneDocumentJson,
  serializeSceneDocument
} from "../../src/serialization/scene-document-json";

describe("Player Start interaction reach persistence", () => {
  it("migrates legacy player starts without an authored interaction reach", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-legacy"
    });
    const legacyPlayerStart = {
      ...playerStart
    } as Record<string, unknown>;

    delete legacyPlayerStart.interactionReachMeters;

    const migrated = migrateSceneDocument({
      ...createEmptySceneDocument({ name: "Legacy Reach Scene" }),
      version: SHADER_SKY_AURORA_SCENE_DOCUMENT_VERSION,
      entities: {
        [playerStart.id]: legacyPlayerStart
      }
    });

    expect(migrated.entities[playerStart.id]).toMatchObject({
      kind: "playerStart",
      interactionReachMeters: DEFAULT_PLAYER_START_INTERACTION_REACH_METERS
    });
  });

  it("round-trips an authored interaction reach through scene JSON", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-round-trip",
      interactionReachMeters: 3.4
    });
    const document = {
      ...createEmptySceneDocument({ name: "Round Trip Reach Scene" }),
      entities: {
        [playerStart.id]: playerStart
      }
    };

    const parsed = parseSceneDocumentJson(serializeSceneDocument(document));

    expect(parsed.entities[playerStart.id]).toMatchObject({
      kind: "playerStart",
      interactionReachMeters: 3.4
    });
  });
});
