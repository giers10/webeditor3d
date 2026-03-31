# Requirements Document

## Introduction

This feature adds animation playback support for imported GLB/GLTF model assets in the browser-based 3D scene editor. Animations embedded in GLB/GLTF files are already detected and stored in `ModelAssetMetadata.animationNames` during import. This slice surfaces those animation names in the editor UI, allows authors to configure a default animation clip per model instance, wires `playAnimation` and `stopAnimation` actions into the existing Trigger → Action → Target interaction system, drives playback in the runtime via three.js `AnimationMixer`, and persists all animation settings through save/load with a schema version bump and migration.

The scope is deliberately narrow: no timeline editor, no blend trees, no cross-fade authoring. The goal is a minimal, explicit, and correct first pass.

## Glossary

- **AnimationClip**: A named animation track embedded in a GLB/GLTF file, identified by its string name as stored in `ModelAssetMetadata.animationNames`.
- **AnimationMixer**: The three.js `AnimationMixer` object that drives `AnimationClip` playback on a scene object.
- **ModelInstance**: A placed scene instance of an imported model asset, stored in `SceneDocument.modelInstances`, separate from entities.
- **ModelAssetMetadata**: Canonical metadata extracted from a GLB/GLTF file at import time, including `animationNames: string[]`.
- **InteractionLink**: A typed Trigger → Action → Target record stored in `SceneDocument.interactionLinks`.
- **PlayAnimationAction**: A new `InteractionAction` type that targets a model instance and names a clip to play.
- **StopAnimationAction**: A new `InteractionAction` type that targets a model instance and stops its active animation.
- **RuntimeAnimationState**: Per-instance runtime state tracking the active `AnimationMixer` and current `AnimationAction`.
- **Document**: The canonical editor state (`SceneDocument`), independent of three.js scene graph objects.
- **Runner**: The browser runtime that loads and plays scenes.
- **Command**: An undoable state transition applied to the Document.

## Requirements

### Requirement 1: Animation Metadata Availability

**User Story:** As an author, I want to see which animation clips are available on an imported model, so that I can make informed decisions when configuring animation playback.

#### Acceptance Criteria

1. THE `ModelAssetMetadata` SHALL contain an `animationNames` field of type `string[]` that lists every animation clip name extracted from the imported GLB/GLTF file.
2. WHEN a GLB/GLTF file containing zero named animations is imported, THE `ModelAssetMetadata` SHALL store an empty `animationNames` array.
3. WHEN a GLB/GLTF file containing one or more animations is imported, THE `ModelAssetMetadata` SHALL store each animation name exactly once, sorted lexicographically.
4. WHEN an animation clip has an empty or whitespace-only name, THE importer SHALL substitute a fallback name of the form `"Animation N"` where N is the one-based index of the clip.
5. THE `migrateSceneDocument` function SHALL correctly read and validate the `animationNames` field when loading documents of version 12 or later.

### Requirement 2: Model Instance Animation Configuration

**User Story:** As an author, I want to configure a default animation clip and autoplay setting on a model instance, so that the model plays the right animation when the scene starts.

#### Acceptance Criteria

1. THE `ModelInstance` document type SHALL include an optional `animationClipName` field of type `string | undefined` that names the clip to play by default.
2. THE `ModelInstance` document type SHALL include an optional `animationAutoplay` field of type `boolean | undefined` that controls whether the clip starts playing automatically when the runner loads the scene.
3. WHEN `animationClipName` is set to a non-empty string, THE Runner SHALL use that clip name to look up the `AnimationClip` in the loaded GLTF animations array.
4. WHEN `animationClipName` is `undefined` or empty, THE Runner SHALL not start any animation automatically for that model instance.
5. WHEN `animationAutoplay` is `true` and `animationClipName` is set, THE Runner SHALL begin playing the named clip immediately when the scene loads, looping continuously.
6. WHEN `animationAutoplay` is `false` or `undefined`, THE Runner SHALL not autoplay any animation for that model instance on scene load.
7. THE `createModelInstance` factory function SHALL accept `animationClipName` and `animationAutoplay` as optional fields and include them in the returned `ModelInstance`.
8. THE `cloneModelInstance` function SHALL copy `animationClipName` and `animationAutoplay` faithfully.
9. THE `areModelInstancesEqual` function SHALL include `animationClipName` and `animationAutoplay` in its equality check.

### Requirement 3: Interaction System — Play Animation Action

**User Story:** As an author, I want to wire a trigger to play a specific animation clip on a model instance, so that animations can be activated by player interaction or zone entry.

#### Acceptance Criteria

1. THE `InteractionAction` union SHALL include a `PlayAnimationAction` type with fields `type: "playAnimation"`, `targetModelInstanceId: string`, and `clipName: string`.
2. WHEN a `playAnimation` action is dispatched, THE Runner SHALL locate the model instance by `targetModelInstanceId` and start playing the clip named `clipName`, looping continuously.
3. WHEN a `playAnimation` action targets a model instance whose loaded asset does not contain a clip matching `clipName`, THE Runner SHALL log a warning and take no further action.
4. WHEN a `playAnimation` action targets a model instance that is not present in the runtime scene, THE Runner SHALL log a warning and take no further action.
5. THE `createPlayAnimationInteractionLink` factory function SHALL validate that `sourceEntityId`, `targetModelInstanceId`, and `clipName` are all non-empty strings.
6. THE `RuntimeInteractionDispatcher` interface SHALL include a `playAnimation(instanceId: string, clipName: string, link: InteractionLink): void` method.

### Requirement 4: Interaction System — Stop Animation Action

**User Story:** As an author, I want to wire a trigger to stop the animation on a model instance, so that animations can be halted by player interaction or zone exit.

#### Acceptance Criteria

1. THE `InteractionAction` union SHALL include a `StopAnimationAction` type with fields `type: "stopAnimation"` and `targetModelInstanceId: string`.
2. WHEN a `stopAnimation` action is dispatched, THE Runner SHALL locate the model instance by `targetModelInstanceId` and stop any currently playing animation, leaving the model in its stopped pose.
3. WHEN a `stopAnimation` action targets a model instance with no active animation, THE Runner SHALL take no action and produce no error.
4. WHEN a `stopAnimation` action targets a model instance that is not present in the runtime scene, THE Runner SHALL log a warning and take no further action.
5. THE `createStopAnimationInteractionLink` factory function SHALL validate that `sourceEntityId` and `targetModelInstanceId` are both non-empty strings.
6. THE `RuntimeInteractionDispatcher` interface SHALL include a `stopAnimation(instanceId: string, link: InteractionLink): void` method.

### Requirement 5: Runtime Animation Playback

**User Story:** As a player, I want model animations to play smoothly in the runner, so that the scene feels alive and responsive.

#### Acceptance Criteria

1. WHEN the Runner loads a scene, THE `RuntimeHost` SHALL create one `AnimationMixer` per model instance that has a loaded GLTF asset with at least one animation clip.
2. WHEN the Runner's per-frame `render` loop executes, THE `RuntimeHost` SHALL call `mixer.update(dt)` for every active `AnimationMixer`, where `dt` is the elapsed time in seconds since the previous frame.
3. WHEN a model instance is removed from the scene or the scene is reloaded, THE `RuntimeHost` SHALL stop and dispose of the associated `AnimationMixer`.
4. WHEN `animationAutoplay` is `true` and `animationClipName` is set on a model instance, THE `RuntimeHost` SHALL start the named clip playing on scene load before the first rendered frame.
5. WHEN a `playAnimation` action is dispatched for a model instance that already has an active animation, THE `RuntimeHost` SHALL stop the current animation and start the new clip.
6. THE `RuntimeModelInstance` runtime data type SHALL include `animationClipName: string | undefined` and `animationAutoplay: boolean | undefined` so the runner can act on them without re-reading the document.

### Requirement 6: Inspector UI — Animation Configuration

**User Story:** As an author, I want to configure animation settings on a selected model instance in the inspector panel, so that I can set up autoplay and default clips without editing JSON.

#### Acceptance Criteria

1. WHEN a model instance is selected and its asset has at least one animation clip, THE Inspector SHALL display an animation section showing the list of available clip names from `ModelAssetMetadata.animationNames`.
2. WHEN a model instance is selected and its asset has zero animation clips, THE Inspector SHALL not display an animation section.
3. WHEN the author selects a clip name from the animation section, THE Inspector SHALL dispatch an `UpsertModelInstanceCommand` that sets `animationClipName` on the model instance.
4. WHEN the author toggles the autoplay checkbox, THE Inspector SHALL dispatch an `UpsertModelInstanceCommand` that sets `animationAutoplay` on the model instance.
5. WHEN the author clears the clip selection, THE Inspector SHALL dispatch an `UpsertModelInstanceCommand` that sets `animationClipName` to `undefined`.
6. THE Inspector animation section SHALL reflect the current `animationClipName` and `animationAutoplay` values from the selected model instance.

### Requirement 7: Interaction Link UI — Animation Actions

**User Story:** As an author, I want to create play/stop animation interaction links in the interaction panel, so that I can connect triggers to animation actions.

#### Acceptance Criteria

1. WHEN the author creates a new interaction link and selects the `playAnimation` action type, THE Interaction Panel SHALL display fields for selecting the target model instance and entering or selecting the clip name.
2. WHEN the author creates a new interaction link and selects the `stopAnimation` action type, THE Interaction Panel SHALL display a field for selecting the target model instance.
3. WHEN the author saves a `playAnimation` link, THE Panel SHALL dispatch an `UpsertInteractionLinkCommand` with a valid `PlayAnimationAction`.
4. WHEN the author saves a `stopAnimation` link, THE Panel SHALL dispatch an `UpsertInteractionLinkCommand` with a valid `StopAnimationAction`.
5. WHEN an existing `playAnimation` or `stopAnimation` link is displayed in the interaction panel, THE Panel SHALL show the resolved model instance name and clip name.

### Requirement 8: Persistence — Schema Migration

**User Story:** As an author, I want my scenes to load correctly after the animation feature is added, so that existing work is not lost.

#### Acceptance Criteria

1. THE `SCENE_DOCUMENT_VERSION` constant SHALL be incremented to `12` to reflect the addition of animation fields.
2. WHEN `migrateSceneDocument` reads a document at version `11`, THE migration SHALL produce a valid version-`12` document with `animationClipName: undefined` and `animationAutoplay: undefined` on every existing model instance.
3. WHEN `migrateSceneDocument` reads a document at version `12`, THE migration SHALL read and validate `animationClipName` and `animationAutoplay` on each model instance, accepting `undefined` or valid string/boolean values respectively.
4. WHEN `migrateSceneDocument` reads a document at version `12` containing a `playAnimation` or `stopAnimation` interaction link, THE migration SHALL read and validate the action fields correctly.
5. THE `migrateSceneDocument` function SHALL reject a version-`12` document where a `playAnimation` action has an empty `clipName` string.
6. THE serialization round-trip (serialize then deserialize) SHALL produce a document equal to the original for any valid version-`12` document containing animation fields.
