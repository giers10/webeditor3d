import { Vector3 } from "three";
const MIN_DISTANCE = 2;
const MAX_DISTANCE = 48;
const MIN_PITCH = 0.15;
const MAX_PITCH = Math.PI * 0.48;
function clampDistance(distance) {
    return Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, distance));
}
function clampPitch(pitchRadians) {
    return Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitchRadians));
}
function cloneVec3(vector) {
    return {
        x: vector.x,
        y: vector.y,
        z: vector.z
    };
}
export class OrbitVisitorNavigationController {
    id = "orbitVisitor";
    context = null;
    lookAtVector = new Vector3();
    target = {
        x: 0,
        y: 0,
        z: 0
    };
    distance = 8;
    yawRadians = Math.PI * 0.25;
    pitchRadians = Math.PI * 0.35;
    dragging = false;
    lastPointerClientX = 0;
    lastPointerClientY = 0;
    initializedFromScene = false;
    activate(ctx) {
        this.context = ctx;
        if (!this.initializedFromScene) {
            const runtimeScene = ctx.getRuntimeScene();
            const focusPoint = runtimeScene.playerStart?.position ?? runtimeScene.sceneBounds?.center ?? this.target;
            const focusDistance = runtimeScene.sceneBounds
                ? Math.max(runtimeScene.sceneBounds.size.x, runtimeScene.sceneBounds.size.y, runtimeScene.sceneBounds.size.z) * 1.1
                : 8;
            this.target = cloneVec3(focusPoint);
            this.distance = clampDistance(focusDistance);
            this.initializedFromScene = true;
        }
        ctx.domElement.addEventListener("pointerdown", this.handlePointerDown);
        ctx.domElement.addEventListener("wheel", this.handleWheel, { passive: false });
        ctx.domElement.addEventListener("contextmenu", this.handleContextMenu);
        window.addEventListener("pointermove", this.handlePointerMove);
        window.addEventListener("pointerup", this.handlePointerUp);
        ctx.setRuntimeMessage("Orbit Visitor active. Drag to orbit around the scene and use the mouse wheel to zoom.");
        ctx.setFirstPersonTelemetry(null);
        this.updateCameraTransform();
    }
    deactivate(ctx) {
        ctx.domElement.removeEventListener("pointerdown", this.handlePointerDown);
        ctx.domElement.removeEventListener("wheel", this.handleWheel);
        ctx.domElement.removeEventListener("contextmenu", this.handleContextMenu);
        window.removeEventListener("pointermove", this.handlePointerMove);
        window.removeEventListener("pointerup", this.handlePointerUp);
        ctx.setRuntimeMessage(null);
        this.dragging = false;
        this.context = null;
    }
    update(_dt) {
        void _dt;
        this.updateCameraTransform();
    }
    setFocusPoint(target) {
        this.target = cloneVec3(target);
        this.updateCameraTransform();
    }
    updateCameraTransform() {
        if (this.context === null) {
            return;
        }
        const horizontalDistance = Math.cos(this.pitchRadians) * this.distance;
        const cameraPosition = {
            x: this.target.x + Math.sin(this.yawRadians) * horizontalDistance,
            y: this.target.y + Math.sin(this.pitchRadians) * this.distance,
            z: this.target.z + Math.cos(this.yawRadians) * horizontalDistance
        };
        this.context.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
        this.lookAtVector.set(this.target.x, this.target.y, this.target.z);
        this.context.camera.lookAt(this.lookAtVector);
    }
    handlePointerDown = (event) => {
        if (event.button !== 0) {
            return;
        }
        this.dragging = true;
        this.lastPointerClientX = event.clientX;
        this.lastPointerClientY = event.clientY;
    };
    handlePointerMove = (event) => {
        if (!this.dragging) {
            return;
        }
        const deltaX = event.clientX - this.lastPointerClientX;
        const deltaY = event.clientY - this.lastPointerClientY;
        this.lastPointerClientX = event.clientX;
        this.lastPointerClientY = event.clientY;
        this.yawRadians -= deltaX * 0.008;
        this.pitchRadians = clampPitch(this.pitchRadians + deltaY * 0.008);
    };
    handlePointerUp = () => {
        this.dragging = false;
    };
    handleWheel = (event) => {
        event.preventDefault();
        this.distance = clampDistance(this.distance + event.deltaY * 0.01);
    };
    handleContextMenu = (event) => {
        event.preventDefault();
    };
}
