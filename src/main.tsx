import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./app/App";
import "./app/app.css";
import { createEditorStore } from "./app/editor-store";
import {
  createBrowserEditorDraftStorage,
  loadOrCreateEditorDraft
} from "./serialization/editor-draft-storage";
import { getBrowserStorageAccess } from "./serialization/local-draft-storage";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Expected #root element to bootstrap the editor.");
}

async function bootstrapEditor() {
  const storageAccess = getBrowserStorageAccess();
  const draftStorageAccess = await createBrowserEditorDraftStorage({
    legacyStorage: storageAccess.storage
  });
  const bootstrapResult = await loadOrCreateEditorDraft(
    draftStorageAccess.storage
  );
  const editorStore = createEditorStore({
    initialProjectDocument: bootstrapResult.document,
    initialViewportLayoutState: bootstrapResult.viewportLayoutState ?? undefined,
    storage: storageAccess.storage
  });
  const initialStatusMessage =
    [
      storageAccess.diagnostic,
      draftStorageAccess.diagnostic,
      bootstrapResult.diagnostic
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  if (import.meta.env.DEV) {
    (
      window as Window & { __webeditor3dEditorStore?: typeof editorStore }
    ).__webeditor3dEditorStore = editorStore;
  }

  ReactDOM.createRoot(rootElement!).render(
    <React.StrictMode>
      <App
        store={editorStore}
        draftStorage={draftStorageAccess.storage}
        initialStatusMessage={initialStatusMessage}
      />
    </React.StrictMode>
  );
}

void bootstrapEditor().catch((error) => {
  throw error;
});
