import { AudioListener, Group, PositionalAudio, Scene, type PerspectiveCamera } from "three";

import type { LoadedAudioAsset } from "../assets/audio-assets";
import type { ProjectAssetRecord } from "../assets/project-assets";
import type { InteractionLink } from "../interactions/interaction-links";
import type { RuntimeSceneDefinition, RuntimeSoundEmitter } from "./runtime-scene-build";

interface RuntimeSoundEmitterState {
  entity: RuntimeSoundEmitter;
  group: Group;
  audio: PositionalAudio | null;
  buffer: AudioBuffer | null;
}

function getErrorDetail(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return "Unknown error.";
}

function formatSoundEmitterLabel(entityId: string, link: InteractionLink | null): string {
  return link === null ? entityId : `${entityId} (${link.id})`;
}

export class RuntimeAudioSystem {
  private readonly camera: PerspectiveCamera;
  private readonly scene: Scene;
  private readonly soundGroup = new Group();
  private readonly soundEmitters = new Map<string, RuntimeSoundEmitterState>();
  private readonly pendingPlayEmitterIds = new Set<string>();
  private readonly listener: AudioListener | null;
  private runtimeScene: RuntimeSceneDefinition | null = null;
  private projectAssets: Record<string, ProjectAssetRecord> = {};
  private loadedAudioAssets: Record<string, LoadedAudioAsset> = {};
  private runtimeMessageHandler: ((message: string | null) => void) | null;
  private currentRuntimeMessage: string | null = null;
  private unlockRequested = false;

  constructor(
    scene: Scene,
    camera: PerspectiveCamera,
    runtimeMessageHandler: ((message: string | null) => void) | null
  ) {
    this.scene = scene;
    this.camera = camera;
    this.runtimeMessageHandler = runtimeMessageHandler;
    this.scene.add(this.soundGroup);

    let listener: AudioListener | null = null;

    try {
      listener = new AudioListener();
      this.camera.add(listener);
    } catch (error) {
      console.warn(`Audio is unavailable in this browser environment: ${getErrorDetail(error)}`);
    }

    this.listener = listener;
  }

  setRuntimeMessageHandler(handler: ((message: string | null) => void) | null) {
    this.runtimeMessageHandler = handler;
  }

  loadScene(runtimeScene: RuntimeSceneDefinition) {
    this.runtimeScene = runtimeScene;
    this.rebuildSoundEmitters();
    this.queueAutoplayEmitters();
  }

  updateAssets(projectAssets: Record<string, ProjectAssetRecord>, loadedAudioAssets: Record<string, LoadedAudioAsset>) {
    this.projectAssets = projectAssets;
    this.loadedAudioAssets = loadedAudioAssets;
    this.rebuildSoundEmitters();
    this.queueAutoplayEmitters();
  }

  updateListenerTransform() {
    this.listener?.updateMatrixWorld(true);
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

  playSound(soundEmitterId: string, link: InteractionLink) {
    const soundEmitter = this.soundEmitters.get(soundEmitterId);

    if (soundEmitter === undefined) {
      this.setRuntimeMessage(`Sound emitter ${formatSoundEmitterLabel(soundEmitterId, link)} could not be found.`);
      return;
    }

    if (soundEmitter.buffer === null) {
      const assetLabel =
        soundEmitter.entity.audioAssetId === null ? "no assigned audio asset" : `audio asset ${soundEmitter.entity.audioAssetId}`;
      this.setRuntimeMessage(`Sound emitter ${formatSoundEmitterLabel(soundEmitterId, link)} cannot play because ${assetLabel} is unavailable.`);
      console.warn(`playSound: ${soundEmitterId} has no playable audio buffer.`);
      return;
    }

    if (this.listener === null || this.listener.context.state !== "running") {
      this.pendingPlayEmitterIds.add(soundEmitterId);
      this.setRuntimeMessage("Audio is locked. Click the runner to enable sound.");
      return;
    }

    this.playBufferedSound(soundEmitterId);
  }

  stopSound(soundEmitterId: string) {
    this.pendingPlayEmitterIds.delete(soundEmitterId);

    const soundEmitter = this.soundEmitters.get(soundEmitterId);

    if (soundEmitter === undefined || soundEmitter.audio === null) {
      return;
    }

    try {
      soundEmitter.audio.stop();
    } catch (error) {
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
      soundEmitter.group.remove(soundEmitter.audio as PositionalAudio);
    }

    this.soundEmitters.clear();
    this.scene.remove(this.soundGroup);

    if (this.listener !== null) {
      this.camera.remove(this.listener);
    }
  }

  private setRuntimeMessage(message: string | null) {
    if (this.currentRuntimeMessage === message) {
      return;
    }

    this.currentRuntimeMessage = message;
    this.runtimeMessageHandler?.(message);
  }

  private rebuildSoundEmitters() {
    if (this.runtimeScene === null) {
      return;
    }

    for (const soundEmitter of this.soundEmitters.values()) {
      this.stopSound(soundEmitter.entity.entityId);
      this.soundGroup.remove(soundEmitter.group);
      soundEmitter.group.remove(soundEmitter.audio as PositionalAudio);
    }

    this.soundEmitters.clear();

    for (const entity of this.runtimeScene.entities.soundEmitters) {
      const group = new Group();
      group.position.set(entity.position.x, entity.position.y, entity.position.z);

      let audio: PositionalAudio | null = null;

      if (this.listener !== null) {
        audio = new PositionalAudio(this.listener);
        audio.setLoop(entity.loop);
        audio.setVolume(entity.volume);
        audio.setRefDistance(entity.refDistance);
        audio.setMaxDistance(entity.maxDistance);
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

  private resolveAudioBuffer(audioAssetId: string | null): AudioBuffer | null {
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

  private queueAutoplayEmitters() {
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

  private flushPendingPlays() {
    if (this.listener === null || this.listener.context.state !== "running") {
      return;
    }

    const pendingEmitterIds = [...this.pendingPlayEmitterIds];
    this.pendingPlayEmitterIds.clear();

    for (const soundEmitterId of pendingEmitterIds) {
      this.playBufferedSound(soundEmitterId);
    }
  }

  private playBufferedSound(soundEmitterId: string) {
    const soundEmitter = this.soundEmitters.get(soundEmitterId);

    if (soundEmitter === undefined || soundEmitter.audio === null || soundEmitter.buffer === null) {
      return;
    }

    try {
      soundEmitter.audio.stop();
    } catch {
      // three.js audio.stop() can throw when the underlying source is not active yet.
    }

    soundEmitter.audio.setLoop(soundEmitter.entity.loop);
    soundEmitter.audio.setVolume(soundEmitter.entity.volume);
    soundEmitter.audio.setRefDistance(soundEmitter.entity.refDistance);
    soundEmitter.audio.setMaxDistance(soundEmitter.entity.maxDistance);
    soundEmitter.audio.setBuffer(soundEmitter.buffer);
    soundEmitter.audio.play();
  }
}
