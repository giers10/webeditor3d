import { useEffect, useRef, useState } from "react";

import { createSetSceneNameCommand } from "../commands/set-scene-name-command";
import { Panel } from "../shared-ui/Panel";
import { ViewportCanvas } from "../viewport-three/ViewportCanvas";
import type { EditorStore } from "./editor-store";
import { useEditorStoreState } from "./use-editor-store";

interface AppProps {
  store: EditorStore;
}

function describeSelection(selectionKind: string): string {
  switch (selectionKind) {
    case "none":
      return "No authored selection yet";
    case "brushes":
      return "Brush selection placeholder";
    case "entities":
      return "Entity selection placeholder";
    case "modelInstances":
      return "Model instance selection placeholder";
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

export function App({ store }: AppProps) {
  const editorState = useEditorStoreState(store);
  const [sceneNameDraft, setSceneNameDraft] = useState(editorState.document.name);
  const [statusMessage, setStatusMessage] = useState("Viewport shell ready.");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSceneNameDraft(editorState.document.name);
  }, [editorState.document.name]);

  const applySceneName = () => {
    const normalizedName = sceneNameDraft.trim() || "Untitled Scene";

    if (normalizedName === editorState.document.name) {
      setStatusMessage("Scene name is already current.");
      return;
    }

    store.executeCommand(createSetSceneNameCommand(normalizedName));
    setStatusMessage(`Scene renamed to ${normalizedName}.`);
  };

  const handleSaveDraft = () => {
    const didSave = store.saveDraft();
    setStatusMessage(didSave ? "Local draft saved." : "Local draft storage is unavailable.");
  };

  const handleLoadDraft = () => {
    try {
      const didLoad = store.loadDraft();
      setStatusMessage(didLoad ? "Local draft loaded." : "No local draft was found.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
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

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
          <div className="toolbar__subtitle">Milestone 0 foundation slice</div>
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
                <div className="label">Tool Mode</div>
                <div className="value">{editorState.toolMode}</div>
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
                Apply Command
              </button>
            </div>
          </Panel>

          <Panel title="Outliner">
            <ul className="placeholder-list">
              <li>Brushes: {Object.keys(editorState.document.brushes).length}</li>
              <li>Entities: {Object.keys(editorState.document.entities).length}</li>
              <li>Model Instances: {Object.keys(editorState.document.modelInstances).length}</li>
            </ul>
          </Panel>
        </aside>

        <main className="viewport-region">
          <div className="viewport-region__header">
            <div className="viewport-region__title">Viewport</div>
            <div className="viewport-region__caption">Imperative three.js editor surface</div>
          </div>
          <ViewportCanvas world={editorState.document.world} />
        </main>

        <aside className="side-column">
          <Panel title="Inspector">
            <div className="stat-card">
              <div className="label">Selection</div>
              <div className="value">{describeSelection(editorState.selection.kind)}</div>
            </div>
            <ul className="placeholder-list">
              <li>Document is the canonical source of truth.</li>
              <li>Viewport state is derived and disposable.</li>
              <li>Real geometry tools intentionally start in Milestone 1.</li>
            </ul>
          </Panel>

          <Panel title="Runner">
            <ul className="placeholder-list">
              <li>Built-in runner shell reserved for later slices.</li>
              <li>Current focus is versioned documents, persistence, and editor boot flow.</li>
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
