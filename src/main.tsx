import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./app/App";
import "./app/app.css";
import { createEditorStore } from "./app/editor-store";
import { getBrowserStorageAccess, loadOrCreateSceneDocument } from "./serialization/local-draft-storage";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Expected #root element to bootstrap the editor.");
}

const storageAccess = getBrowserStorageAccess();
const bootstrapResult = loadOrCreateSceneDocument(storageAccess.storage);
const editorStore = createEditorStore({
  initialProjectDocument: bootstrapResult.document,
  initialViewportLayoutState: bootstrapResult.viewportLayoutState ?? undefined,
  storage: storageAccess.storage
});
const initialStatusMessage = [storageAccess.diagnostic, bootstrapResult.diagnostic].filter(Boolean).join(" ") || undefined;

if (import.meta.env.DEV) {
  (window as Window & { __webeditor3dEditorStore?: typeof editorStore }).__webeditor3dEditorStore = editorStore;
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App store={editorStore} initialStatusMessage={initialStatusMessage} />
  </React.StrictMode>
);
