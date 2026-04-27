import { describe, expect, it } from "vitest";

import { migrateSceneDocument } from "../../src/document/migrate-scene-document";
import {
  createEmptySceneDocument,
  PLAYER_START_INTERACTION_REACH_SCENE_DOCUMENT_VERSION
} from "../../src/document/scene-document";
import {
  DEFAULT_PLAYER_START_INTERACTION_ANGLE_DEGREES,
  DEFAULT_PLAYER_START_INTERACTION_REACH_METERS,
  createPlayerStartEntity
} from "../../src/entities/entity-instances";
import {
  parseSceneDocumentJson,
  serializeSceneDocument
} from "../../src/serialization/scene-document-json";

describe("Player Start interaction sector persistence", () => {
  it("migrates legacy player starts without an authored interaction sector", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-legacy"
    });
    const legacyPlayerStart = {
      ...playerStart
    } as Record<string, unknown>;

    delete legacyPlayerStart.interactionReachMeters;
    delete legacyPlayerStart.interactionAngleDegrees;

    const migrated = migrateSceneDocument({
      ...createEmptySceneDocument({ name: "Legacy Reach Scene" }),
      version: PLAYER_START_INTERACTION_REACH_SCENE_DOCUMENT_VERSION,
      entities: {
        [playerStart.id]: legacyPlayerStart
      }
    });

    expect(migrated.entities[playerStart.id]).toMatchObject({
      kind: "playerStart",
      interactionReachMeters: DEFAULT_PLAYER_START_INTERACTION_REACH_METERS,
      interactionAngleDegrees: DEFAULT_PLAYER_START_INTERACTION_ANGLE_DEGREES
    });
  });

  it("round-trips authored interaction sector settings through scene JSON", () => {
    const playerStart = createPlayerStartEntity({
      id: "entity-player-start-round-trip",
      interactionReachMeters: 3.4,
      interactionAngleDegrees: 42
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
      interactionReachMeters: 3.4,
      interactionAngleDegrees: 42
    });
  });
});
