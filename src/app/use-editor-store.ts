import { useSyncExternalStore } from "react";

import type { EditorStore, EditorStoreState } from "./editor-store";

export function useEditorStoreState(store: EditorStore): EditorStoreState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
