import { AudioListener, Group, PositionalAudio, Scene, Vector3 } from "three";
const _listenerPosition = /*@__PURE__*/ new Vector3();
const _emitterPosition = /*@__PURE__*/ new Vector3();
function getErrorDetail(error) {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message.trim();
    }
    return "Unknown error.";
}
function formatSoundEmitterLabel(entityId, link) {
    return link === null ? entityId : `${entityId} (${link.id})`;
}
export function computeSoundEmitterDistanceGain(distance, refDistance, maxDistance) {
    if (!Number.isFinite(distance) || !Number.isFinite(refDistance) || !Number.isFinite(maxDistance)) {
        return 0;
    }
    if (distance <= refDistance) {
        return 1;
    }
    if (maxDistance <= refDistance) {
        return 0;
    }
    if (distance >= maxDistance) {
        return 0;
    }
    const normalizedDistance = (distance - refDistance) / (maxDistance - refDistance);
    const clampedDistance = Math.min(1, Math.max(0, normalizedDistance));
    const proximity = 1 - clampedDistance;
    const easedProximity = proximity * proximity * proximity * proximity;
    return easedProximity;
}
export class RuntimeAudioSystem {
    camera;
    scene;
    soundGroup = new Group();
    soundEmitters = new Map();
    pendingPlayEmitterIds = new Set();
    listener;
    runtimeScene = null;
    projectAssets = {};
    loadedAudioAssets = {};
    runtimeMessageHandler;
    currentRuntimeMessage = null;
    unlockRequested = false;
    constructor(scene, camera, runtimeMessageHandler) {
        this.scene = scene;
        this.camera = camera;
        this.runtimeMessageHandler = runtimeMessageHandler;
        this.scene.add(this.soundGroup);
        let listener = null;
        try {
            listener = new AudioListener();
            this.camera.add(listener);
        }
        catch (error) {
            console.warn(`Audio is unavailable in this browser environment: ${getErrorDetail(error)}`);
        }
        this.listener = listener;
    }
    setRuntimeMessageHandler(handler) {
        this.runtimeMessageHandler = handler;
    }
    loadScene(runtimeScene) {
        this.runtimeScene = runtimeScene;
        this.rebuildSoundEmitters();
        this.queueAutoplayEmitters();
    }
    updateAssets(projectAssets, loadedAudioAssets) {
        this.projectAssets = projectAssets;
        this.loadedAudioAssets = loadedAudioAssets;
        this.rebuildSoundEmitters();
        this.queueAutoplayEmitters();
    }
    updateListenerTransform() {
        this.listener?.updateMatrixWorld(true);
        this.updateSoundEmitterVolumes();
    }
    handleUserGesture() {
        if (this.listener === null) {
            return;
        }
        const context = this.listener.context;
        if (context.state === "running") {
            if (this.unlockRequested) {
                this.unlockRequested = false;
                this.setRuntimeMessage(null);
            }
            return;
        }
        this.unlockRequested = true;
        void context
            .resume()
            .then(() => {
            this.unlockRequested = false;
            this.flushPendingPlays();
            this.setRuntimeMessage(null);
        })
            .catch((error) => {
            this.setRuntimeMessage(`Audio unlock failed: ${getErrorDetail(error)}`);
        });
    }
    playSound(soundEmitterId, link) {
        const soundEmitter = this.soundEmitters.get(soundEmitterId);
        if (soundEmitter === undefined) {
            this.setRuntimeMessage(`Sound emitter ${formatSoundEmitterLabel(soundEmitterId, link)} could not be found.`);
            return;
        }
        if (this.listener === null) {
            this.setRuntimeMessage("Audio is unavailable in this browser environment.");
            return;
        }
        if (soundEmitter.buffer === null) {
            const assetLabel = this.describeAudioAssetAvailability(soundEmitter.entity.audioAssetId);
            this.setRuntimeMessage(`Sound emitter ${formatSoundEmitterLabel(soundEmitterId, link)} cannot play because ${assetLabel}.`);
            console.warn(`playSound: ${soundEmitterId} has no playable audio buffer.`);
            return;
        }
        if (this.listener.context.state !== "running") {
            this.pendingPlayEmitterIds.add(soundEmitterId);
            this.setRuntimeMessage("Audio is locked. Click the runner to enable sound.");
            return;
        }
        this.playBufferedSound(soundEmitterId);
    }
    stopSound(soundEmitterId) {
        this.pendingPlayEmitterIds.delete(soundEmitterId);
        const soundEmitter = this.soundEmitters.get(soundEmitterId);
        if (soundEmitter === undefined || soundEmitter.audio === null) {
            return;
        }
        try {
            soundEmitter.audio.stop();
        }
        catch (error) {
            console.warn(`stopSound: ${soundEmitterId} could not be stopped: ${getErrorDetail(error)}`);
        }
    }
    dispose() {
        for (const soundEmitterId of this.soundEmitters.keys()) {
            this.stopSound(soundEmitterId);
        }
        this.pendingPlayEmitterIds.clear();
        for (const soundEmitter of this.soundEmitters.values()) {
            this.soundGroup.remove(soundEmitter.group);
            if (soundEmitter.audio !== null) {
                soundEmitter.group.remove(soundEmitter.audio);
            }
        }
        this.soundEmitters.clear();
        this.scene.remove(this.soundGroup);
        if (this.listener !== null) {
            this.camera.remove(this.listener);
        }
    }
    setRuntimeMessage(message) {
        if (this.currentRuntimeMessage === message) {
            return;
        }
        this.currentRuntimeMessage = message;
        this.runtimeMessageHandler?.(message);
    }
    rebuildSoundEmitters() {
        if (this.runtimeScene === null) {
            return;
        }
        for (const soundEmitter of this.soundEmitters.values()) {
            this.stopSound(soundEmitter.entity.entityId);
            this.soundGroup.remove(soundEmitter.group);
            if (soundEmitter.audio !== null) {
                soundEmitter.group.remove(soundEmitter.audio);
            }
        }
        this.soundEmitters.clear();
        for (const entity of this.runtimeScene.entities.soundEmitters) {
            const group = new Group();
            group.position.set(entity.position.x, entity.position.y, entity.position.z);
            let audio = null;
            if (this.listener !== null) {
                audio = new PositionalAudio(this.listener);
                this.configurePositionalAudio(audio, entity);
                audio.position.set(0, 0, 0);
                group.add(audio);
            }
            const buffer = this.resolveAudioBuffer(entity.audioAssetId);
            if (audio !== null && buffer !== null) {
                audio.setBuffer(buffer);
            }
            this.soundGroup.add(group);
            this.soundEmitters.set(entity.entityId, {
                entity,
                group,
                audio,
                buffer
            });
        }
    }
    resolveAudioBuffer(audioAssetId) {
        if (audioAssetId === null) {
            return null;
        }
        const loadedAsset = this.loadedAudioAssets[audioAssetId];
        if (loadedAsset !== undefined) {
            return loadedAsset.buffer;
        }
        const asset = this.projectAssets[audioAssetId];
        if (asset === undefined) {
            return null;
        }
        if (asset.kind !== "audio") {
            return null;
        }
        return null;
    }
    describeAudioAssetAvailability(audioAssetId) {
        if (audioAssetId === null) {
            return "no assigned audio asset";
        }
        const asset = this.projectAssets[audioAssetId];
        if (asset === undefined) {
            return `missing audio asset ${audioAssetId}`;
        }
        if (asset.kind !== "audio") {
            return `asset ${audioAssetId} is not an audio asset`;
        }
        return `audio asset ${audioAssetId} is unavailable`;
    }
    queueAutoplayEmitters() {
        if (this.runtimeScene === null) {
            return;
        }
        for (const entity of this.runtimeScene.entities.soundEmitters) {
            if (entity.autoplay) {
                this.pendingPlayEmitterIds.add(entity.entityId);
            }
        }
        this.flushPendingPlays();
    }
    flushPendingPlays() {
        if (this.listener === null || this.listener.context.state !== "running") {
            return;
        }
        const pendingEmitterIds = [...this.pendingPlayEmitterIds];
        this.pendingPlayEmitterIds.clear();
        for (const soundEmitterId of pendingEmitterIds) {
            this.playBufferedSound(soundEmitterId);
        }
    }
    playBufferedSound(soundEmitterId) {
        const soundEmitter = this.soundEmitters.get(soundEmitterId);
        if (soundEmitter === undefined || soundEmitter.audio === null || soundEmitter.buffer === null) {
            return;
        }
        try {
            soundEmitter.audio.stop();
        }
        catch {
            // three.js audio.stop() can throw when the underlying source is not active yet.
        }
        this.configurePositionalAudio(soundEmitter.audio, soundEmitter.entity);
        this.updateSoundEmitterVolume(soundEmitter);
        soundEmitter.audio.setBuffer(soundEmitter.buffer);
        soundEmitter.audio.play();
    }
    configurePositionalAudio(audio, entity) {
        audio.setLoop(entity.loop);
        audio.setRefDistance(entity.refDistance);
        audio.setMaxDistance(entity.maxDistance);
        audio.setDistanceModel("inverse");
        audio.setRolloffFactor(0);
    }
    updateSoundEmitterVolumes() {
        if (this.listener === null) {
            return;
        }
        for (const soundEmitter of this.soundEmitters.values()) {
            this.updateSoundEmitterVolume(soundEmitter);
        }
    }
    updateSoundEmitterVolume(soundEmitter) {
        if (soundEmitter.audio === null) {
            return;
        }
        this.camera.getWorldPosition(_listenerPosition);
        soundEmitter.group.getWorldPosition(_emitterPosition);
        const distance = _listenerPosition.distanceTo(_emitterPosition);
        const attenuation = computeSoundEmitterDistanceGain(distance, soundEmitter.entity.refDistance, soundEmitter.entity.maxDistance);
        soundEmitter.audio.setVolume(soundEmitter.entity.volume * attenuation);
    }
}
