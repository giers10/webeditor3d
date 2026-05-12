import { describe, expect, it } from "vitest";

import {
  applyEditorSelectionClick,
  getSelectionDefaultActiveId,
  resolveSelectionActiveId
} from "../../src/core/selection";

describe("selection click helpers", () => {
  it("toggles same-kind multi-selection membership and keeps the last-added item active", () => {
    const firstSelection = applyEditorSelectionClick(
      {
        kind: "none"
      },
      {
        kind: "brushes",
        ids: ["brush-a"]
      },
      false
    );
    const secondSelection = applyEditorSelectionClick(
      firstSelection,
      {
        kind: "brushes",
        ids: ["brush-b"]
      },
      true
    );

    expect(secondSelection).toEqual({
      kind: "brushes",
      ids: ["brush-a", "brush-b"]
    });
    expect(getSelectionDefaultActiveId(secondSelection)).toBe("brush-b");

    const thirdSelection = applyEditorSelectionClick(
      secondSelection,
      {
        kind: "brushes",
        ids: ["brush-c"]
      },
      true
    );

    expect(thirdSelection).toEqual({
      kind: "brushes",
      ids: ["brush-a", "brush-b", "brush-c"]
    });
    expect(getSelectionDefaultActiveId(thirdSelection)).toBe("brush-c");

    const removedActiveSelection = applyEditorSelectionClick(
      thirdSelection,
      {
        kind: "brushes",
        ids: ["brush-c"]
      },
      true
    );

    expect(removedActiveSelection).toEqual({
      kind: "brushes",
      ids: ["brush-a", "brush-b"]
    });
    expect(resolveSelectionActiveId(removedActiveSelection, null)).toBe(
      "brush-b"
    );
  });

  it("replaces the selection when shift-clicking a different selectable kind", () => {
    const nextSelection = applyEditorSelectionClick(
      {
        kind: "brushes",
        ids: ["brush-a", "brush-b"]
      },
      {
        kind: "entities",
        ids: ["entity-main"]
      },
      true
    );

    expect(nextSelection).toEqual({
      kind: "entities",
      ids: ["entity-main"]
    });
    expect(getSelectionDefaultActiveId(nextSelection)).toBe("entity-main");
  });

  it("multi-selects path points on the same path with shift-click", () => {
    const firstSelection = applyEditorSelectionClick(
      {
        kind: "none"
      },
      {
        kind: "pathPoint",
        pathId: "path-main",
        pointId: "point-a"
      },
      false
    );
    const secondSelection = applyEditorSelectionClick(
      firstSelection,
      {
        kind: "pathPoint",
        pathId: "path-main",
        pointId: "point-b"
      },
      true
    );

    expect(secondSelection).toEqual({
      kind: "pathPoints",
      pathId: "path-main",
      pointIds: ["point-a", "point-b"]
    });
    expect(getSelectionDefaultActiveId(secondSelection)).toBe("point-b");

    const toggledSelection = applyEditorSelectionClick(
      secondSelection,
      {
        kind: "pathPoint",
        pathId: "path-main",
        pointId: "point-b"
      },
      true
    );

    expect(toggledSelection).toEqual({
      kind: "pathPoint",
      pathId: "path-main",
      pointId: "point-a"
    });

    expect(
      applyEditorSelectionClick(
        toggledSelection,
        {
          kind: "pathPoint",
          pathId: "path-other",
          pointId: "point-x"
        },
        true
      )
    ).toEqual({
      kind: "pathPoint",
      pathId: "path-other",
      pointId: "point-x"
    });
  });

  it("clears on empty click without shift and preserves on empty shift-click", () => {
    const currentSelection = {
      kind: "modelInstances" as const,
      ids: ["model-a", "model-b"]
    };

    expect(
      applyEditorSelectionClick(currentSelection, null, false)
    ).toEqual({
      kind: "none"
    });
    expect(applyEditorSelectionClick(currentSelection, null, true)).toEqual(
      currentSelection
    );
  });
});
