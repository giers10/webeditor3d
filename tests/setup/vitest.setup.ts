import "@testing-library/jest-dom/vitest";

if (typeof globalThis.ProgressEvent === "undefined") {
  class TestProgressEvent extends Event implements ProgressEvent {
    readonly lengthComputable: boolean;
    readonly loaded: number;
    readonly total: number;

    constructor(type: string, eventInitDict: ProgressEventInit = {}) {
      super(type, eventInitDict);
      this.lengthComputable = eventInitDict.lengthComputable ?? false;
      this.loaded = eventInitDict.loaded ?? 0;
      this.total = eventInitDict.total ?? 0;
    }
  }

  Object.defineProperty(globalThis, "ProgressEvent", {
    configurable: true,
    writable: true,
    value: TestProgressEvent
  });
}
