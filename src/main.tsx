import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./app/App";
import "./app/app.css";
import { createEditorStore } from "./app/editor-store";
import { getBrowserStorage, loadOrCreateSceneDocument } from "./serialization/local-draft-storage";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Expected #root element to bootstrap the editor.");
}

const storage = getBrowserStorage();
const editorStore = createEditorStore({
  initialDocument: loadOrCreateSceneDocument(storage),
  storage
});

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App store={editorStore} />
  </React.StrictMode>
);
