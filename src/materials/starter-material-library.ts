export type MaterialWorkflow =
  | "roughness-only"
  | "metallic-roughness"
  | "specular-roughness";

export type MaterialPreviewImageName = "preview.webp" | "preview_sphere.webp";

export interface MaterialSizeCm {
  width: number;
  height: number;
}

export interface MaterialDef {
  id: string;
  name: string;
  assetFolder: string;
  workflow: MaterialWorkflow;
  previewImageName: MaterialPreviewImageName;
  sizeCm: MaterialSizeCm;
  swatchColorHex: string;
  tags: string[];
}

interface MaterialCatalogEntry
  extends Omit<MaterialDef, "tags"> {}

const STARTER_MATERIAL_ASSET_ROOT = "/starter-materials";

const STARTER_MATERIAL_CATALOG = [
  {
    id: "starter-amber-grid",
    assetFolder: "stacked_beige_terracotta_tile_250x250",
    name: "Stacked Beige Terracotta Tile",
    workflow: "specular-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#9c8063"
  },
  {
    id: "starter-concrete-checker",
    assetFolder: "poured_concrete_floor_250x250",
    name: "Poured Concrete Floor",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#878681"
  },
  {
    id: "starter-hazard-stripe",
    assetFolder: "worn_galvanized_steel_75x75",
    name: "Worn Galvanized Steel",
    workflow: "roughness-only",
    previewImageName: "preview.webp",
    sizeCm: { width: 75, height: 75 },
    swatchColorHex: "#c5c5c5"
  },
  {
    id: "starter-night-diamond",
    assetFolder: "slate_floor_tile_250x250",
    name: "Slate Floor Tile",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#373634"
  },
  {
    id: "adobe_rammed_earth_plaster_300x300",
    assetFolder: "adobe_rammed_earth_plaster_300x300",
    name: "Adobe Rammed Earth Plaster",
    workflow: "roughness-only",
    previewImageName: "preview.webp",
    sizeCm: { width: 300, height: 300 },
    swatchColorHex: "#d5c4b4"
  },
  {
    id: "ash_wood_floor_250x250",
    assetFolder: "ash_wood_floor_250x250",
    name: "Ash Wood Floor",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#ceb294"
  },
  {
    id: "brushed_steel_250x250",
    assetFolder: "brushed_steel_250x250",
    name: "Brushed Steel",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#b0b2b4"
  },
  {
    id: "clean_city_asphalt_100x100",
    assetFolder: "clean_city_asphalt_100x100",
    name: "Clean City Asphalt",
    workflow: "specular-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 100, height: 100 },
    swatchColorHex: "#515453"
  },
  {
    id: "concrete_wall_cladding_250x250",
    assetFolder: "concrete_wall_cladding_250x250",
    name: "Concrete Wall Cladding",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#807e7c"
  },
  {
    id: "dragfaced_running_brick_250x250",
    assetFolder: "dragfaced_running_brick_250x250",
    name: "Dragfaced Running Brick",
    workflow: "specular-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#b29979"
  },
  {
    id: "dry_blasted_plastic_mold_30x30",
    assetFolder: "dry_blasted_plastic_mold_30x30",
    name: "Dry Blasted Plastic Mold",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 30, height: 30 },
    swatchColorHex: "#444443"
  },
  {
    id: "glazed_ceramic_pottery_30x30",
    assetFolder: "glazed_ceramic_pottery_30x30",
    name: "Glazed Ceramic Pottery",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 30, height: 30 },
    swatchColorHex: "#aaaba7"
  },
  {
    id: "glossy_clay_ceramic_30x30",
    assetFolder: "glossy_clay_ceramic_30x30",
    name: "Glossy Clay Ceramic",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 30, height: 30 },
    swatchColorHex: "#c5c3c1"
  },
  {
    id: "gold_painted_metal_30x30",
    assetFolder: "gold_painted_metal_30x30",
    name: "Gold Painted Metal",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 30, height: 30 },
    swatchColorHex: "#dba24f"
  },
  {
    id: "ground_sand_300x300",
    assetFolder: "ground_sand_300x300",
    name: "Ground Sand",
    workflow: "specular-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 300, height: 300 },
    swatchColorHex: "#c6a582"
  },
  {
    id: "heavily_corroded_metal_100x100",
    assetFolder: "heavily_corroded_metal_100x100",
    name: "Heavily Corroded Metal",
    workflow: "roughness-only",
    previewImageName: "preview.webp",
    sizeCm: { width: 100, height: 100 },
    swatchColorHex: "#7e766f"
  },
  {
    id: "long_thin_running_brick_250x250",
    assetFolder: "long_thin_running_brick_250x250",
    name: "Long Thin Running Brick",
    workflow: "roughness-only",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#928981"
  },
  {
    id: "matte_painted_metal_250x250",
    assetFolder: "matte_painted_metal_250x250",
    name: "Matte Painted Metal",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#2a2a2a"
  },
  {
    id: "mixed_square_pool_tile_200x200",
    assetFolder: "mixed_square_pool_tile_200x200",
    name: "Mixed Square Pool Tile",
    workflow: "specular-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 200, height: 200 },
    swatchColorHex: "#6c97aa"
  },
  {
    id: "oak_wood_veneer_250x250",
    assetFolder: "oak_wood_veneer_250x250",
    name: "Oak Wood Veneer",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#b89578"
  },
  {
    id: "painted_plaster_30x30",
    assetFolder: "painted_plaster_30x30",
    name: "Painted Plaster",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 30, height: 30 },
    swatchColorHex: "#dddddd"
  },
  {
    id: "patchy_grass_ground_250x250",
    assetFolder: "patchy_grass_ground_250x250",
    name: "Patchy Grass Ground",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#565e24"
  },
  {
    id: "patchy_weedy_dirt_ground_300x300",
    assetFolder: "patchy_weedy_dirt_ground_300x300",
    name: "Patchy Weedy Dirt Ground",
    workflow: "specular-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 300, height: 300 },
    swatchColorHex: "#664f3b"
  },
  {
    id: "penny_round_mosaic_tile_50x50",
    assetFolder: "penny_round_mosaic_tile_50x50",
    name: "Penny Round Mosaic Tile",
    workflow: "specular-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 50, height: 50 },
    swatchColorHex: "#d0d1cf"
  },
  {
    id: "polished_terrazzo_tile_250x250",
    assetFolder: "polished_terrazzo_tile_250x250",
    name: "Polished Terrazzo Tile",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#ddd5c4"
  },
  {
    id: "poplar_bark_160x80",
    assetFolder: "poplar_bark_160x80",
    name: "Poplar Bark",
    workflow: "specular-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 160, height: 80 },
    swatchColorHex: "#67635b"
  },
  {
    id: "quartzite_stone_250x250",
    assetFolder: "quartzite_stone_250x250",
    name: "Quartzite Stone",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#b0aba6"
  },
  {
    id: "rammed_earth_300x300",
    assetFolder: "rammed_earth_300x300",
    name: "Rammed Earth",
    workflow: "roughness-only",
    previewImageName: "preview.webp",
    sizeCm: { width: 300, height: 300 },
    swatchColorHex: "#9d654c"
  },
  {
    id: "rattan_weave_30x30",
    assetFolder: "rattan_weave_30x30",
    name: "Rattan Weave",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 30, height: 30 },
    swatchColorHex: "#6f5232"
  },
  {
    id: "reclaimed_brick_wall_250x250",
    assetFolder: "reclaimed_brick_wall_250x250",
    name: "Reclaimed Brick Wall",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#594234"
  },
  {
    id: "reclaimed_running_brick_250x250",
    assetFolder: "reclaimed_running_brick_250x250",
    name: "Reclaimed Running Brick",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#98745e"
  },
  {
    id: "rocky_dirt_ground_300x300",
    assetFolder: "rocky_dirt_ground_300x300",
    name: "Rocky Dirt Ground",
    workflow: "specular-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 300, height: 300 },
    swatchColorHex: "#52402f"
  },
  {
    id: "rusted_metal_30x30",
    assetFolder: "rusted_metal_30x30",
    name: "Rusted Metal",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 30, height: 30 },
    swatchColorHex: "#784f32"
  },
  {
    id: "splitface_stone_bricks_250x250",
    assetFolder: "splitface_stone_bricks_250x250",
    name: "Splitface Stone Bricks",
    workflow: "specular-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#786f65"
  },
  {
    id: "square_concrete_pavers_250x250",
    assetFolder: "square_concrete_pavers_250x250",
    name: "Square Concrete Pavers",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#776f65"
  },
  {
    id: "terrazzo_slab_200x200",
    assetFolder: "terrazzo_slab_200x200",
    name: "Terrazzo Slab",
    workflow: "roughness-only",
    previewImageName: "preview_sphere.webp",
    sizeCm: { width: 200, height: 200 },
    swatchColorHex: "#626161"
  },
  {
    id: "travertine_tile_250x250",
    assetFolder: "travertine_tile_250x250",
    name: "Travertine Tile",
    workflow: "specular-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#a49585"
  },
  {
    id: "weathered_zellige_square_tile_145x145",
    assetFolder: "weathered_zellige_square_tile_145x145",
    name: "Weathered Zellige Square Tile",
    workflow: "specular-roughness",
    previewImageName: "preview_sphere.webp",
    sizeCm: { width: 145, height: 145 },
    swatchColorHex: "#b5b3ae"
  },
  {
    id: "weathered_zellige_square_tile_green_145x145",
    assetFolder: "weathered_zellige_square_tile_green_145x145",
    name: "Weathered Zellige Square Tile Green",
    workflow: "specular-roughness",
    previewImageName: "preview_sphere.webp",
    sizeCm: { width: 145, height: 145 },
    swatchColorHex: "#75807d"
  },
  {
    id: "white_ceramic_tile_250x250",
    assetFolder: "white_ceramic_tile_250x250",
    name: "White Ceramic Tile",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#c4beb8"
  },
  {
    id: "wood_chips_ground_200x200",
    assetFolder: "wood_chips_ground_200x200",
    name: "Wood Chips Ground",
    workflow: "specular-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 200, height: 200 },
    swatchColorHex: "#83684a"
  },
  {
    id: "wood_roof_shingle_250x250",
    assetFolder: "wood_roof_shingle_250x250",
    name: "Wood Roof Shingle",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#48494d"
  },
  {
    id: "worn_bronze_metal_30x30",
    assetFolder: "worn_bronze_metal_30x30",
    name: "Worn Bronze Metal",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 30, height: 30 },
    swatchColorHex: "#5d5543"
  },
  {
    id: "worn_concrete_250x250",
    assetFolder: "worn_concrete_250x250",
    name: "Worn Concrete",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 250, height: 250 },
    swatchColorHex: "#c6c7c1"
  },
  {
    id: "worn_plastic_mold_30x30",
    assetFolder: "worn_plastic_mold_30x30",
    name: "Worn Plastic Mold",
    workflow: "metallic-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 30, height: 30 },
    swatchColorHex: "#a8a8a8"
  },
  {
    id: "yubi_mosaic_tile_50x50",
    assetFolder: "yubi_mosaic_tile_50x50",
    name: "Yubi Mosaic Tile",
    workflow: "specular-roughness",
    previewImageName: "preview.webp",
    sizeCm: { width: 50, height: 50 },
    swatchColorHex: "#cecbc5"
  }
] as const satisfies readonly MaterialCatalogEntry[];

function deriveMaterialCategory(entry: MaterialCatalogEntry): string {
  const name = entry.assetFolder;

  if (
    name.includes("metal") ||
    name.includes("steel") ||
    name.includes("bronze") ||
    name.includes("galvanized")
  ) {
    return "metal";
  }

  if (name.includes("brick")) {
    return "brick";
  }

  if (name.includes("concrete") || name.includes("asphalt")) {
    return "concrete";
  }

  if (
    name.includes("tile") ||
    name.includes("mosaic") ||
    name.includes("terrazzo") ||
    name.includes("travertine") ||
    name.includes("slate") ||
    name.includes("quartzite") ||
    name.includes("zellige")
  ) {
    return "tile";
  }

  if (
    name.includes("wood") ||
    name.includes("bark") ||
    name.includes("rattan") ||
    name.includes("veneer") ||
    name.includes("shingle")
  ) {
    return "wood";
  }

  if (
    name.includes("ground") ||
    name.includes("sand") ||
    name.includes("dirt") ||
    name.includes("grass") ||
    name.includes("chips")
  ) {
    return "ground";
  }

  if (
    name.includes("plaster") ||
    name.includes("earth") ||
    name.includes("clay") ||
    name.includes("ceramic") ||
    name.includes("pottery")
  ) {
    return "plaster";
  }

  return "surface";
}

function createMaterialTags(entry: MaterialCatalogEntry): string[] {
  return [
    deriveMaterialCategory(entry),
    `${entry.sizeCm.width}x${entry.sizeCm.height} cm`,
    entry.workflow === "metallic-roughness"
      ? "metal/rough"
      : entry.workflow === "specular-roughness"
        ? "specular"
        : "roughness"
  ];
}

function cloneMaterialSizeCm(sizeCm: MaterialSizeCm): MaterialSizeCm {
  return {
    width: sizeCm.width,
    height: sizeCm.height
  };
}

export const STARTER_MATERIAL_LIBRARY: readonly MaterialDef[] =
  STARTER_MATERIAL_CATALOG.map((entry) => ({
    ...entry,
    sizeCm: cloneMaterialSizeCm(entry.sizeCm),
    tags: createMaterialTags(entry)
  }));

export function getStarterMaterialAssetDirectory(material: MaterialDef): string {
  return `${STARTER_MATERIAL_ASSET_ROOT}/${material.assetFolder}`;
}

export function getStarterMaterialPreviewUrl(material: MaterialDef): string {
  return `${getStarterMaterialAssetDirectory(material)}/${material.previewImageName}`;
}

export function getStarterMaterialBaseColorUrl(material: MaterialDef): string {
  return `${getStarterMaterialAssetDirectory(material)}/basecolor.webp`;
}

export function getStarterMaterialNormalUrl(material: MaterialDef): string {
  return `${getStarterMaterialAssetDirectory(material)}/normal.webp`;
}

export function getStarterMaterialRoughnessUrl(material: MaterialDef): string {
  return `${getStarterMaterialAssetDirectory(material)}/roughness.webp`;
}

export function getStarterMaterialMetallicUrl(
  material: MaterialDef
): string | null {
  return material.workflow === "metallic-roughness"
    ? `${getStarterMaterialAssetDirectory(material)}/metallic.webp`
    : null;
}

export function getStarterMaterialSpecularUrl(
  material: MaterialDef
): string | null {
  return material.workflow === "specular-roughness"
    ? `${getStarterMaterialAssetDirectory(material)}/specular.webp`
    : null;
}

export function getStarterMaterialTileSizeMeters(material: MaterialDef): {
  x: number;
  y: number;
} {
  return {
    x: material.sizeCm.width / 100,
    y: material.sizeCm.height / 100
  };
}

export function getStarterMaterialTextureRepeat(material: MaterialDef): {
  x: number;
  y: number;
} {
  const tileSizeMeters = getStarterMaterialTileSizeMeters(material);

  return {
    x: 1 / tileSizeMeters.x,
    y: 1 / tileSizeMeters.y
  };
}

export function cloneMaterialDef(material: MaterialDef): MaterialDef {
  return {
    ...material,
    sizeCm: cloneMaterialSizeCm(material.sizeCm),
    tags: [...material.tags]
  };
}

export function cloneMaterialRegistry(
  materials: Record<string, MaterialDef>
): Record<string, MaterialDef> {
  return Object.fromEntries(
    Object.entries(materials).map(([materialId, material]) => [
      materialId,
      cloneMaterialDef(material)
    ])
  );
}

export function createStarterMaterialRegistry(): Record<string, MaterialDef> {
  return Object.fromEntries(
    STARTER_MATERIAL_LIBRARY.map((material) => [
      material.id,
      cloneMaterialDef(material)
    ])
  );
}
