import { AmbientLight, AnimationClip, AnimationMixer, DirectionalLight, Euler, Group, LoopOnce, LoopRepeat, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PointLight, Quaternion, Scene, ShaderMaterial, Vector3, SpotLight, WebGLRenderer } from "three";
import { createModelInstanceRenderGroup, disposeModelInstance } from "../assets/model-instance-rendering";
import { buildBoxBrushDerivedMeshData } from "../geometry/box-brush-mesh";
import { createStarterMaterialSignature, createStarterMaterialTexture } from "../materials/starter-material-textures";
import { applyAdvancedRenderingLightShadowFlags, applyAdvancedRenderingRenderableShadowFlags, configureAdvancedRenderingRenderer, createAdvancedRenderingComposer, resolveBoxVolumeRenderPaths } from "../rendering/advanced-rendering";
import { areAdvancedRenderingSettingsEqual, cloneAdvancedRenderingSettings } from "../document/world-settings";
import { FirstPersonNavigationController } from "./first-person-navigation-controller";
import { RapierCollisionWorld } from "./rapier-collision-world";
import { RuntimeInteractionSystem } from "./runtime-interaction-system";
import { RuntimeAudioSystem } from "./runtime-audio-system";
import { OrbitVisitorNavigationController } from "./orbit-visitor-navigation-controller";
const FALLBACK_FACE_COLOR = 0x747d89;
export class RuntimeHost {
    scene = new Scene();
    camera = new PerspectiveCamera(70, 1, 0.05, 1000);
    cameraForward = new Vector3();
    volumeOffset = new Vector3();
    volumeInverseRotation = new Quaternion();
    domElement;
    ambientLight = new AmbientLight();
    sunLight = new DirectionalLight();
    localLightGroup = new Group();
    brushGroup = new Group();
    modelGroup = new Group();
    firstPersonController = new FirstPersonNavigationController();
    orbitVisitorController = new OrbitVisitorNavigationController();
    interactionSystem = new RuntimeInteractionSystem();
    audioSystem = new RuntimeAudioSystem(this.scene, this.camera, null);
    brushMeshes = new Map();
    volumeTime = 0;
    volumeAnimatedMaterials = [];
    localLightObjects = new Map();
    modelRenderObjects = new Map();
    materialTextureCache = new Map();
    animationMixers = new Map();
    instanceAnimationClips = new Map();
    controllerContext;
    renderer;
    runtimeScene = null;
    collisionWorld = null;
    collisionWorldRequestId = 0;
    currentWorld = null;
    currentAdvancedRenderingSettings = null;
    advancedRenderingComposer = null;
    projectAssets = {};
    loadedModelAssets = {};
    loadedImageAssets = {};
    resizeObserver = null;
    animationFrame = 0;
    previousFrameTime = 0;
    container = null;
    activeController = null;
    runtimeMessageHandler = null;
    firstPersonTelemetryHandler = null;
    interactionPromptHandler = null;
    currentRuntimeMessage = null;
    currentFirstPersonTelemetry = null;
    currentInteractionPrompt = null;
    constructor(options = {}) {
        const enableRendering = options.enableRendering ?? true;
        this.scene.add(this.ambientLight);
        this.scene.add(this.sunLight);
        this.scene.add(this.localLightGroup);
        this.scene.add(this.brushGroup);
        this.scene.add(this.modelGroup);
        this.renderer = enableRendering ? new WebGLRenderer({ antialias: true, alpha: true }) : null;
        this.domElement = this.renderer?.domElement ?? document.createElement("canvas");
        if (this.renderer !== null) {
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setClearAlpha(0);
        }
        else {
            this.domElement.className = "runner-canvas__surface";
        }
        this.controllerContext = {
            camera: this.camera,
            domElement: this.domElement,
            getRuntimeScene: () => {
                if (this.runtimeScene === null) {
                    throw new Error("Runtime scene has not been loaded.");
                }
                return this.runtimeScene;
            },
            resolveFirstPersonMotion: (feetPosition, motion, shape) => this.collisionWorld?.resolveFirstPersonMotion(feetPosition, motion, shape) ?? null,
            resolvePlayerVolumeState: (feetPosition) => this.resolvePlayerVolumeState(feetPosition),
            setRuntimeMessage: (message) => {
                if (message === this.currentRuntimeMessage) {
                    return;
                }
                this.currentRuntimeMessage = message;
                this.runtimeMessageHandler?.(message);
            },
            setFirstPersonTelemetry: (telemetry) => {
                this.currentFirstPersonTelemetry = telemetry;
                this.firstPersonTelemetryHandler?.(telemetry);
            }
        };
    }
    resolvePlayerVolumeState(feetPosition) {
        if (this.runtimeScene === null) {
            return {
                inWater: false,
                inFog: false
            };
        }
        const inWater = this.runtimeScene.volumes.water.some((volume) => this.isPointInsideOrientedVolume(feetPosition, volume));
        const inFog = this.runtimeScene.volumes.fog.some((volume) => this.isPointInsideOrientedVolume(feetPosition, volume));
        return {
            inWater,
            inFog
        };
    }
    isPointInsideOrientedVolume(point, volume) {
        this.volumeOffset.set(point.x - volume.center.x, point.y - volume.center.y, point.z - volume.center.z);
        this.volumeInverseRotation
            .setFromEuler(new Euler((volume.rotationDegrees.x * Math.PI) / 180, (volume.rotationDegrees.y * Math.PI) / 180, (volume.rotationDegrees.z * Math.PI) / 180, "XYZ"))
            .invert();
        this.volumeOffset.applyQuaternion(this.volumeInverseRotation);
        const halfX = volume.size.x * 0.5;
        const halfY = volume.size.y * 0.5;
        const halfZ = volume.size.z * 0.5;
        return (Math.abs(this.volumeOffset.x) <= halfX &&
            Math.abs(this.volumeOffset.y) <= halfY &&
            Math.abs(this.volumeOffset.z) <= halfZ);
    }
    mount(container) {
        this.container = container;
        container.appendChild(this.domElement);
        this.domElement.addEventListener("click", this.handleRuntimeClick);
        this.domElement.addEventListener("pointerdown", this.handleRuntimePointerDown);
        this.resize();
        this.resizeObserver = new ResizeObserver(() => {
            this.resize();
        });
        this.resizeObserver.observe(container);
        this.previousFrameTime = performance.now();
        this.render();
    }
    loadScene(runtimeScene) {
        this.runtimeScene = runtimeScene;
        this.currentWorld = runtimeScene.world;
        this.interactionSystem.reset();
        this.setInteractionPrompt(null);
        this.applyWorld();
        this.rebuildLocalLights(runtimeScene.localLights);
        this.rebuildBrushMeshes(runtimeScene.brushes);
        this.rebuildModelInstances(runtimeScene.modelInstances);
        void this.rebuildCollisionWorld(runtimeScene.colliders, runtimeScene.playerCollider);
        this.audioSystem.loadScene(runtimeScene);
    }
    updateAssets(projectAssets, loadedModelAssets, loadedImageAssets, loadedAudioAssets) {
        this.projectAssets = projectAssets;
        this.loadedModelAssets = loadedModelAssets;
        this.loadedImageAssets = loadedImageAssets;
        if (this.currentWorld !== null) {
            this.applyWorld();
        }
        if (this.runtimeScene !== null) {
            this.rebuildModelInstances(this.runtimeScene.modelInstances);
        }
        this.audioSystem.updateAssets(projectAssets, loadedAudioAssets);
    }
    setNavigationMode(mode) {
        if (this.runtimeScene === null) {
            return;
        }
        const nextController = mode === "firstPerson" ? this.firstPersonController : this.orbitVisitorController;
        if (this.activeController?.id === nextController.id) {
            return;
        }
        if (this.activeController === this.firstPersonController && this.currentFirstPersonTelemetry !== null && nextController === this.orbitVisitorController) {
            this.orbitVisitorController.setFocusPoint(this.currentFirstPersonTelemetry.feetPosition);
        }
        this.activeController?.deactivate(this.controllerContext);
        this.interactionSystem.reset();
        this.setInteractionPrompt(null);
        this.activeController = nextController;
        this.activeController.activate(this.controllerContext);
    }
    setRuntimeMessageHandler(handler) {
        this.runtimeMessageHandler = handler;
        this.audioSystem.setRuntimeMessageHandler(handler);
    }
    setFirstPersonTelemetryHandler(handler) {
        this.firstPersonTelemetryHandler = handler;
    }
    setInteractionPromptHandler(handler) {
        this.interactionPromptHandler = handler;
    }
    dispose() {
        if (this.animationFrame !== 0) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = 0;
        }
        this.activeController?.deactivate(this.controllerContext);
        this.activeController = null;
        this.setInteractionPrompt(null);
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.clearLocalLights();
        this.clearBrushMeshes();
        this.clearModelInstances();
        this.collisionWorldRequestId += 1;
        this.clearCollisionWorld();
        this.audioSystem.dispose();
        this.advancedRenderingComposer?.dispose();
        this.advancedRenderingComposer = null;
        this.currentAdvancedRenderingSettings = null;
        if (this.renderer !== null) {
            this.renderer.autoClear = true;
        }
        for (const cachedTexture of this.materialTextureCache.values()) {
            cachedTexture.texture.dispose();
        }
        this.materialTextureCache.clear();
        this.renderer?.dispose();
        this.domElement.removeEventListener("click", this.handleRuntimeClick);
        this.domElement.removeEventListener("pointerdown", this.handleRuntimePointerDown);
        if (this.container !== null && this.container.contains(this.domElement)) {
            this.container.removeChild(this.domElement);
        }
        this.container = null;
    }
    applyWorld() {
        if (this.currentWorld === null) {
            return;
        }
        const world = this.currentWorld;
        this.ambientLight.color.set(world.ambientLight.colorHex);
        this.ambientLight.intensity = world.ambientLight.intensity;
        this.sunLight.color.set(world.sunLight.colorHex);
        this.sunLight.intensity = world.sunLight.intensity;
        this.sunLight.position
            .set(world.sunLight.direction.x, world.sunLight.direction.y, world.sunLight.direction.z)
            .normalize()
            .multiplyScalar(18);
        if (world.background.mode === "image") {
            const texture = this.loadedImageAssets[world.background.assetId]?.texture ?? null;
            this.scene.background = texture;
            this.scene.environment = texture;
            this.scene.environmentIntensity = world.background.environmentIntensity;
        }
        else {
            this.scene.background = null;
            this.scene.environment = null;
            this.scene.environmentIntensity = 1;
        }
        if (this.renderer !== null) {
            configureAdvancedRenderingRenderer(this.renderer, world.advancedRendering);
            this.syncAdvancedRenderingComposer(world.advancedRendering);
        }
        this.applyShadowState();
    }
    async rebuildCollisionWorld(colliders, playerShape) {
        const requestId = ++this.collisionWorldRequestId;
        this.clearCollisionWorld();
        try {
            const nextCollisionWorld = await RapierCollisionWorld.create(colliders, playerShape);
            if (requestId !== this.collisionWorldRequestId) {
                nextCollisionWorld.dispose();
                return;
            }
            this.collisionWorld = nextCollisionWorld;
        }
        catch (error) {
            if (requestId !== this.collisionWorldRequestId) {
                return;
            }
            const message = error instanceof Error ? error.message : "Runner collision initialization failed.";
            this.currentRuntimeMessage = `Runner collision initialization failed: ${message}`;
            this.runtimeMessageHandler?.(this.currentRuntimeMessage);
        }
    }
    clearCollisionWorld() {
        this.collisionWorld?.dispose();
        this.collisionWorld = null;
    }
    syncAdvancedRenderingComposer(settings) {
        if (this.renderer === null) {
            return;
        }
        const shouldUseComposer = settings.enabled;
        const settingsChanged = this.currentAdvancedRenderingSettings === null ||
            !areAdvancedRenderingSettingsEqual(this.currentAdvancedRenderingSettings, settings);
        if (!shouldUseComposer) {
            if (this.advancedRenderingComposer !== null) {
                this.advancedRenderingComposer.dispose();
                this.advancedRenderingComposer = null;
            }
            this.currentAdvancedRenderingSettings = null;
            this.renderer.autoClear = true;
            return;
        }
        if (this.advancedRenderingComposer !== null && !settingsChanged) {
            return;
        }
        if (this.advancedRenderingComposer !== null) {
            this.advancedRenderingComposer.dispose();
        }
        this.advancedRenderingComposer = createAdvancedRenderingComposer(this.renderer, this.scene, this.camera, settings);
        this.currentAdvancedRenderingSettings = cloneAdvancedRenderingSettings(settings);
        this.renderer.autoClear = false;
    }
    applyShadowState() {
        if (this.currentWorld === null) {
            return;
        }
        const advancedRendering = this.currentWorld.advancedRendering;
        const shadowsEnabled = advancedRendering.enabled && advancedRendering.shadows.enabled;
        applyAdvancedRenderingLightShadowFlags(this.sunLight, advancedRendering);
        for (const renderGroup of this.localLightObjects.values()) {
            applyAdvancedRenderingLightShadowFlags(renderGroup, advancedRendering);
        }
        for (const mesh of this.brushMeshes.values()) {
            applyAdvancedRenderingRenderableShadowFlags(mesh, shadowsEnabled);
        }
        for (const renderGroup of this.modelRenderObjects.values()) {
            applyAdvancedRenderingRenderableShadowFlags(renderGroup, shadowsEnabled);
        }
    }
    rebuildLocalLights(localLights) {
        this.clearLocalLights();
        for (const pointLight of localLights.pointLights) {
            const renderObjects = this.createPointLightRuntimeObjects(pointLight);
            this.localLightGroup.add(renderObjects.group);
            this.localLightObjects.set(pointLight.entityId, renderObjects.group);
        }
        for (const spotLight of localLights.spotLights) {
            const renderObjects = this.createSpotLightRuntimeObjects(spotLight);
            this.localLightGroup.add(renderObjects.group);
            this.localLightObjects.set(spotLight.entityId, renderObjects.group);
        }
        this.applyShadowState();
    }
    createPointLightRuntimeObjects(pointLight) {
        const group = new Group();
        const light = new PointLight(pointLight.colorHex, pointLight.intensity, pointLight.distance);
        group.position.set(pointLight.position.x, pointLight.position.y, pointLight.position.z);
        light.position.set(0, 0, 0);
        group.add(light);
        return {
            group
        };
    }
    createSpotLightRuntimeObjects(spotLight) {
        const group = new Group();
        const light = new SpotLight(spotLight.colorHex, spotLight.intensity, spotLight.distance, (spotLight.angleDegrees * Math.PI) / 180, 0.18, 1);
        const direction = new Vector3(spotLight.direction.x, spotLight.direction.y, spotLight.direction.z).normalize();
        const orientation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction);
        group.position.set(spotLight.position.x, spotLight.position.y, spotLight.position.z);
        group.quaternion.copy(orientation);
        light.position.set(0, 0, 0);
        light.target.position.set(0, 1, 0);
        group.add(light);
        group.add(light.target);
        return {
            group
        };
    }
    rebuildBrushMeshes(brushes) {
        this.clearBrushMeshes();
        const volumeRenderPaths = this.currentWorld === null ? { fog: "performance", water: "performance" } : resolveBoxVolumeRenderPaths(this.currentWorld.advancedRendering);
        for (const brush of brushes) {
            const geometry = buildBoxBrushDerivedMeshData(brush).geometry;
            const materials = [
                this.createFaceMaterial(brush, "posX", brush.faces.posX.material, volumeRenderPaths),
                this.createFaceMaterial(brush, "negX", brush.faces.negX.material, volumeRenderPaths),
                this.createFaceMaterial(brush, "posY", brush.faces.posY.material, volumeRenderPaths),
                this.createFaceMaterial(brush, "negY", brush.faces.negY.material, volumeRenderPaths),
                this.createFaceMaterial(brush, "posZ", brush.faces.posZ.material, volumeRenderPaths),
                this.createFaceMaterial(brush, "negZ", brush.faces.negZ.material, volumeRenderPaths)
            ];
            const mesh = new Mesh(geometry, materials);
            mesh.position.set(brush.center.x, brush.center.y, brush.center.z);
            mesh.rotation.set((brush.rotationDegrees.x * Math.PI) / 180, (brush.rotationDegrees.y * Math.PI) / 180, (brush.rotationDegrees.z * Math.PI) / 180);
            this.brushGroup.add(mesh);
            this.brushMeshes.set(brush.id, mesh);
        }
        this.applyShadowState();
    }
    rebuildModelInstances(modelInstances) {
        this.clearModelInstances();
        for (const modelInstance of modelInstances) {
            const asset = this.projectAssets[modelInstance.assetId];
            const loadedAsset = this.loadedModelAssets[modelInstance.assetId];
            const renderGroup = createModelInstanceRenderGroup({
                id: modelInstance.instanceId,
                kind: "modelInstance",
                assetId: modelInstance.assetId,
                name: modelInstance.name,
                position: modelInstance.position,
                rotationDegrees: modelInstance.rotationDegrees,
                scale: modelInstance.scale,
                collision: {
                    mode: "none",
                    visible: false
                }
            }, asset, loadedAsset, false);
            this.modelGroup.add(renderGroup);
            this.modelRenderObjects.set(modelInstance.instanceId, renderGroup);
            if (loadedAsset?.animations && loadedAsset.animations.length > 0) {
                const mixer = new AnimationMixer(renderGroup);
                this.animationMixers.set(modelInstance.instanceId, mixer);
                this.instanceAnimationClips.set(modelInstance.instanceId, loadedAsset.animations);
                if (modelInstance.animationAutoplay === true && modelInstance.animationClipName) {
                    const clip = AnimationClip.findByName(loadedAsset.animations, modelInstance.animationClipName);
                    if (clip) {
                        mixer.clipAction(clip).play();
                    }
                }
            }
        }
        this.applyShadowState();
    }
    createFaceMaterial(brush, faceId, material, volumeRenderPaths) {
        if (brush.volume.mode === "water") {
            if (volumeRenderPaths.water === "quality") {
                return this.createWaterQualityMaterial(brush.volume.water, faceId);
            }
            const baseOpacity = Math.max(0.05, Math.min(1, brush.volume.water.surfaceOpacity));
            return new MeshBasicMaterial({
                color: brush.volume.water.colorHex,
                transparent: true,
                opacity: faceId === "posY" ? Math.min(1, baseOpacity + 0.18) : baseOpacity * 0.5,
                depthWrite: false
            });
        }
        if (brush.volume.mode === "fog") {
            if (volumeRenderPaths.fog === "quality") {
                return this.createFogQualityMaterial(brush.volume.fog);
            }
            const densityOpacity = Math.max(0.06, Math.min(0.72, brush.volume.fog.density * 0.8 + 0.08));
            return new MeshBasicMaterial({
                color: brush.volume.fog.colorHex,
                transparent: true,
                opacity: densityOpacity,
                depthWrite: false
            });
        }
        if (material === null) {
            return new MeshStandardMaterial({
                color: FALLBACK_FACE_COLOR,
                roughness: 0.9,
                metalness: 0.05
            });
        }
        return new MeshStandardMaterial({
            color: 0xffffff,
            map: this.getOrCreateTexture(material),
            roughness: 0.92,
            metalness: 0.02
        });
    }
    createWaterQualityMaterial(water, faceId) {
        const isTopFace = faceId === "posY";
        const baseOpacity = Math.max(0.05, Math.min(1, water.surfaceOpacity));
        const opacity = isTopFace ? Math.min(1, baseOpacity + 0.2) : baseOpacity * 0.45;
        const waveStrength = water.waveStrength;
        const hex = water.colorHex.replace("#", "");
        const cr = parseInt(hex.substring(0, 2), 16) / 255;
        const cg = parseInt(hex.substring(2, 4), 16) / 255;
        const cb = parseInt(hex.substring(4, 6), 16) / 255;
        const vertexShader = `
      uniform float time;
      uniform float waveAmp;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      varying vec4 vScreenPos;
      varying float vDepth;
      vec3 gerstnerWave(vec4 wave, vec3 p) {
        float steepness = wave.z;
        float wavelength = wave.w;
        float k = 2.0 * 3.14159 / wavelength;
        float c = sqrt(9.8 / k);
        vec2 d = normalize(wave.xy);
        float f = k * (dot(d, p.xz) - c * time);
        float a = steepness / k;
        return vec3(
          d.x * a * cos(f),
          a * sin(f),
          d.y * a * cos(f)
        );
      }
      void main() {
        vUv = uv;
        vec3 pos = position;
        float upFactor = max(0.0, normal.y);
        if (upFactor > 0.9) {
          vec3 gridPoint = pos;
          vec3 wave1 = gerstnerWave(vec4(1.0, 0.0, 0.25, 60.0), gridPoint);
          vec3 wave2 = gerstnerWave(vec4(0.2, 0.86, 0.15, 31.0), gridPoint);
          vec3 wave3 = gerstnerWave(vec4(0.2, 0.86, 0.06, 18.0), gridPoint);
          pos += (wave1 + wave2 + wave3) * waveAmp * 0.5;
          vNormal = normalize(normalMatrix * normalize(normal + vec3(
            -(wave1.x + wave2.x + wave3.x) * 2.0,
            1.0,
            -(wave1.z + wave2.z + wave3.z) * 2.0
          )));
        } else {
          vNormal = normalize(normalMatrix * normal);
        }
        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        vScreenPos = projectionMatrix * viewMatrix * worldPos;
        vDepth = -vScreenPos.z;
        gl_Position = vScreenPos;
      }
    `;
        const fragmentShader = `
      precision highp float;
      uniform vec3 waterColor;
      uniform float surfaceOpacity;
      uniform float waveStrength;
      uniform float time;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      varying vec4 vScreenPos;
      varying float vDepth;
      float noise(vec3 p) {
        vec3 pi = floor(p);
        vec3 pf = p - pi;
        pf *= pf * (3.0 - 2.0 * pf);
        float n = pi.x + pi.y * 57.0 + pi.z * 113.0;
        return mix(
          mix(mix(sin(n) * 43758.5453, sin(n + 1.0) * 43758.5453, pf.x),
              mix(sin(n + 57.0) * 43758.5453, sin(n + 58.0) * 43758.5453, pf.x), pf.y),
          mix(mix(sin(n + 113.0) * 43758.5453, sin(n + 114.0) * 43758.5453, pf.x),
              mix(sin(n + 170.0) * 43758.5453, sin(n + 171.0) * 43758.5453, pf.x), pf.y),
          pf.z
        );
      }
      void main() {
        vec3 n1 = normalize(vec3(
          noise(vWorldPos + time * 0.3) - 0.5,
          0.8,
          noise(vWorldPos * 1.5 + time * 0.25) - 0.5
        ));
        vec3 n2 = normalize(vec3(
          noise(vWorldPos * 0.7 - time * 0.2) - 0.5,
          0.9,
          noise(vWorldPos * 2.2 - time * 0.18) - 0.5
        ));
        vec3 surfaceNormal = normalize(mix(vNormal, n1, 0.4) + n2 * 0.3);
        vec3 viewDir = normalize(vViewDir);
        float vDotN = max(0.0, dot(viewDir, surfaceNormal));
        float fresnel = pow(1.0 - vDotN, 3.0) * 0.8 + 0.2;
        vec3 reflection = reflect(-viewDir, surfaceNormal);
        float specular = pow(max(0.0, dot(reflection, normalize(vec3(0.3, 0.8, 0.5)))), 16.0) * fresnel * 0.6;
        float depthFade = 1.0 / (1.0 + vDepth * 0.008);
        vec3 baseWaterColor = waterColor;
        vec3 environmentTint = vec3(0.85, 0.9, 1.0);
        baseWaterColor = mix(baseWaterColor, environmentTint, fresnel * 0.12);
        vec3 waterWithDepth = baseWaterColor * mix(0.3, 1.0, depthFade);
        float foamPeaks = smoothstep(0.6, 0.85, fresnel) * sin(vWorldPos.x * 2.0 + time) * waveStrength;
        foamPeaks = clamp(foamPeaks, 0.0, 0.2);
        float foamDetail = abs(noise(vWorldPos * 3.0 + time * 0.4)) * 0.15;
        vec2 screenUv = vScreenPos.xy / vScreenPos.w * 0.5 + 0.5;
        float depthGradient = abs(sin(vWorldPos.x * 0.5) - sin(vWorldPos.x * 0.5 + 0.3)) * waveStrength;
        float foamInteraction = smoothstep(0.2, 0.7, depthGradient) * 0.25;
        float totalFoam = min(0.4, foamPeaks + foamDetail + foamInteraction);
        vec3 foamColor = vec3(1.0);
        vec3 waterWithFoam = mix(waterWithDepth, foamColor, totalFoam);
        waterWithFoam += specular * vec3(1.0);
        float alpha = surfaceOpacity + fresnel * 0.25 + totalFoam * 0.2;
        alpha = clamp(alpha, 0.08, 1.0);
        gl_FragColor = vec4(waterWithFoam, alpha);
      }
    `;
        const mat = new ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                time: { value: this.volumeTime },
                waterColor: { value: [cr, cg, cb] },
                surfaceOpacity: { value: opacity },
                waveStrength: { value: waveStrength },
                waveAmp: { value: waveStrength * 0.08 }
            },
            transparent: true,
            depthWrite: false,
            side: 2
        });
        this.volumeAnimatedMaterials.push(mat);
        return mat;
    }

    createFogQualityMaterial(fog) {
        const hex = fog.colorHex.replace("#", "");
        const cr = parseInt(hex.substring(0, 2), 16) / 255;
        const cg = parseInt(hex.substring(2, 4), 16) / 255;
        const cb = parseInt(hex.substring(4, 6), 16) / 255;
        const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
        const fragmentShader = `
      uniform vec3 fogColor;
      uniform float fogDensity;
      uniform float time;
      varying vec2 vUv;
      void main() {
        vec2 dist = abs(vUv - 0.5) * 2.0;
        float edgeFade = 1.0 - smoothstep(0.4, 1.0, max(dist.x, dist.y));
        float drift = sin(vUv.x * 4.5 + time * 0.28) * sin(vUv.y * 3.2 + time * 0.22);
        float variation = 0.82 + drift * 0.18;
        float alpha = fogDensity * edgeFade * variation;
        alpha = clamp(alpha, 0.0, 0.88);
        vec3 color = mix(fogColor, vec3(1.0), (1.0 - edgeFade) * 0.09);
        gl_FragColor = vec4(color, alpha);
      }
    `;
        const mat = new ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                fogColor: { value: [cr, cg, cb] },
                fogDensity: { value: Math.min(0.9, fog.density + 0.12) },
                time: { value: this.volumeTime }
            },
            transparent: true,
            depthWrite: false,
            side: 2
        });
        this.volumeAnimatedMaterials.push(mat);
        return mat;
    }
    getOrCreateTexture(material) {
        const signature = createStarterMaterialSignature(material);
        const cachedTexture = this.materialTextureCache.get(material.id);
        if (cachedTexture !== undefined && cachedTexture.signature === signature) {
            return cachedTexture.texture;
        }
        cachedTexture?.texture.dispose();
        const texture = createStarterMaterialTexture(material);
        this.materialTextureCache.set(material.id, {
            signature,
            texture
        });
        return texture;
    }
    clearLocalLights() {
        for (const renderGroup of this.localLightObjects.values()) {
            this.localLightGroup.remove(renderGroup);
        }
        this.localLightObjects.clear();
    }
    clearBrushMeshes() {
        for (const mesh of this.brushMeshes.values()) {
            this.brushGroup.remove(mesh);
            mesh.geometry.dispose();
            for (const material of mesh.material) {
                material.dispose();
            }
        }
        this.brushMeshes.clear();
        this.volumeAnimatedMaterials.length = 0;
    }
    clearModelInstances() {
        for (const mixer of this.animationMixers.values()) {
            mixer.stopAllAction();
        }
        this.animationMixers.clear();
        this.instanceAnimationClips.clear();
        for (const renderGroup of this.modelRenderObjects.values()) {
            this.modelGroup.remove(renderGroup);
            disposeModelInstance(renderGroup);
        }
        this.modelRenderObjects.clear();
    }
    resize() {
        if (this.container === null) {
            return;
        }
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) {
            return;
        }
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.domElement.width = width;
        this.domElement.height = height;
        this.renderer?.setSize(width, height, false);
        this.advancedRenderingComposer?.setSize(width, height);
    }
    render = () => {
        this.animationFrame = window.requestAnimationFrame(this.render);
        const now = performance.now();
        const dt = Math.min((now - this.previousFrameTime) / 1000, 1 / 20);
        this.previousFrameTime = now;
        this.activeController?.update(dt);
        this.audioSystem.updateListenerTransform();
        this.volumeTime += dt;
        for (const mat of this.volumeAnimatedMaterials) {
            mat.uniforms["time"].value = this.volumeTime;
        }
        for (const mixer of this.animationMixers.values()) {
            mixer.update(dt);
        }
        if (this.runtimeScene !== null && this.activeController === this.firstPersonController && this.currentFirstPersonTelemetry !== null) {
            this.interactionSystem.updatePlayerPosition(this.currentFirstPersonTelemetry.feetPosition, this.runtimeScene, this.createInteractionDispatcher());
            this.camera.getWorldDirection(this.cameraForward);
            this.setInteractionPrompt(this.interactionSystem.resolveClickInteractionPrompt(this.currentFirstPersonTelemetry.eyePosition, {
                x: this.cameraForward.x,
                y: this.cameraForward.y,
                z: this.cameraForward.z
            }, this.runtimeScene));
        }
        else {
            this.setInteractionPrompt(null);
        }
        if (this.advancedRenderingComposer !== null) {
            this.advancedRenderingComposer.render(dt);
            return;
        }
        this.renderer?.render(this.scene, this.camera);
    };
    applyTeleportPlayerAction(target) {
        this.firstPersonController.teleportTo(target.position, target.yawDegrees);
    }
    applyToggleBrushVisibilityAction(brushId, visible) {
        const mesh = this.brushMeshes.get(brushId);
        if (mesh === undefined) {
            return;
        }
        mesh.visible = visible ?? !mesh.visible;
    }
    applyPlayAnimationAction(instanceId, clipName, loop) {
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
        // LoopRepeat is the three.js default; LoopOnce plays the clip a single time then stops.
        const action = mixer.clipAction(clip);
        action.loop = loop === false ? LoopOnce : LoopRepeat;
        action.clampWhenFinished = loop === false;
        mixer.stopAllAction();
        action.reset().play();
    }
    applyStopAnimationAction(instanceId) {
        const mixer = this.animationMixers.get(instanceId);
        if (!mixer) {
            console.warn(`stopAnimation: no mixer for instance ${instanceId}`);
            return;
        }
        mixer.stopAllAction();
    }
    createInteractionDispatcher() {
        return {
            teleportPlayer: (target) => {
                this.applyTeleportPlayerAction(target);
            },
            toggleBrushVisibility: (brushId, visible) => {
                this.applyToggleBrushVisibilityAction(brushId, visible);
            },
            playAnimation: (instanceId, clipName, loop) => {
                this.applyPlayAnimationAction(instanceId, clipName, loop);
            },
            stopAnimation: (instanceId) => {
                this.applyStopAnimationAction(instanceId);
            },
            playSound: (soundEmitterId, link) => {
                this.audioSystem.playSound(soundEmitterId, link);
            },
            stopSound: (soundEmitterId) => {
                this.audioSystem.stopSound(soundEmitterId);
            }
        };
    }
    setInteractionPrompt(prompt) {
        if (this.currentInteractionPrompt?.sourceEntityId === prompt?.sourceEntityId &&
            this.currentInteractionPrompt?.prompt === prompt?.prompt &&
            this.currentInteractionPrompt?.distance === prompt?.distance &&
            this.currentInteractionPrompt?.range === prompt?.range) {
            return;
        }
        this.currentInteractionPrompt = prompt;
        this.interactionPromptHandler?.(prompt);
    }
    handleRuntimeClick = () => {
        this.audioSystem.handleUserGesture();
        if (this.runtimeScene === null || this.activeController !== this.firstPersonController || this.currentInteractionPrompt === null) {
            return;
        }
        this.interactionSystem.dispatchClickInteraction(this.currentInteractionPrompt.sourceEntityId, this.runtimeScene, this.createInteractionDispatcher());
    };
    handleRuntimePointerDown = () => {
        this.audioSystem.handleUserGesture();
    };
}
