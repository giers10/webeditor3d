export type BundledSplineCorridorAssetCategory =
  | "road_curb_edge"
  | "trail_forest_edge"
  | "river_ditch_bank"
  | "fence_repeater"
  | "debris_scatter";

export interface BundledSplineCorridorAsset {
  id: string;
  filename: string;
  bundledPath: string;
  category: BundledSplineCorridorAssetCategory;
  label: string;
  intendedUse: string;
  dimensions: {
    widthX: number;
    heightY: number;
    lengthZ: number;
  };
}

export const BUNDLED_SPLINE_CORRIDOR_PUBLIC_ROOT =
  "/spline-corridor-assets";

const bundledSplineCorridorAssetDefinitions = [
  ["edge_curb_stone_low_2m", "edge_curb_stone_low_2m.glb", "road_curb_edge", "Stone Curb Low 2m", "Clean low curb strip for road and path borders.", 0.3, 0.187, 2],
  ["edge_curb_stone_worn_2m", "edge_curb_stone_worn_2m.glb", "road_curb_edge", "Stone Curb Worn 2m", "Worn curb strip for older roads and trampled path edges.", 0.331, 0.186, 2],
  ["edge_log_border_2m", "edge_log_border_2m.glb", "road_curb_edge", "Log Border 2m", "Natural log border for roads, trails, and camps.", 0.295, 0.229, 2],
  ["edge_plank_border_2m", "edge_plank_border_2m.glb", "road_curb_edge", "Plank Border 2m", "Rough plank border for rustic trail and garden edges.", 0.24, 0.131, 2],
  ["edge_small_rocks_a_2m", "edge_small_rocks_a_2m.glb", "trail_forest_edge", "Small Rocks A 2m", "Loose small rock border for trail edges.", 0.389, 0.118, 2.067],
  ["edge_small_rocks_b_2m", "edge_small_rocks_b_2m.glb", "trail_forest_edge", "Small Rocks B 2m", "Alternate loose rock border for trail repetition variation.", 0.527, 0.153, 2.107],
  ["edge_roots_border_2m", "edge_roots_border_2m.glb", "trail_forest_edge", "Roots Border 2m", "Exposed root border for forest paths.", 0.474, 0.103, 2.012],
  ["edge_mossy_bank_2m", "edge_mossy_bank_2m.glb", "trail_forest_edge", "Mossy Bank 2m", "Soft mossy raised bank for trail and forest path edges.", 0.66, 0.22, 2],
  ["edge_river_bank_soft_2m", "edge_river_bank_soft_2m.glb", "river_ditch_bank", "River Bank Soft 2m", "Soft river or ditch bank edge.", 0.76, 0.24, 2],
  ["edge_river_bank_rocks_2m", "edge_river_bank_rocks_2m.glb", "river_ditch_bank", "River Bank Rocks 2m", "Rocky river or ditch bank edge.", 0.78, 0.2, 2],
  ["edge_reeds_cluster_a", "edge_reeds_cluster_a.glb", "river_ditch_bank", "Reeds Cluster A", "Small reed cluster for river banks and ditches.", 0.46, 0.943, 0.621],
  ["edge_reeds_cluster_b", "edge_reeds_cluster_b.glb", "river_ditch_bank", "Reeds Cluster B", "Taller reed cluster variation for river banks and ditches.", 0.635, 1.215, 0.505],
  ["fence_post_wood", "fence_post_wood.glb", "fence_repeater", "Wood Fence Post", "Standalone rustic wooden fence post.", 0.18, 1.16, 0.15],
  ["fence_rail_wood_2m", "fence_rail_wood_2m.glb", "fence_repeater", "Wood Fence Rail 2m", "Standalone 2 m rustic rail for fence repeaters.", 0.158, 0.107, 2],
  ["fence_segment_wood_2m", "fence_segment_wood_2m.glb", "fence_repeater", "Wood Fence Segment 2m", "Complete 2 m wooden fence segment.", 0.14, 1.13, 2.04],
  ["fence_segment_rope_2m", "fence_segment_rope_2m.glb", "fence_repeater", "Rope Fence Segment 2m", "Complete 2 m rope fence segment.", 0.136, 1.03, 2.036],
  ["fence_post_stone", "fence_post_stone.glb", "fence_repeater", "Stone Fence Post", "Standalone stacked stone fence post.", 0.258, 0.72, 0.261],
  ["debris_branch_a", "debris_branch_a.glb", "debris_scatter", "Branch A", "Small fallen branch scatter asset.", 0.438, 0.073, 0.846],
  ["debris_branch_b", "debris_branch_b.glb", "debris_scatter", "Branch B", "Curved fallen branch scatter variation.", 0.458, 0.065, 0.682],
  ["debris_pebbles_a", "debris_pebbles_a.glb", "debris_scatter", "Pebbles A", "Small pebble cluster for scatter placement.", 0.495, 0.053, 0.351],
  ["debris_leaf_clump_a", "debris_leaf_clump_a.glb", "debris_scatter", "Leaf Clump A", "Leaf litter clump for forest trail scatter.", 0.578, 0.021, 0.49],
  ["debris_stump_small", "debris_stump_small.glb", "debris_scatter", "Small Stump", "Small stump scatter asset.", 0.473, 0.329, 0.436]
] as const;

export const BUNDLED_SPLINE_CORRIDOR_ASSETS: readonly BundledSplineCorridorAsset[] =
  bundledSplineCorridorAssetDefinitions.map(
    ([
      id,
      filename,
      category,
      label,
      intendedUse,
      widthX,
      heightY,
      lengthZ
    ]) => ({
      id,
      filename,
      bundledPath: `${BUNDLED_SPLINE_CORRIDOR_PUBLIC_ROOT}/${filename}`,
      category,
      label,
      intendedUse,
      dimensions: {
        widthX,
        heightY,
        lengthZ
      }
    })
  );

export const BUNDLED_SPLINE_CORRIDOR_ASSET_REGISTRY: Readonly<
  Record<string, BundledSplineCorridorAsset>
> = Object.fromEntries(
  BUNDLED_SPLINE_CORRIDOR_ASSETS.map((asset) => [asset.id, asset])
);

export function isBundledSplineCorridorAssetId(
  value: string
): value is BundledSplineCorridorAsset["id"] {
  return BUNDLED_SPLINE_CORRIDOR_ASSET_REGISTRY[value] !== undefined;
}
