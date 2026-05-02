import { describe, expect, it } from "vitest";

import {
  EXPECTED_BUNDLED_FOLIAGE_PROTOTYPE_COUNT,
  groupBundledFoliageFiles,
  validateBundledFoliageManifest
} from "../../src/foliage/bundled-foliage";
import {
  BUNDLED_FOLIAGE_PROTOTYPES,
  BUNDLED_FOLIAGE_RELATIVE_PATHS
} from "../../src/foliage/bundled-foliage-manifest";

describe("bundled foliage manifest", () => {
  it("groups the copied 160 GLBs into 40 complete prototype LOD chains", () => {
    const grouping = groupBundledFoliageFiles(
      BUNDLED_FOLIAGE_RELATIVE_PATHS
    );

    expect(BUNDLED_FOLIAGE_RELATIVE_PATHS).toHaveLength(160);
    expect(grouping.diagnostics).toEqual([]);
    expect(grouping.groups).toHaveLength(
      EXPECTED_BUNDLED_FOLIAGE_PROTOTYPE_COUNT
    );
    expect(
      grouping.groups.every(
        (group) =>
          group.lods.map((lod) => lod.level).join(",") === "0,1,2,3"
      )
    ).toBe(true);
  });

  it("exposes a complete engine manifest with bundled LOD paths", () => {
    expect(validateBundledFoliageManifest(BUNDLED_FOLIAGE_PROTOTYPES)).toEqual(
      []
    );
    expect(BUNDLED_FOLIAGE_PROTOTYPES).toHaveLength(40);
    expect(
      BUNDLED_FOLIAGE_PROTOTYPES.every((prototype) =>
        prototype.lods.every(
          (lod) =>
            lod.source === "bundled" &&
            lod.bundledPath.startsWith("/foliage/") &&
            lod.bundledPath.endsWith(`_LOD${lod.level}.glb`)
        )
      )
    ).toBe(true);
  });

  it("reports duplicate, missing, and invalid filename groups", () => {
    const grouping = groupBundledFoliageFiles([
      "Grass/Foo/Foo_LOD0.glb",
      "Other/Foo/Foo_LOD0.glb",
      "Grass/Foo/Foo_LOD4.glb",
      "Grass/Foo/Foo_low.glb"
    ]);

    expect(grouping.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duplicate-foliage-lod" }),
        expect.objectContaining({ code: "invalid-foliage-lod-level" }),
        expect.objectContaining({ code: "invalid-foliage-filename" }),
        expect.objectContaining({ code: "missing-foliage-lod", level: 1 }),
        expect.objectContaining({ code: "missing-foliage-lod", level: 2 }),
        expect.objectContaining({ code: "missing-foliage-lod", level: 3 })
      ])
    );
  });
});
