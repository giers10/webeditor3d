import { describe, expect, it } from "vitest";

import { createAddPathPointCommand } from "../../src/commands/add-path-point-command";
import { createApplySplineRoadToTerrainCommand } from "../../src/commands/apply-spline-road-to-terrain-command";
import { createEditorStore } from "../../src/app/editor-store";
import { createDeletePathCommand } from "../../src/commands/delete-path-command";
import { createDeletePathPointCommand } from "../../src/commands/delete-path-point-command";
import { createDeletePathPointsCommand } from "../../src/commands/delete-path-points-command";
import { createSetPathPointPositionCommand } from "../../src/commands/set-path-point-position-command";
import { createSetPathPointPositionsCommand } from "../../src/commands/set-path-point-positions-command";
import { createSetPathNameCommand } from "../../src/commands/set-path-name-command";
import { createUpsertPathCommand } from "../../src/commands/upsert-path-command";
import { createScenePath, createScenePathPoint } from "../../src/document/paths";
import { createEmptySceneDocument } from "../../src/document/scene-document";
import { createSplineCorridorJunction } from "../../src/document/spline-corridor-junctions";
import { createTerrain } from "../../src/document/terrains";

describe("path commands", () => {
  it("creates, renames, and deletes authored paths through undo and redo", () => {
    const store = createEditorStore({
      initialDocument: createEmptySceneDocument({
        name: "Path Command Scene"
      })
    });
    const path = createScenePath({
      id: "path-patrol",
      points: [
        {
          id: "path-point-a",
          position: {
            x: -1,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-point-b",
          position: {
            x: 1,
            y: 0,
            z: 0
          }
        }
      ]
    });

    store.executeCommand(
      createUpsertPathCommand({
        path,
        label: "Create patrol path"
      })
    );

    expect(store.getState().document.paths[path.id]).toEqual(path);
    expect(store.getState().selection).toEqual({
      kind: "paths",
      ids: [path.id]
    });

    store.executeCommand(
      createSetPathNameCommand({
        pathId: path.id,
        name: "Patrol Route"
      })
    );

    expect(store.getState().document.paths[path.id]?.name).toBe("Patrol Route");

    store.executeCommand(createDeletePathCommand(path.id));

    expect(store.getState().document.paths[path.id]).toBeUndefined();
    expect(store.getState().selection).toEqual({
      kind: "none"
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.name).toBe("Patrol Route");

    expect(store.undo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.name).toBeUndefined();

    expect(store.undo()).toBe(true);
    expect(store.getState().document.paths[path.id]).toBeUndefined();

    expect(store.redo()).toBe(true);
    expect(store.getState().document.paths[path.id]).toEqual(path);

    expect(store.redo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.name).toBe("Patrol Route");

    expect(store.redo()).toBe(true);
    expect(store.getState().document.paths[path.id]).toBeUndefined();
  });

  it("adds and deletes path points with undo and redo while keeping point selection coherent", () => {
    const path = createScenePath({
      id: "path-point-ops",
      points: [
        {
          id: "path-point-start",
          position: {
            x: -1,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-point-end",
          position: {
            x: 1,
            y: 0,
            z: 0
          }
        }
      ]
    });
    const nextPoint = createScenePathPoint({
      id: "path-point-new",
      position: {
        x: 3,
        y: 0,
        z: 0
      }
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({
          name: "Path Point Command Scene"
        }),
        paths: {
          [path.id]: path
        }
      }
    });

    store.setSelection({
      kind: "paths",
      ids: [path.id]
    });

    store.executeCommand(
      createAddPathPointCommand({
        pathId: path.id,
        point: nextPoint
      })
    );

    expect(store.getState().document.paths[path.id]?.points).toHaveLength(3);
    expect(store.getState().selection).toEqual({
      kind: "pathPoint",
      pathId: path.id,
      pointId: nextPoint.id
    });

    store.executeCommand(
      createDeletePathPointCommand({
        pathId: path.id,
        pointId: nextPoint.id
      })
    );

    expect(store.getState().document.paths[path.id]?.points).toHaveLength(2);
    expect(store.getState().selection).toEqual({
      kind: "pathPoint",
      pathId: path.id,
      pointId: path.points[1].id
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.points).toHaveLength(3);
    expect(store.getState().selection).toEqual({
      kind: "pathPoint",
      pathId: path.id,
      pointId: nextPoint.id
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.points).toHaveLength(2);
    expect(store.getState().selection).toEqual({
      kind: "paths",
      ids: [path.id]
    });

    expect(store.redo()).toBe(true);
    expect(store.getState().selection).toEqual({
      kind: "pathPoint",
      pathId: path.id,
      pointId: nextPoint.id
    });

    expect(store.redo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.points).toHaveLength(2);
  });

  it("inserts added path points after the requested anchor point", () => {
    const path = createScenePath({
      id: "path-point-insert",
      points: [
        {
          id: "path-point-a",
          position: {
            x: 0,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-point-b",
          position: {
            x: 4,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-point-c",
          position: {
            x: 8,
            y: 0,
            z: 0
          }
        }
      ]
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({
          name: "Path Point Insert Command Scene"
        }),
        paths: {
          [path.id]: path
        }
      }
    });

    store.executeCommand(
      createAddPathPointCommand({
        pathId: path.id,
        insertAfterPointId: "path-point-a"
      })
    );

    const updatedPath = store.getState().document.paths[path.id];
    const insertedPoint = updatedPath?.points[1];

    expect(updatedPath?.points.map((point) => point.id)).toEqual([
      "path-point-a",
      insertedPoint?.id,
      "path-point-b",
      "path-point-c"
    ]);
    expect(insertedPoint?.position).toEqual({
      x: 2,
      y: 0,
      z: 0
    });
    expect(store.getState().selection).toEqual({
      kind: "pathPoint",
      pathId: path.id,
      pointId: insertedPoint?.id
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.points).toEqual(
      path.points
    );

    expect(store.redo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.points[1]?.id).toBe(
      insertedPoint?.id
    );
  });

  it("moves and deletes multiple path points with undo and redo", () => {
    const path = createScenePath({
      id: "path-point-batch-ops",
      points: [
        {
          id: "path-point-a",
          position: {
            x: -2,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-point-b",
          position: {
            x: 0,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-point-c",
          position: {
            x: 2,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-point-d",
          position: {
            x: 4,
            y: 0,
            z: 0
          }
        }
      ]
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({
          name: "Path Point Batch Command Scene"
        }),
        paths: {
          [path.id]: path
        }
      }
    });

    store.setSelection({
      kind: "pathPoints",
      pathId: path.id,
      pointIds: [path.points[0].id, path.points[2].id]
    });

    store.executeCommand(
      createSetPathPointPositionsCommand({
        pathId: path.id,
        updates: [
          {
            pointId: path.points[0].id,
            position: {
              x: -3,
              y: 1,
              z: 2
            }
          },
          {
            pointId: path.points[2].id,
            position: {
              x: 3,
              y: 1,
              z: 2
            }
          }
        ]
      })
    );

    expect(store.getState().document.paths[path.id]?.points).toEqual([
      {
        ...path.points[0],
        position: {
          x: -3,
          y: 1,
          z: 2
        }
      },
      path.points[1],
      {
        ...path.points[2],
        position: {
          x: 3,
          y: 1,
          z: 2
        }
      },
      path.points[3]
    ]);
    expect(store.getState().selection).toEqual({
      kind: "pathPoints",
      pathId: path.id,
      pointIds: [path.points[0].id, path.points[2].id]
    });

    store.executeCommand(
      createDeletePathPointsCommand({
        pathId: path.id,
        pointIds: [path.points[0].id, path.points[2].id]
      })
    );

    expect(store.getState().document.paths[path.id]?.points).toEqual([
      path.points[1],
      path.points[3]
    ]);
    expect(store.getState().selection).toEqual({
      kind: "pathPoint",
      pathId: path.id,
      pointId: path.points[1].id
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.points).toHaveLength(4);
    expect(store.getState().selection).toEqual({
      kind: "pathPoints",
      pathId: path.id,
      pointIds: [path.points[0].id, path.points[2].id]
    });

    expect(store.undo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.points).toEqual(
      path.points
    );

    expect(store.redo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.points[0]?.position).toEqual(
      {
        x: -3,
        y: 1,
        z: 2
      }
    );

    expect(store.redo()).toBe(true);
    expect(store.getState().document.paths[path.id]?.points).toEqual([
      path.points[1],
      path.points[3]
    ]);
  });

  it("reattaches spline corridor junctions when path points move", () => {
    const pathA = createScenePath({
      id: "path-junction-move-a",
      road: {
        enabled: true,
        width: 2,
        shoulderWidth: 1
      },
      points: [
        {
          id: "path-junction-move-a-start",
          position: {
            x: -5,
            y: 0,
            z: 0
          }
        },
        {
          id: "path-junction-move-a-end",
          position: {
            x: 5,
            y: 0,
            z: 0
          }
        }
      ]
    });
    const pathB = createScenePath({
      id: "path-junction-move-b",
      road: {
        enabled: true,
        width: 2,
        shoulderWidth: 1
      },
      points: [
        {
          id: "path-junction-move-b-start",
          position: {
            x: 0,
            y: 0,
            z: -5
          }
        },
        {
          id: "path-junction-move-b-end",
          position: {
            x: 0,
            y: 0,
            z: 5
          }
        }
      ]
    });
    const junction = createSplineCorridorJunction({
      id: "junction-path-point-move",
      center: {
        x: 0,
        y: 0,
        z: 0
      },
      connections: [
        {
          pathId: pathA.id,
          progress: 0.5
        },
        {
          pathId: pathB.id,
          progress: 0.5
        }
      ]
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({
          name: "Path Point Junction Reattach Scene"
        }),
        paths: {
          [pathA.id]: pathA,
          [pathB.id]: pathB
        },
        splineCorridorJunctions: {
          [junction.id]: junction
        }
      }
    });

    store.executeCommand(
      createSetPathPointPositionCommand({
        pathId: pathB.id,
        pointId: "path-junction-move-b-start",
        position: {
          x: 2,
          y: 0,
          z: -5
        }
      })
    );

    expect(
      store.getState().document.splineCorridorJunctions[junction.id]?.center.x
    ).toBeCloseTo(1);
    expect(
      store.getState().document.splineCorridorJunctions[junction.id]?.center.z
    ).toBeCloseTo(0);

    expect(store.undo()).toBe(true);
    expect(
      store.getState().document.splineCorridorJunctions[junction.id]?.center
    ).toEqual(junction.center);

    store.executeCommand(
      createSetPathPointPositionsCommand({
        pathId: pathB.id,
        updates: [
          {
            pointId: "path-junction-move-b-start",
            position: {
              x: 3,
              y: 0,
              z: -5
            }
          },
          {
            pointId: "path-junction-move-b-end",
            position: {
              x: 3,
              y: 0,
              z: 5
            }
          }
        ]
      })
    );

    expect(
      store.getState().document.splineCorridorJunctions[junction.id]?.center.x
    ).toBeCloseTo(3);
    expect(store.undo()).toBe(true);
    expect(
      store.getState().document.splineCorridorJunctions[junction.id]?.center
    ).toEqual(junction.center);
  });

  it("applies a spline road to terrain as one undoable terrain patch", () => {
    const terrain = createTerrain({
      id: "terrain-road-apply",
      position: {
        x: 0,
        y: 0,
        z: 0
      },
      sampleCountX: 5,
      sampleCountZ: 5,
      cellSize: 1,
      heights: new Array(25).fill(0),
      layers: [
        {
          materialId: "base-material"
        },
        {
          materialId: "road-material"
        },
        {
          materialId: null
        },
        {
          materialId: null
        }
      ]
    });
    const path = createScenePath({
      id: "path-road-apply",
      road: {
        enabled: true,
        width: 2,
        shoulderWidth: 1,
        falloff: 0.5,
        heightOffset: 0,
        terrainConform: false,
        materialId: "road-material"
      },
      points: [
        {
          id: "path-point-road-a",
          position: {
            x: 0,
            y: 1,
            z: 2
          }
        },
        {
          id: "path-point-road-b",
          position: {
            x: 4,
            y: 1,
            z: 2
          }
        }
      ]
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({
          name: "Path Road Apply Scene"
        }),
        paths: {
          [path.id]: path
        },
        terrains: {
          [terrain.id]: terrain
        }
      }
    });

    store.setSelection({
      kind: "paths",
      ids: [path.id]
    });

    store.executeCommand(
      createApplySplineRoadToTerrainCommand({
        pathId: path.id
      })
    );

    const appliedTerrain = store.getState().document.terrains[terrain.id];

    expect(appliedTerrain?.heights[12]).toBe(1);
    expect(appliedTerrain?.paintWeights[12 * 3]).toBe(1);
    expect(appliedTerrain?.foliageBlockerMask.values[12]).toBe(1);
    expect(store.getState().selection).toEqual({
      kind: "paths",
      ids: [path.id]
    });

    expect(store.undo()).toBe(true);

    const restoredTerrain = store.getState().document.terrains[terrain.id];

    expect(restoredTerrain?.heights).toEqual(terrain.heights);
    expect(restoredTerrain?.paintWeights).toEqual(terrain.paintWeights);
    expect(restoredTerrain?.foliageBlockerMask.values).toEqual(
      terrain.foliageBlockerMask.values
    );

    expect(store.redo()).toBe(true);
    expect(store.getState().document.terrains[terrain.id]?.heights[12]).toBe(1);
  });

  it("auto-adds a missing road material terrain layer while applying a spline road", () => {
    const terrain = createTerrain({
      id: "terrain-road-auto-layer",
      position: {
        x: 0,
        y: 0,
        z: 0
      },
      sampleCountX: 3,
      sampleCountZ: 3,
      cellSize: 1,
      layers: [
        {
          materialId: "patchy_grass_ground_250x250"
        }
      ],
      paintWeights: []
    });
    const path = createScenePath({
      id: "path-road-auto-layer",
      road: {
        enabled: true,
        width: 2,
        shoulderWidth: 0,
        falloff: 0,
        heightOffset: 0,
        terrainConform: false,
        materialId: "ground_sand_300x300"
      },
      points: [
        {
          id: "path-point-road-auto-a",
          position: {
            x: 0,
            y: 0.5,
            z: 1
          }
        },
        {
          id: "path-point-road-auto-b",
          position: {
            x: 2,
            y: 0.5,
            z: 1
          }
        }
      ]
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({
          name: "Path Road Auto Layer Scene"
        }),
        paths: {
          [path.id]: path
        },
        terrains: {
          [terrain.id]: terrain
        }
      }
    });

    store.executeCommand(
      createApplySplineRoadToTerrainCommand({
        pathId: path.id
      })
    );

    const appliedTerrain = store.getState().document.terrains[terrain.id]!;

    expect(appliedTerrain.layers).toEqual([
      {
        materialId: "patchy_grass_ground_250x250"
      },
      {
        materialId: "ground_sand_300x300"
      }
    ]);
    expect(appliedTerrain.paintWeights[4]).toBe(1);

    expect(store.undo()).toBe(true);
    expect(store.getState().document.terrains[terrain.id]).toEqual(terrain);
  });

  it("applies connected spline corridor junction terrain footprints with the road", () => {
    const terrain = createTerrain({
      id: "terrain-road-junction-apply",
      position: { x: 0, y: 0, z: 0 },
      sampleCountX: 7,
      sampleCountZ: 7,
      cellSize: 1,
      heights: new Array(49).fill(0),
      layers: [{ materialId: "base-material" }],
      paintWeights: []
    });
    const pathA = createScenePath({
      id: "path-road-junction-a",
      road: {
        enabled: true,
        width: 1,
        shoulderWidth: 0,
        heightOffset: 0,
        terrainConform: false,
        materialId: "road-material"
      },
      points: [
        {
          id: "path-road-junction-a-start",
          position: { x: 1, y: 2, z: 3 }
        },
        {
          id: "path-road-junction-a-end",
          position: { x: 5, y: 2, z: 3 }
        }
      ]
    });
    const pathB = createScenePath({
      id: "path-road-junction-b",
      road: {
        enabled: true,
        width: 1,
        shoulderWidth: 0,
        heightOffset: 0,
        terrainConform: false,
        materialId: "road-material"
      },
      points: [
        {
          id: "path-road-junction-b-start",
          position: { x: 3, y: 2, z: 1 }
        },
        {
          id: "path-road-junction-b-end",
          position: { x: 3, y: 2, z: 5 }
        }
      ]
    });
    const junction = createSplineCorridorJunction({
      id: "junction-road-apply",
      center: { x: 3, y: 2, z: 3 },
      radius: 1.5,
      materialId: "junction-material",
      terrainMode: "flattenAndPaint",
      connections: [
        { pathId: pathA.id, progress: 0.5, clipDistance: 1.5 },
        { pathId: pathB.id, progress: 0.5, clipDistance: 1.5 }
      ]
    });
    const store = createEditorStore({
      initialDocument: {
        ...createEmptySceneDocument({
          name: "Path Road Junction Apply Scene"
        }),
        paths: {
          [pathA.id]: pathA,
          [pathB.id]: pathB
        },
        splineCorridorJunctions: {
          [junction.id]: junction
        },
        terrains: {
          [terrain.id]: terrain
        }
      }
    });

    store.executeCommand(
      createApplySplineRoadToTerrainCommand({
        pathId: pathA.id
      })
    );

    const appliedTerrain = store.getState().document.terrains[terrain.id]!;
    const centerIndex = 3 + 3 * 7;

    expect(appliedTerrain.layers.map((layer) => layer.materialId)).toContain(
      "junction-material"
    );
    expect(appliedTerrain.heights[centerIndex]).toBe(2);
    expect(appliedTerrain.foliageBlockerMask.values[centerIndex]).toBe(1);

    expect(store.undo()).toBe(true);
    expect(store.getState().document.terrains[terrain.id]).toEqual(terrain);
  });
});
