import { Group, MathUtils } from "three";

import { instantiateModelTemplate } from "../assets/gltf-model-import";
import { disposeModelInstance } from "../assets/model-instance-rendering";
import type { Terrain } from "../document/terrains";
import { applyRendererRenderCategoryFromMaterial } from "../rendering/render-layers";

import { loadBundledSplineCorridorModelTemplate } from "./bundled-spline-corridor-model-loader";
import {
  deriveSplineRepeaterInstances,
  type SplineRepeaterPathLike
} from "./spline-repeaters";

interface SplineRepeaterRendererInput {
  paths: readonly SplineRepeaterPathLike[];
  terrains: readonly Terrain[];
}

interface SplineRepeaterRendererOptions {
  onRebuilt?: () => void;
  onDiagnostic?: (message: string) => void;
}

export class SplineRepeaterRenderer {
  readonly group = new Group();

  private requestId = 0;
  private activeGroup: Group | null = null;
  private readonly onRebuilt: (() => void) | undefined;
  private readonly onDiagnostic: ((message: string) => void) | undefined;

  constructor(options: SplineRepeaterRendererOptions = {}) {
    this.group.name = "splineRepeaters";
    this.group.userData.nonPickable = true;
    this.onRebuilt = options.onRebuilt;
    this.onDiagnostic = options.onDiagnostic;
  }

  sync(input: SplineRepeaterRendererInput) {
    const requestId = this.requestId + 1;
    this.requestId = requestId;
    void this.rebuildAsync(requestId, input);
  }

  clear() {
    this.requestId += 1;
    this.clearActiveGroup();
  }

  dispose() {
    this.clear();
  }

  private clearActiveGroup() {
    if (this.activeGroup === null) {
      return;
    }

    this.group.remove(this.activeGroup);
    disposeModelInstance(this.activeGroup);
    this.activeGroup = null;
  }

  private emitDiagnostic(message: string) {
    if (this.onDiagnostic !== undefined) {
      this.onDiagnostic(message);
      return;
    }

    console.warn(message);
  }

  private async rebuildAsync(
    requestId: number,
    input: SplineRepeaterRendererInput
  ) {
    const instances = input.paths.flatMap((path) =>
      deriveSplineRepeaterInstances({
        path,
        terrains: input.terrains
      })
    );
    const nextGroup = new Group();
    nextGroup.name = "splineRepeaterInstances";
    nextGroup.userData.nonPickable = true;

    for (const instance of instances) {
      let template: Group;

      try {
        template = await loadBundledSplineCorridorModelTemplate(
          instance.asset.bundledPath
        );
      } catch (error) {
        this.emitDiagnostic(
          error instanceof Error
            ? error.message
            : `Bundled spline corridor model failed to load from ${instance.asset.bundledPath}.`
        );
        continue;
      }

      if (requestId !== this.requestId) {
        disposeModelInstance(nextGroup);
        return;
      }

      const model = instantiateModelTemplate(template);
      model.name = `SplineRepeater:${instance.asset.id}`;
      model.position.set(
        instance.position.x,
        instance.position.y,
        instance.position.z
      );
      model.rotation.set(0, MathUtils.degToRad(instance.yawDegrees), 0);
      model.scale.setScalar(instance.scale);
      model.userData.nonPickable = true;
      model.userData.pathId = instance.pathId;
      model.userData.pathRepeaterId = instance.repeaterId;
      model.userData.splineCorridorAssetId = instance.asset.id;
      applyRendererRenderCategoryFromMaterial(model);
      nextGroup.add(model);
    }

    if (requestId !== this.requestId) {
      disposeModelInstance(nextGroup);
      return;
    }

    this.clearActiveGroup();

    if (nextGroup.children.length === 0) {
      disposeModelInstance(nextGroup);
      this.onRebuilt?.();
      return;
    }

    this.activeGroup = nextGroup;
    this.group.add(nextGroup);
    this.onRebuilt?.();
  }
}
