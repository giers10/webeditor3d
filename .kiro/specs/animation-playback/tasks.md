# Implementation Plan: Animation Playback

## Overview

Implement animation playback for imported GLB/GLTF assets in vertical slice order: data model → interaction layer → runtime build → runtime host → serialization/migration → inspector UI → interaction link UI. Each step is immediately integrated; no orphaned code.

## Tasks

- [x] 1. Extend `ModelInstance` with animation fields
  - Add `animationClipName?: string` and `animationAutoplay?: boolean` to the `ModelInstance` interface in `src/assets/model-instances.ts`
  - Update `createModelInstance` to accept and store the new optional fields
  - Update `cloneModelInstance` to copy the new fields
  - Update `areModelInstancesEqual` to include the new fields in the comparison
  - _Requirements: 2.1, 2.2, 2.7, 2.8, 2.9_

  - [ ]* 1.1 Write property test: ModelInstance clone round-trip
    - **Property 2: ModelInstance clone round-trip**
    - Generate random `ModelInstance` values with optional animation fields; assert `areModelInstancesEqual(original, cloneModelInstance(original))` is true
    - **Validates: Requirements 2.8, 2.9**

  - [ ]* 1.2 Write property test: ModelInstance equality distinguishes animation fields
    - **Property 3: ModelInstance equality distinguishes animation fields**
    - Generate pairs of instances differing only in `animationClipName` or `animationAutoplay`; assert `areModelInstancesEqual` returns false
    - **Validates: Requirements 2.9**

- [x] 2. Extend `LoadedModelAsset` with animation clips
  - Add `animations: AnimationClip[]` to the `LoadedModelAsset` interface in `src/assets/gltf-model-import.ts`
  - Update `createLoadedModelAsset` to accept and store `gltf.animations`
  - Update all call sites (`importModelAssetFromFiles`, `loadModelAssetFromStorage`) to pass the clips
  - _Requirements: 5.1, 5.4_

  - [ ]* 2.1 Write unit test: animation clips are preserved in LoadedModelAsset
    - Test that after loading a GLTF fixture with animations, `loadedAsset.animations` contains the expected clip names
    - _Requirements: 1.1, 5.1_

- [x] 3. Add `PlayAnimationAction` and `StopAnimationAction` to the interaction layer
  - Add the two new action interfaces and extend the `InteractionAction` union in `src/interactions/interaction-links.ts`
  - Add `createPlayAnimationInteractionLink` factory with validation (non-empty `sourceEntityId`, `targetModelInstanceId`, `clipName`)
  - Add `createStopAnimationInteractionLink` factory with validation (non-empty `sourceEntityId`, `targetModelInstanceId`)
  - Update `cloneAction`, `areInteractionLinksEqual`, and `cloneInteractionLink` to handle the new types
  - _Requirements: 3.1, 3.5, 4.1, 4.5_

  - [ ]* 3.1 Write property test: playAnimation factory validates non-empty fields
    - **Property 9: playAnimation factory validates non-empty fields**
    - Generate calls with empty string in each required field; assert each throws
    - **Validates: Requirements 3.5**

  - [ ]* 3.2 Write property test: stopAnimation factory validates non-empty fields
    - **Property 10: stopAnimation factory validates non-empty fields**
    - Generate calls with empty string in each required field; assert each throws
    - **Validates: Requirements 4.5**

- [x] 4. Extend the runtime build layer
  - Add `animationClipName?: string` and `animationAutoplay?: boolean` to `RuntimeModelInstance` in `src/runtime-three/runtime-scene-build.ts`
  - Update `buildRuntimeModelInstance` to propagate the new fields from the document model instance
  - Extend `RuntimeInteractionDispatcher` in `src/runtime-three/runtime-interaction-system.ts` with `playAnimation` and `stopAnimation` methods
  - Update `RuntimeInteractionSystem.dispatchLinks` to handle `"playAnimation"` and `"stopAnimation"` action types
  - _Requirements: 3.6, 4.6, 5.6_

  - [ ]* 4.1 Write unit test: buildRuntimeSceneFromDocument propagates animation fields
    - Create a document with a model instance that has `animationClipName` and `animationAutoplay` set; assert the built `RuntimeModelInstance` has the same values
    - _Requirements: 5.6_

- [x] 5. Implement `AnimationMixer` lifecycle in `RuntimeHost`
  - Add `animationMixers: Map<string, AnimationMixer>` and `instanceAnimationClips: Map<string, AnimationClip[]>` private fields to `RuntimeHost` in `src/runtime-three/runtime-host.ts`
  - In `rebuildModelInstances`: after creating each render group, check `loadedModelAssets[assetId].animations`; if non-empty, create a mixer, store it, and start autoplay if configured
  - In `clearModelInstances`: call `mixer.stopAllAction()` and clear both maps before removing render objects
  - In the `render` loop: tick all active mixers with `mixer.update(dt)`
  - Add `applyPlayAnimationAction` and `applyStopAnimationAction` private methods
  - Extend `createInteractionDispatcher` to wire the two new dispatcher methods to the new private methods
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 5.1 Write property test: mixer count matches animated instance count
    - **Property 7: Mixer count matches animated instance count**
    - Create a headless `RuntimeHost` (`enableRendering: false`), load a scene with N animated model instances, assert `animationMixers.size === N`
    - **Validates: Requirements 5.1**

  - [ ]* 5.2 Write property test: autoplay starts the named clip on scene load
    - **Property 4: Autoplay starts the named clip on scene load**
    - Load a scene with a model instance with `animationAutoplay: true` and a valid `animationClipName`; assert the mixer has an active action for that clip
    - **Validates: Requirements 2.5, 5.4**

  - [ ]* 5.3 Write property test: playAnimation action starts the named clip
    - **Property 5: playAnimation action starts the named clip**
    - Dispatch a `playAnimation` action for a valid instance and clip; assert the mixer has an active action for that clip
    - **Validates: Requirements 3.2, 5.5**

  - [ ]* 5.4 Write property test: stopAnimation action halts playback
    - **Property 6: stopAnimation action halts playback**
    - Start an animation, then dispatch `stopAnimation`; assert the mixer has no active actions
    - **Validates: Requirements 4.2**

  - [ ]* 5.5 Write property test: mixer cleanup on scene reload
    - **Property 8: Mixer cleanup on scene reload**
    - Load scene A, then load scene B; assert no mixers from scene A remain
    - **Validates: Requirements 5.3**

- [x] 6. Checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Schema migration: bump version to 12
  - Increment `SCENE_DOCUMENT_VERSION` to `12` and add `ANIMATION_PLAYBACK_SCENE_DOCUMENT_VERSION = 12` in `src/document/scene-document.ts`
  - In `src/document/migrate-scene-document.ts`:
    - Update `readModelInstance` to read `animationClipName` (optional string, trimmed, empty → undefined) and `animationAutoplay` (optional boolean)
    - Update `readInteractionAction` to handle `"playAnimation"` (requires non-empty `targetModelInstanceId` and `clipName`) and `"stopAnimation"` (requires non-empty `targetModelInstanceId`)
    - Add a migration branch for v11 → v12 that reads all existing fields and sets `animationClipName: undefined` and `animationAutoplay: undefined` on all model instances
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 7.1 Write property test: v11 → v12 migration preserves all existing data
    - **Property 11: v11 to v12 migration preserves all existing data**
    - Generate random v11 documents; assert migration produces valid v12 documents with animation fields defaulted to `undefined` and all other data unchanged
    - **Validates: Requirements 8.2**

  - [ ]* 7.2 Write property test: serialization round-trip for v12 documents
    - **Property 12: Serialization round-trip for v12 documents**
    - Generate random v12 documents with animation fields (including `playAnimation` and `stopAnimation` links); assert `parseSceneDocumentJson(serializeSceneDocument(doc))` produces a deeply equal document
    - **Validates: Requirements 8.3, 8.4, 8.6**

  - [x]* 7.3 Write unit test: migration rejects empty clipName
    - Pass a v12 document with a `playAnimation` action where `clipName` is `""` to `migrateSceneDocument`; assert it throws
    - _Requirements: 8.5_

- [x] 8. Inspector UI — animation section for model instances
  - In `src/app/App.tsx`, in the model instance inspector section, add a conditional animation sub-section rendered when `selectedModelAssetRecord.metadata.animationNames.length > 0`
  - Render a `<select>` for clip name (options from `animationNames`, plus a "— none —" option) bound to `selectedModelInstance.animationClipName`
  - Render a checkbox for `animationAutoplay` bound to `selectedModelInstance.animationAutoplay`
  - On change, dispatch `createUpsertModelInstanceCommand` with the updated model instance
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 9. Interaction link UI — play/stop animation action authoring
  - In `src/app/App.tsx`, extend the interaction link action type `<select>` to include `"playAnimation"` and `"stopAnimation"` options
  - When `"playAnimation"` is selected, show a model instance picker and a clip name `<select>` (populated from the chosen instance's asset's `animationNames`)
  - When `"stopAnimation"` is selected, show only the model instance picker
  - Update `getInteractionActionLabel` to return human-readable labels for the new action types
  - On save, dispatch `createUpsertInteractionLinkCommand` with the appropriate factory-created link
  - Display existing `playAnimation`/`stopAnimation` links with resolved model instance name and clip name
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [-] 10. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The `fast-check` library should be used for property-based tests (already in the preferred stack or add as a dev dependency)
- `RuntimeHost` tests use `enableRendering: false` to avoid WebGL in the test environment
- The editor viewport intentionally does not play animations — only the runner does
- Animation clip lookup uses `AnimationClip.findByName` (three.js built-in) for robustness
