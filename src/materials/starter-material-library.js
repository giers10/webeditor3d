export const STARTER_MATERIAL_LIBRARY = [
    {
        id: "starter-amber-grid",
        name: "Amber Grid",
        baseColorHex: "#c79a63",
        accentColorHex: "#5f3820",
        pattern: "grid",
        tags: ["starter", "wall"]
    },
    {
        id: "starter-concrete-checker",
        name: "Concrete Checker",
        baseColorHex: "#7d838c",
        accentColorHex: "#5a616a",
        pattern: "checker",
        tags: ["starter", "floor"]
    },
    {
        id: "starter-hazard-stripe",
        name: "Hazard Stripe",
        baseColorHex: "#d1a245",
        accentColorHex: "#211b16",
        pattern: "stripes",
        tags: ["starter", "warning"]
    },
    {
        id: "starter-night-diamond",
        name: "Night Diamond",
        baseColorHex: "#5a6985",
        accentColorHex: "#1f2836",
        pattern: "diamond",
        tags: ["starter", "trim"]
    }
];
export function cloneMaterialDef(material) {
    return {
        ...material,
        tags: [...material.tags]
    };
}
export function cloneMaterialRegistry(materials) {
    return Object.fromEntries(Object.entries(materials).map(([materialId, material]) => [materialId, cloneMaterialDef(material)]));
}
export function createStarterMaterialRegistry() {
    return Object.fromEntries(STARTER_MATERIAL_LIBRARY.map((material) => [material.id, cloneMaterialDef(material)]));
}
