import { useSyncExternalStore } from "react";
export function useEditorStoreState(store) {
    return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
