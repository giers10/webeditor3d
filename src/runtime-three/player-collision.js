export const FIRST_PERSON_PLAYER_SHAPE = {
    mode: "capsule",
    radius: 0.3,
    height: 1.8,
    eyeHeight: 1.6
};
export function getFirstPersonPlayerEyeHeight(shape) {
    return shape.eyeHeight;
}
export function getFirstPersonPlayerHeight(shape) {
    switch (shape.mode) {
        case "capsule":
            return shape.height;
        case "box":
            return shape.size.y;
        case "none":
            return null;
    }
}
