import { afterEach, describe, expect, it, vi } from "vitest";
import { createInMemoryProjectAssetStorage } from "../../src/assets/project-asset-storage";
import { importAudioAssetFromFile, loadAudioAssetFromStorage } from "../../src/assets/audio-assets";
describe("audio asset import and storage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });
    it("persists audio through the generic project asset storage and reloads decoded buffers", async () => {
        const decodedBuffer = {
            duration: 2.5,
            numberOfChannels: 2,
            sampleRate: 44100
        };
        const decodeCalls = [];
        const closeCalls = [];
        class MockAudioContext {
            state = "running";
            async decodeAudioData(bytes) {
                decodeCalls.push(bytes);
                return decodedBuffer;
            }
            async close() {
                closeCalls.push(1);
            }
        }
        vi.stubGlobal("AudioContext", MockAudioContext);
        vi.stubGlobal("webkitAudioContext", MockAudioContext);
        const storage = createInMemoryProjectAssetStorage();
        const fileBytes = new Uint8Array([1, 2, 3, 4]).buffer;
        const file = {
            name: "lobby-loop.ogg",
            type: "audio/ogg",
            webkitRelativePath: "",
            arrayBuffer: async () => fileBytes
        };
        const importedAudio = await importAudioAssetFromFile(file, storage);
        const storedAsset = await storage.getAsset(importedAudio.asset.storageKey);
        const reloadedAudio = await loadAudioAssetFromStorage(storage, importedAudio.asset);
        expect(importedAudio.asset).toMatchObject({
            kind: "audio",
            sourceName: "lobby-loop.ogg",
            mimeType: "audio/ogg",
            byteLength: fileBytes.byteLength
        });
        expect(importedAudio.asset.metadata).toMatchObject({
            kind: "audio",
            durationSeconds: 2.5,
            channelCount: 2,
            sampleRateHz: 44100
        });
        expect(storedAsset).toEqual({
            files: {
                "lobby-loop.ogg": {
                    bytes: fileBytes,
                    mimeType: "audio/ogg"
                }
            }
        });
        expect(reloadedAudio.assetId).toBe(importedAudio.asset.id);
        expect(reloadedAudio.storageKey).toBe(importedAudio.asset.storageKey);
        expect(reloadedAudio.metadata).toEqual(importedAudio.asset.metadata);
        expect(reloadedAudio.buffer).toBe(decodedBuffer);
        expect(decodeCalls).toHaveLength(2);
        expect(closeCalls).toHaveLength(2);
    });
});
