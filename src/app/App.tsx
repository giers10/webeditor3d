import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";

import { createCreateBoxBrushCommand } from "../commands/create-box-brush-command";
import { createMoveBoxBrushCommand } from "../commands/move-box-brush-command";
import { createResizeBoxBrushCommand } from "../commands/resize-box-brush-command";
import { getSingleSelectedBrushId, isBrushSelected, type EditorSelection } from "../core/selection";
import type { Vec3 } from "../core/vector";
import { DEFAULT_BOX_BRUSH_CENTER, DEFAULT_BOX_BRUSH_SIZE, type BoxBrush } from "../document/brushes";
import { DEFAULT_GRID_SIZE, snapPositiveSizeToGrid, snapVec3ToGrid } from "../geometry/grid-snapping";
import { Panel } from "../shared-ui/Panel";
import { ViewportCanvas } from "../viewport-three/ViewportCanvas";

import { createSetSceneNameCommand } from "../commands/set-scene-name-command";
import type { EditorStore } from "./editor-store";
import { useEditorStoreState } from "./use-editor-store";

interface AppProps {
  store: EditorStore;
  initialStatusMessage?: string;
}

interface Vec3Draft {
  x: string;
  y: string;
  z: string;
}

function createVec3Draft(vector: Vec3): Vec3Draft {
  return {
    x: String(vector.x),
    y: String(vector.y),
    z: String(vector.z)
  };
}

function readVec3Draft(draft: Vec3Draft, label: string): Vec3 {
  const vector = {
    x: Number(draft.x),
    y: Number(draft.y),
    z: Number(draft.z)
  };

  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z)) {
    throw new Error(`${label} values must be finite numbers.`);
  }

  return vector;
}

function areVec3Equal(left: Vec3, right: Vec3): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function getSelectedBoxBrush(selection: EditorSelection, brushes: BoxBrush[]): BoxBrush | null {
  const selectedBrushId = getSingleSelectedBrushId(selection);

  if (selectedBrushId === null) {
    return null;
  }

  return brushes.find((brush) => brush.id === selectedBrushId) ?? null;
}

function getBrushLabel(index: number): string {
  return `Box Brush ${index + 1}`;
}

function getSelectedBrushLabel(selection: EditorSelection, brushes: BoxBrush[]): string {
  const selectedBrushId = getSingleSelectedBrushId(selection);

  if (selectedBrushId === null) {
    return "No brush selected";
  }

  const brushIndex = brushes.findIndex((brush) => brush.id === selectedBrushId);

  if (brushIndex === -1) {
    return "Selected brush is missing";
  }

  return getBrushLabel(brushIndex);
}

function describeSelection(selection: EditorSelection, brushes: BoxBrush[]): string {
  switch (selection.kind) {
    case "none":
      return "No authored selection";
    case "brushes":
      return `${selection.ids.length} brush selected (${getSelectedBrushLabel(selection, brushes)})`;
    case "entities":
      return `${selection.ids.length} entities selected`;
    case "modelInstances":
      return `${selection.ids.length} model instances selected`;
    default:
      return "Unknown selection";
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export function App({ store, initialStatusMessage }: AppProps) {
  const editorState = useEditorStoreState(store);
  const brushList = Object.values(editorState.document.brushes);
  const selectedBrush = getSelectedBoxBrush(editorState.selection, brushList);

  const [sceneNameDraft, setSceneNameDraft] = useState(editorState.document.name);
  const [positionDraft, setPositionDraft] = useState(createVec3Draft(DEFAULT_BOX_BRUSH_CENTER));
  const [sizeDraft, setSizeDraft] = useState(createVec3Draft(DEFAULT_BOX_BRUSH_SIZE));
  const [statusMessage, setStatusMessage] = useState(initialStatusMessage ?? "Box brush authoring ready.");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSceneNameDraft(editorState.document.name);
  }, [editorState.document.name]);

  useEffect(() => {
    if (selectedBrush === null) {
      setPositionDraft(createVec3Draft(DEFAULT_BOX_BRUSH_CENTER));
      setSizeDraft(createVec3Draft(DEFAULT_BOX_BRUSH_SIZE));
      return;
    }

    setPositionDraft(createVec3Draft(selectedBrush.center));
    setSizeDraft(createVec3Draft(selectedBrush.size));
  }, [
    selectedBrush?.id,
    selectedBrush?.center.x,
    selectedBrush?.center.y,
    selectedBrush?.center.z,
    selectedBrush?.size.x,
    selectedBrush?.size.y,
    selectedBrush?.size.z
  ]);

  const applySceneName = () => {
    const normalizedName = sceneNameDraft.trim() || "Untitled Scene";

    if (normalizedName === editorState.document.name) {
      setStatusMessage("Scene name is already current.");
      return;
    }

    store.executeCommand(createSetSceneNameCommand(normalizedName));
    setStatusMessage(`Scene renamed to ${normalizedName}.`);
  };

  const handleCreateBoxBrush = () => {
    try {
      store.executeCommand(createCreateBoxBrushCommand());
      setStatusMessage(`Created a box brush snapped to the ${DEFAULT_GRID_SIZE}m grid.`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const handleBrushSelection = (brushId: string | null, source: "outliner" | "viewport") => {
    if (brushId === null) {
      store.setSelection({
        kind: "none"
      });
      setStatusMessage(`${source === "viewport" ? "Viewport" : "Outliner"} selection cleared.`);
      return;
    }

    const brushIndex = brushList.findIndex((brush) => brush.id === brushId);

    store.setSelection({
      kind: "brushes",
      ids: [brushId]
    });

    const brushLabel = brushIndex === -1 ? "Box Brush" : getBrushLabel(brushIndex);
    setStatusMessage(`Selected ${brushLabel} from the ${source}.`);
  };

  const applyPositionChange = () => {
    if (selectedBrush === null) {
      setStatusMessage("Select a box brush before moving it.");
      return;
    }

    try {
      const snappedCenter = snapVec3ToGrid(readVec3Draft(positionDraft, "Box brush position"), DEFAULT_GRID_SIZE);

      if (areVec3Equal(snappedCenter, selectedBrush.center)) {
        setStatusMessage("Box brush position is already snapped to that grid location.");
        return;
      }

      store.executeCommand(
        createMoveBoxBrushCommand({
          brushId: selectedBrush.id,
          center: snappedCenter
        })
      );
      setStatusMessage("Moved selected box brush.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const applySizeChange = () => {
    if (selectedBrush === null) {
      setStatusMessage("Select a box brush before resizing it.");
      return;
    }

    try {
      const snappedSize = snapPositiveSizeToGrid(readVec3Draft(sizeDraft, "Box brush size"), DEFAULT_GRID_SIZE);

      if (areVec3Equal(snappedSize, selectedBrush.size)) {
        setStatusMessage("Box brush size is already snapped to those dimensions.");
        return;
      }

      store.executeCommand(
        createResizeBoxBrushCommand({
          brushId: selectedBrush.id,
          size: snappedSize
        })
      );
      setStatusMessage("Resized selected box brush.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  };

  const handleDraftVectorKeyDown = (event: KeyboardEvent<HTMLInputElement>, applyChange: () => void) => {
    if (event.key === "Enter") {
      applyChange();
    }
  };

  const handleSaveDraft = () => {
    const result = store.saveDraft();
    setStatusMessage(result.message);
  };

  const handleLoadDraft = () => {
    const result = store.loadDraft();
    setStatusMessage(result.message);
  };

  const handleExportJson = () => {
    const exportedJson = store.exportDocumentJson();
    const blob = new Blob([exportedJson], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = `${editorState.document.name.replace(/\s+/g, "-").toLowerCase() || "scene"}.json`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);

    setStatusMessage("Scene document exported as JSON.");
  };

  const handleImportButtonClick = () => {
    importInputRef.current?.click();
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];

    if (file === undefined) {
      return;
    }

    try {
      const source = await file.text();
      store.importDocumentJson(source);
      setStatusMessage(`Imported ${file.name}.`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      event.currentTarget.value = "";
    }
  };

  return (
    <div className="app-shell">
      <header className="toolbar">
        <div className="toolbar__brand">
          <div className="toolbar__title">WebEditor3D</div>
          <div className="toolbar__subtitle">Slice 1.1 box brush authoring</div>
        </div>

        <div className="toolbar__actions">
          <div className="toolbar__group">
            <button
              className={`toolbar__button ${editorState.toolMode === "select" ? "toolbar__button--active" : ""}`}
              type="button"
              onClick={() => store.setToolMode("select")}
            >
              Select
            </button>
            <button
              className={`toolbar__button ${editorState.toolMode === "box-create" ? "toolbar__button--active" : ""}`}
              type="button"
              onClick={() => store.setToolMode("box-create")}
            >
              Box
            </button>
            <button
              className={`toolbar__button ${editorState.toolMode === "play" ? "toolbar__button--active" : ""}`}
              type="button"
              onClick={() => store.setToolMode("play")}
            >
              Play
            </button>
            <button className="toolbar__button toolbar__button--accent" type="button" data-testid="create-box-brush" onClick={handleCreateBoxBrush}>
              Create Box Brush
            </button>
          </div>

          <div className="toolbar__group">
            <button className="toolbar__button" type="button" onClick={handleSaveDraft}>
              Save Draft
            </button>
            <button className="toolbar__button" type="button" onClick={handleLoadDraft}>
              Load Draft
            </button>
            <button className="toolbar__button" type="button" onClick={handleExportJson}>
              Export JSON
            </button>
            <button className="toolbar__button" type="button" onClick={handleImportButtonClick}>
              Import JSON
            </button>
          </div>

          <div className="toolbar__group">
            <button className="toolbar__button" type="button" disabled={!editorState.canUndo} onClick={() => store.undo()}>
              Undo
            </button>
            <button className="toolbar__button" type="button" disabled={!editorState.canRedo} onClick={() => store.redo()}>
              Redo
            </button>
          </div>
        </div>
      </header>

      <div className="workspace">
        <aside className="side-column">
          <Panel title="Document">
            <div className="stat-grid">
              <div className="stat-card">
                <div className="label">Version</div>
                <div className="value">v{editorState.document.version}</div>
              </div>
              <div className="stat-card">
                <div className="label">Grid</div>
                <div className="value">{DEFAULT_GRID_SIZE}m snap</div>
              </div>
              <div className="stat-card">
                <div className="label">Tool Mode</div>
                <div className="value">{editorState.toolMode}</div>
              </div>
              <div className="stat-card">
                <div className="label">Brushes</div>
                <div className="value">{brushList.length}</div>
              </div>
            </div>

            <label className="form-field">
              <span className="label">Scene Name</span>
              <input
                className="text-input"
                type="text"
                value={sceneNameDraft}
                onChange={(event) => setSceneNameDraft(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applySceneName();
                  }
                }}
              />
            </label>

            <div className="inline-actions">
              <button className="toolbar__button toolbar__button--accent" type="button" onClick={applySceneName}>
                Apply Scene Name Command
              </button>
            </div>

            <ul className="placeholder-list">
              <li>Box brushes are stored canonically as structured brush data.</li>
              <li>Move and resize use command history and 1 meter grid snapping.</li>
            </ul>
          </Panel>

          <Panel title="Outliner">
            {brushList.length === 0 ? (
              <ul className="placeholder-list">
                <li>No authored brushes yet. Use Create Box Brush to place the first brush.</li>
              </ul>
            ) : (
              <div className="outliner-list" data-testid="outliner-brush-list">
                {brushList.map((brush, brushIndex) => (
                  <button
                    key={brush.id}
                    className={`outliner-item ${isBrushSelected(editorState.selection, brush.id) ? "outliner-item--selected" : ""}`}
                    type="button"
                    onClick={() => handleBrushSelection(brush.id, "outliner")}
                  >
                    <span className="outliner-item__title">{getBrushLabel(brushIndex)}</span>
                    <span className="outliner-item__meta">
                      center {brush.center.x}, {brush.center.y}, {brush.center.z}
                    </span>
                    <span className="outliner-item__meta">
                      size {brush.size.x}, {brush.size.y}, {brush.size.z}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Panel>
        </aside>

        <main className="viewport-region">
          <div className="viewport-region__header">
            <div className="viewport-region__title">Viewport</div>
            <div className="viewport-region__caption">
              {brushList.length} box brushes loaded. Click a brush in the viewport or outliner to select it.
            </div>
          </div>
          <ViewportCanvas
            world={editorState.document.world}
            sceneDocument={editorState.document}
            selection={editorState.selection}
            onBrushSelectionChange={(brushId) => handleBrushSelection(brushId, "viewport")}
          />
        </main>

        <aside className="side-column">
          <Panel title="Inspector">
            <div className="stat-card">
              <div className="label">Selection</div>
              <div className="value">{describeSelection(editorState.selection, brushList)}</div>
            </div>

            {selectedBrush === null ? (
              <ul className="placeholder-list">
                <li>Select a box brush to edit its center and size.</li>
                <li>All transforms in this slice stay axis-aligned and snapped to the grid.</li>
              </ul>
            ) : (
              <>
                <div className="stat-card">
                  <div className="label">Brush Kind</div>
                  <div className="value">box</div>
                </div>

                <div className="form-section">
                  <div className="label">Center</div>
                  <div className="vector-inputs">
                    <label className="form-field">
                      <span className="label">X</span>
                      <input
                        className="text-input"
                        type="number"
                        step={DEFAULT_GRID_SIZE}
                        value={positionDraft.x}
                        onChange={(event) => setPositionDraft((draft) => ({ ...draft, x: event.currentTarget.value }))}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPositionChange)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Y</span>
                      <input
                        className="text-input"
                        type="number"
                        step={DEFAULT_GRID_SIZE}
                        value={positionDraft.y}
                        onChange={(event) => setPositionDraft((draft) => ({ ...draft, y: event.currentTarget.value }))}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPositionChange)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Z</span>
                      <input
                        className="text-input"
                        type="number"
                        step={DEFAULT_GRID_SIZE}
                        value={positionDraft.z}
                        onChange={(event) => setPositionDraft((draft) => ({ ...draft, z: event.currentTarget.value }))}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applyPositionChange)}
                      />
                    </label>
                  </div>
                  <button className="toolbar__button" type="button" data-testid="apply-brush-position" onClick={applyPositionChange}>
                    Apply Move Command
                  </button>
                </div>

                <div className="form-section">
                  <div className="label">Size</div>
                  <div className="vector-inputs">
                    <label className="form-field">
                      <span className="label">X</span>
                      <input
                        className="text-input"
                        type="number"
                        min={DEFAULT_GRID_SIZE}
                        step={DEFAULT_GRID_SIZE}
                        value={sizeDraft.x}
                        onChange={(event) => setSizeDraft((draft) => ({ ...draft, x: event.currentTarget.value }))}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applySizeChange)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Y</span>
                      <input
                        className="text-input"
                        type="number"
                        min={DEFAULT_GRID_SIZE}
                        step={DEFAULT_GRID_SIZE}
                        value={sizeDraft.y}
                        onChange={(event) => setSizeDraft((draft) => ({ ...draft, y: event.currentTarget.value }))}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applySizeChange)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="label">Z</span>
                      <input
                        className="text-input"
                        type="number"
                        min={DEFAULT_GRID_SIZE}
                        step={DEFAULT_GRID_SIZE}
                        value={sizeDraft.z}
                        onChange={(event) => setSizeDraft((draft) => ({ ...draft, z: event.currentTarget.value }))}
                        onKeyDown={(event) => handleDraftVectorKeyDown(event, applySizeChange)}
                      />
                    </label>
                  </div>
                  <button className="toolbar__button" type="button" data-testid="apply-brush-size" onClick={applySizeChange}>
                    Apply Resize Command
                  </button>
                </div>

                <ul className="placeholder-list">
                  <li>Stable face ids: posX, negX, posY, negY, posZ, negZ.</li>
                  <li>Face materials and UV editing remain out of scope for Slice 1.2.</li>
                </ul>
              </>
            )}
          </Panel>

          <Panel title="Runner">
            <ul className="placeholder-list">
              <li>Built-in runner authoring is still pending.</li>
              <li>This slice establishes canonical brush data and edit persistence first.</li>
            </ul>
          </Panel>
        </aside>
      </div>

      <footer className="status-bar">
        <div>
          <span className="status-bar__strong">Status:</span> {statusMessage}
        </div>
        <div>
          <span className="status-bar__strong">History:</span> {editorState.lastCommandLabel ?? "No commands yet"}
        </div>
      </footer>

      <input
        ref={importInputRef}
        className="visually-hidden"
        type="file"
        accept=".json,application/json"
        onChange={handleImportChange}
      />
    </div>
  );
}
