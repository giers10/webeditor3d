import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
function readPackageManifest() {
    return JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
}
describe("package scripts", () => {
    it("exposes the expected verification script contract", () => {
        const packageManifest = readPackageManifest();
        expect(packageManifest.scripts).toBeDefined();
        expect(packageManifest.scripts?.["test"]).toBeDefined();
        expect(packageManifest.scripts?.["test:browser"]).toBeDefined();
        expect(packageManifest.scripts?.["test:e2e"]).toBeDefined();
        expect(packageManifest.scripts?.["typecheck"]).toBeDefined();
        expect(packageManifest.scripts?.["test:typecheck"]).toBeDefined();
    });
});
