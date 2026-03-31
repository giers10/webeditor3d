# Design Document: Animation Playback

## Overview

This slice adds animation playback for imported GLB/GLTF model assets. The feature is deliberately narrow: detect available clips from existing metadata, add optional per-instance configuration fields, wire `playAnimation` and `stopAnimation` into the existing Trigger → Action → Target interaction system, drive playback in the runtime via three.js `AnimationMixer`, and persist everything through a schema version bump with migration.

No timeline editor, no blend trees, no cross-fade authoring. The goal is a minimal, explicit, correct first pass that fits cleanly into the existing architecture.

## Architecture

The change touches five layers, each with a clear responsibility:

```
Document layer        ModelInstance gains animationClipName + animationAutoplay
                      InteractionAction gains PlayAnimationAction + StopAnimationAction

Interaction layer     interaction-links.ts gains two new factory functions and updated clone/equality

Runtime build layer   RuntimeModelInstance gains animationClipName + animationAutoplay
                      buildRuntimeSceneFromDocument propagates the new fields

Runtime host layer    RuntimeHost gains AnimationMixer map, per-frame update, play/stop dispatch

Serialization layer   migrateSceneDocument bumps version to 12, reads new fields, migrates v11
```

The editor viewport does **not** play animations — only the runner does. The editor shows the model in its bind pose, consistent with the existing approach of keeping the viewport simple.

## Components and Interfaces

### 1. `ModelInstance` (src/assets/model-instances.ts)

Add two optional fields:

```typescript
export interface ModelInstance {
  id: string;
  kind: "modelInstance";
  assetId: string;
  name?: string;
  position: Vec3;
  rotationDegrees: Vec3;
  scale: Vec3;
  animationClipName?: string;   // NEW: name of the default clip to play
  animationAutoplay?: boolean;  // NEW: whether to start playing on scene load
}
```

Update `createModelInstance`, `cloneModelInstance`, and `areModelInstancesEqual` to handle the new fields. The factory accepts them as optional overrides; `cloneModelInstance` copies them; `areModelInstancesEqual` includes them in the comparison.

### 2. `InteractionAction` (src/interactions/interaction-links.ts)

Add two new action types to the discriminated union:

```typescript
export interface PlayAnimationAction {
  type: "playAnimation";
  targetModelInstanceId: string;
  clipName: string;
}

export interface StopAnimationAction {
  type: "stopAnimation";
  targetModelInstanceId: string;
}

export type InteractionAction =
  | TeleportPlayerAction
  | ToggleVisibilityAction
  | PlayAnimationAction
  | StopAnimationAction;
```

Add factory functions:

```typescript
export function createPlayAnimationInteractionLink(options: {
  id?: string;
  sourceEntityId: string;
  trigger?: InteractionTriggerKind;
  targetModelInstanceId: string;
  clipName: string;
}): InteractionLink

export function createStopAnimationInteractionLink(options: {
  id?: string;
  sourceEntityId: string;
  trigger?: InteractionTriggerKind;
  targetModelInstanceId: string;
}): InteractionLink
```

Update `cloneAction`, `areInteractionLinksEqual`, and `cloneInteractionLink` to handle the new action types.

### 3. `RuntimeModelInstance` (src/runtime-three/runtime-scene-build.ts)

Add the animation fields to the runtime data type:

```typescript
export interface RuntimeModelInstance {
  instanceId: string;
  assetId: string;
  name?: string;
  position: Vec3;
  rotationDegrees: Vec3;
  scale: Vec3;
  animationClipName?: string;   // NEW
  animationAutoplay?: boolean;  // NEW
}
```

Update `buildRuntimeModelInstance` to propagate the new fields from the document model instance.

### 4. `RuntimeInteractionDispatcher` (src/runtime-three/runtime-interaction-system.ts)

Extend the dispatcher interface:

```typescript
export interface RuntimeInteractionDispatcher {
  teleportPlayer(target: RuntimeTeleportTarget, link: InteractionLink): void;
  toggleBrushVisibility(brushId: string, visible: boolean | undefined, link: InteractionLink): void;
  playAnimation(instanceId: string, clipName: string, link: InteractionLink): void;  // NEW
  stopAnimation(instanceId: string, link: InteractionLink): void;                    // NEW
}
```

Update `RuntimeInteractionSystem.dispatchLinks` to handle the two new action types by calling the dispatcher methods.

### 5. `RuntimeHost` (src/runtime-three/runtime-host.ts)

This is where the three.js `AnimationMixer` lifecycle lives.

**New private state:**

```typescript
private readonly animationMixers = new Map<string, AnimationMixer>();
// instanceId -> { mixer, clips[] } for looking up clips by name at dispatch time
private readonly instanceAnimationClips = new Map<string, AnimationClip[]>();
```

**`rebuildModelInstances` changes:**

After creating the render group for each model instance, check whether the loaded GLTF asset has animations. If it does, create an `AnimationMixer` targeting the render group and store it. If `animationAutoplay` is `true` and `animationClipName` is set, find the clip by name and call `mixer.clipAction(clip).play()`.

```typescript
// Pseudocode for the new section inside rebuildModelInstances:
const gltf = this.loadedGltfAssets[modelInstance.assetId]; // see note below
if (gltf && gltf.animations.length > 0) {
  const mixer = new AnimationMixer(renderGroup);
  this.animationMixers.set(modelInstance.instanceId, mixer);
  this.instanceAnimationClips.set(modelInstance.instanceId, gltf.animations);

  if (modelInstance.animationAutoplay && modelInstance.animationClipName) {
    const clip = AnimationClip.findByName(gltf.animations, modelInstance.animationClipName);
    if (clip) {
      mixer.clipAction(clip).play();
    }
  }
}
```

**Note on animation clip access:** The `LoadedModelAsset` currently stores only the `template: Group` (the cloned scene). The raw `AnimationClip[]` array from the GLTF parse result is not currently retained. We need to store the clips alongside the template. The `LoadedModelAsset` interface gains an `animations: AnimationClip[]` field:

```typescript
export interface LoadedModelAsset {
  assetId: string;
  storageKey: string;
  metadata: ModelAssetMetadata;
  template: Group;
  animations: AnimationClip[];  // NEW: raw clips from the GLTF parse result
}
```

`createLoadedModelAsset` and `extractModelAssetMetadata` callers in `gltf-model-import.ts` are updated to populate this field from `gltf.animations`.

**`clearModelInstances` changes:**

Stop and dispose all mixers before clearing the render objects:

```typescript
for (const mixer of this.animationMixers.values()) {
  mixer.stopAllAction();
}
this.animationMixers.clear();
this.instanceAnimationClips.clear();
```

**`render` loop changes:**

After `this.activeController?.update(dt)`, tick all active mixers:

```typescript
for (const mixer of this.animationMixers.values()) {
  mixer.update(dt);
}
```

**New private methods:**

```typescript
private applyPlayAnimationAction(instanceId: string, clipName: string): void {
  const mixer = this.animationMixers.get(instanceId);
  const clips = this.instanceAnimationClips.get(instanceId);
  if (!mixer || !clips) {
    console.warn(`playAnimation: no mixer for instance ${instanceId}`);
    return;
  }
  const clip = AnimationClip.findByName(clips, clipName);
  if (!clip) {
    console.warn(`playAnimation: clip "${clipName}" not found on instance ${instanceId}`);
    return;
  }
  mixer.stopAllAction();
  mixer.clipAction(clip).play();
}

private applyStopAnimationAction(instanceId: string): void {
  const mixer = this.animationMixers.get(instanceId);
  if (!mixer) {
    console.warn(`stopAnimation: no mixer for instance ${instanceId}`);
    return;
  }
  mixer.stopAllAction();
}
```

**`createInteractionDispatcher` changes:**

Add the two new methods to the returned dispatcher object.

### 6. `migrateSceneDocument` (src/document/migrate-scene-document.ts)

- Bump `SCENE_DOCUMENT_VERSION` to `12` in `scene-document.ts`.
- Add a `ANIMATION_PLAYBACK_SCENE_DOCUMENT_VERSION = 12` constant.
- In `readModelInstance`, read `animationClipName` and `animationAutoplay` as optional fields:
  - `animationClipName`: `expectOptionalString` then normalize (trim, empty → undefined)
  - `animationAutoplay`: optional boolean, default `undefined`
- In `readInteractionAction`, add cases for `"playAnimation"` and `"stopAnimation"`.
- Add a migration branch for `source.version === LOCAL_LIGHTS_AND_SKYBOX_SCENE_DOCUMENT_VERSION` (v11) that reads the existing fields and produces a v12 document with `animationClipName: undefined` and `animationAutoplay: undefined` on all model instances, and no animation interaction links.

### 7. Inspector UI (src/app/App.tsx)

In the model instance inspector section (where position/rotation/scale are shown), add an animation sub-section that is conditionally rendered when `selectedModelAssetRecord?.metadata.animationNames.length > 0`:

```tsx
{selectedModelAssetRecord && selectedModelAssetRecord.metadata.animationNames.length > 0 && (
  <div className="inspector-section">
    <label>Animation Clip</label>
    <select
      value={selectedModelInstance.animationClipName ?? ""}
      onChange={(e) => {
        const clipName = e.target.value || undefined;
        store.dispatch(createUpsertModelInstanceCommand({
          modelInstance: { ...selectedModelInstance, animationClipName: clipName }
        }));
      }}
    >
      <option value="">— none —</option>
      {selectedModelAssetRecord.metadata.animationNames.map((name) => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
    <label>
      <input
        type="checkbox"
        checked={selectedModelInstance.animationAutoplay ?? false}
        onChange={(e) => {
          store.dispatch(createUpsertModelInstanceCommand({
            modelInstance: { ...selectedModelInstance, animationAutoplay: e.target.checked }
          }));
        }}
      />
      Autoplay on scene load
    </label>
  </div>
)}
```

### 8. Interaction Link UI (src/app/App.tsx)

In the interaction link authoring section, extend the action type `<select>` to include `"playAnimation"` and `"stopAnimation"`. When either is selected, show a model instance picker (using `modelInstanceDisplayList`). For `playAnimation`, also show a clip name input (a `<select>` populated from the chosen model instance's asset's `animationNames`, or a text input if the asset is not loaded).

The existing `getInteractionActionLabel` helper is extended to return human-readable labels for the new action types.

## Data Models

### Document-level changes

```typescript
// ModelInstance gains:
animationClipName?: string;
animationAutoplay?: boolean;

// InteractionAction gains two new members:
| { type: "playAnimation"; targetModelInstanceId: string; clipName: string }
| { type: "stopAnimation"; targetModelInstanceId: string }
```

### Runtime-level changes

```typescript
// RuntimeModelInstance gains:
animationClipName?: string;
animationAutoplay?: boolean;

// LoadedModelAsset gains:
animations: AnimationClip[];
```

### Schema version

`SCENE_DOCUMENT_VERSION` advances from `11` to `12`.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Animation names are sorted and deduplicated

*For any* set of animation clip names extracted from a GLTF file, `collectAnimationNames` should return an array where every name appears exactly once and the array is in lexicographic order.

**Validates: Requirements 1.3**

### Property 2: ModelInstance clone round-trip

*For any* `ModelInstance` (including those with `animationClipName` and `animationAutoplay` set), `cloneModelInstance` should produce a value that is deeply equal to the original as determined by `areModelInstancesEqual`.

**Validates: Requirements 2.8, 2.9**

### Property 3: ModelInstance equality distinguishes animation fields

*For any* two `ModelInstance` values that differ only in `animationClipName` or `animationAutoplay`, `areModelInstancesEqual` should return `false`.

**Validates: Requirements 2.9**

### Property 4: Autoplay starts the named clip on scene load

*For any* runtime scene containing a model instance with `animationAutoplay: true` and a valid `animationClipName`, after `RuntimeHost.loadScene` the `AnimationMixer` for that instance should have an active `AnimationAction` for the named clip.

**Validates: Requirements 2.5, 5.4**

### Property 5: playAnimation action starts the named clip

*For any* model instance present in the runtime scene with a loaded asset containing at least one clip, dispatching a `playAnimation` action with a valid `clipName` should result in the mixer for that instance having an active action for that clip.

**Validates: Requirements 3.2, 5.5**

### Property 6: stopAnimation action halts playback

*For any* model instance that has an active animation, dispatching a `stopAnimation` action should result in the mixer having no active actions.

**Validates: Requirements 4.2**

### Property 7: Mixer count matches animated instance count

*For any* runtime scene with N model instances that have loaded assets with at least one animation clip, after `loadScene` the `RuntimeHost` should have exactly N active `AnimationMixer` instances.

**Validates: Requirements 5.1**

### Property 8: Mixer cleanup on scene reload

*For any* sequence of `loadScene` calls, after each call the set of active mixers should correspond exactly to the model instances in the most recently loaded scene (no stale mixers from previous scenes).

**Validates: Requirements 5.3**

### Property 9: playAnimation factory validates non-empty fields

*For any* call to `createPlayAnimationInteractionLink` where `sourceEntityId`, `targetModelInstanceId`, or `clipName` is an empty string, the function should throw an error.

**Validates: Requirements 3.5**

### Property 10: stopAnimation factory validates non-empty fields

*For any* call to `createStopAnimationInteractionLink` where `sourceEntityId` or `targetModelInstanceId` is an empty string, the function should throw an error.

**Validates: Requirements 4.5**

### Property 11: v11 → v12 migration preserves all existing data

*For any* valid v11 document, migrating to v12 should produce a document where all brushes, model instances (with `animationClipName: undefined`, `animationAutoplay: undefined`), entities, and interaction links are identical to the source, and the version is 12.

**Validates: Requirements 8.2**

### Property 12: Serialization round-trip for v12 documents

*For any* valid v12 `SceneDocument` containing animation fields (including `playAnimation` and `stopAnimation` interaction links), `parseSceneDocumentJson(serializeSceneDocument(doc))` should produce a document deeply equal to the original.

**Validates: Requirements 8.3, 8.4, 8.6**

## Error Handling

- **Missing clip name at dispatch**: `applyPlayAnimationAction` logs a `console.warn` and returns without throwing. The scene continues running.
- **Missing model instance at dispatch**: Both `applyPlayAnimationAction` and `applyStopAnimationAction` log a `console.warn` and return.
- **Stop with no active animation**: `mixer.stopAllAction()` is idempotent — calling it when nothing is playing is safe.
- **Migration of unknown action types**: `readInteractionAction` already throws on unknown `type` values. The new cases are added to the switch; unknown types remain an error.
- **Empty `clipName` in persisted document**: `migrateSceneDocument` rejects a v12 document where a `playAnimation` action has an empty `clipName` string (after trimming).
- **Asset not loaded at scene build time**: If `loadedModelAssets` does not contain the asset for a model instance, no mixer is created. The model renders as a placeholder (existing behavior). No animation plays.

## Testing Strategy

### Unit tests (Vitest)

Unit tests cover specific examples, edge cases, and pure-function correctness:

- `collectAnimationNames` with zero clips, one clip, multiple clips with duplicates, clips with blank names
- `createModelInstance` with and without animation fields
- `cloneModelInstance` preserves animation fields
- `areModelInstancesEqual` returns false when animation fields differ
- `createPlayAnimationInteractionLink` throws on empty `sourceEntityId`, `targetModelInstanceId`, or `clipName`
- `createStopAnimationInteractionLink` throws on empty `sourceEntityId` or `targetModelInstanceId`
- `migrateSceneDocument` v11 → v12: model instances get `undefined` animation fields
- `migrateSceneDocument` v12 with `playAnimation` link: reads correctly
- `migrateSceneDocument` v12 with empty `clipName`: throws
- `parseSceneDocumentJson(serializeSceneDocument(doc))` round-trip for a v12 document with animation fields

### Property-based tests (fast-check, Vitest)

Property tests use `fast-check` to generate random inputs and verify universal properties. Each test runs a minimum of 100 iterations.

- **Property 1**: Generate random string arrays → `collectAnimationNames` output is sorted and deduplicated
  - `Feature: animation-playback, Property 1: animation names are sorted and deduplicated`
- **Property 2**: Generate random `ModelInstance` values with optional animation fields → `cloneModelInstance` produces an equal value
  - `Feature: animation-playback, Property 2: ModelInstance clone round-trip`
- **Property 3**: Generate pairs of `ModelInstance` values differing only in animation fields → `areModelInstancesEqual` returns false
  - `Feature: animation-playback, Property 3: ModelInstance equality distinguishes animation fields`
- **Property 9**: Generate empty-string variants of factory arguments → `createPlayAnimationInteractionLink` throws
  - `Feature: animation-playback, Property 9: playAnimation factory validates non-empty fields`
- **Property 10**: Generate empty-string variants of factory arguments → `createStopAnimationInteractionLink` throws
  - `Feature: animation-playback, Property 10: stopAnimation factory validates non-empty fields`
- **Property 11**: Generate random v11 documents → migration produces valid v12 documents with animation fields defaulted
  - `Feature: animation-playback, Property 11: v11 to v12 migration preserves all existing data`
- **Property 12**: Generate random v12 documents with animation fields → round-trip serialization produces equal documents
  - `Feature: animation-playback, Property 12: serialization round-trip for v12 documents`

Runtime properties (4–8) require a headless `RuntimeHost` instance (`enableRendering: false`). These are integration-level unit tests rather than pure property tests, but they verify universal behaviors:

- **Property 4**: For any scene with autoplay model instances, after `loadScene` the mixer has an active action
- **Property 5**: For any valid `playAnimation` dispatch, the mixer has an active action for the named clip
- **Property 6**: For any active animation, after `stopAnimation` dispatch the mixer has no active actions
- **Property 7**: Mixer count equals animated instance count after `loadScene`
- **Property 8**: After a second `loadScene`, no stale mixers from the first scene remain

### Manual / e2e verification

Use a small animated GLB fixture (e.g., a box with a simple rotation animation) to verify:

1. Import the fixture — `animationNames` appears in the asset panel
2. Place the model instance — animation section appears in the inspector
3. Select a clip and enable autoplay — entering play mode shows the animation running
4. Wire a trigger volume → `playAnimation` → the model instance — entering the volume starts the animation
5. Wire a second trigger volume → `stopAnimation` → the model instance — entering the second volume stops it
6. Save and reload — animation settings survive the round-trip
