export function createWorldBackgroundStyle(background, imageUrl = null) {
    if (background.mode === "solid") {
        return {
            backgroundColor: background.colorHex,
            backgroundImage: "none"
        };
    }
    if (background.mode === "image") {
        return {
            backgroundColor: "#0d1116",
            backgroundImage: imageUrl === null ? "none" : `url("${imageUrl}")`,
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover"
        };
    }
    return {
        backgroundColor: background.bottomColorHex,
        backgroundImage: `linear-gradient(180deg, ${background.topColorHex} 0%, ${background.bottomColorHex} 100%)`
    };
}
