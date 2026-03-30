import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

interface PackageManifest {
  scripts?: Record<string, string>;
}

function readPackageManifest(): PackageManifest {
  return JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as PackageManifest;
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
