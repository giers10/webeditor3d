let fallbackCounter = 0;
export function createOpaqueId(prefix) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    fallbackCounter += 1;
    return `${prefix}-${Date.now()}-${fallbackCounter}`;
}
