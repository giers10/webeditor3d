import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
export function createStarterMaterialSignature(material) {
    return `${material.baseColorHex}|${material.accentColorHex}|${material.pattern}`;
}
function fillMaterialPattern(context, material, size) {
    context.fillStyle = material.baseColorHex;
    context.fillRect(0, 0, size, size);
    context.strokeStyle = material.accentColorHex;
    context.fillStyle = material.accentColorHex;
    switch (material.pattern) {
        case "grid":
            context.lineWidth = Math.max(2, size / 32);
            for (let offset = 0; offset <= size; offset += size / 4) {
                context.beginPath();
                context.moveTo(offset, 0);
                context.lineTo(offset, size);
                context.stroke();
                context.beginPath();
                context.moveTo(0, offset);
                context.lineTo(size, offset);
                context.stroke();
            }
            break;
        case "checker": {
            const checkerSize = size / 4;
            for (let row = 0; row < 4; row += 1) {
                for (let column = 0; column < 4; column += 1) {
                    if ((row + column) % 2 === 0) {
                        context.fillRect(column * checkerSize, row * checkerSize, checkerSize, checkerSize);
                    }
                }
            }
            break;
        }
        case "stripes":
            context.lineWidth = size / 6;
            for (let offset = -size; offset <= size * 2; offset += size / 3) {
                context.beginPath();
                context.moveTo(offset, size);
                context.lineTo(offset + size, 0);
                context.stroke();
            }
            break;
        case "diamond":
            context.lineWidth = Math.max(2, size / 28);
            for (let offset = -size; offset <= size; offset += size / 3) {
                context.beginPath();
                context.moveTo(size * 0.5, offset);
                context.lineTo(size - offset, size * 0.5);
                context.lineTo(size * 0.5, size - offset);
                context.lineTo(-offset, size * 0.5);
                context.closePath();
                context.stroke();
            }
            break;
    }
}
export function createStarterMaterialTexture(material, size = 128) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (context === null) {
        throw new Error("2D canvas context is unavailable for starter material texture generation.");
    }
    fillMaterialPattern(context, material, size);
    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
}
