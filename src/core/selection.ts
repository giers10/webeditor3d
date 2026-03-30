export type EditorSelection =
  | { kind: "none" }
  | { kind: "brushes"; ids: string[] }
  | { kind: "entities"; ids: string[] }
  | { kind: "modelInstances"; ids: string[] };
