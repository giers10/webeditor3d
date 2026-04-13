import {
  BoxGeometry,
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry
} from "three";

const SOUND_EMITTER_CABINET_SIZE = {
  x: 0.38,
  y: 0.5,
  z: 0.18
};

const SOUND_EMITTER_FRONT_OFFSET = 0.1;
const SOUND_EMITTER_TWEETER_RADIUS = 0.045;
const SOUND_EMITTER_TWEETER_Y = 0.15;
const SOUND_EMITTER_WOOFER_RADIUS = 0.11;
const SOUND_EMITTER_WOOFER_Y = -0.08;

function createSpeakerMaterial(color: number, selected: boolean, emissiveIntensity: number, roughness: number, metalness: number) {
  return new MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: selected ? emissiveIntensity : emissiveIntensity * 0.35,
    roughness,
    metalness
  });
}

export function createSoundEmitterMarkerMeshes(markerColor: number, selected: boolean): Mesh[] {
  const cabinet = new Mesh(
    new BoxGeometry(SOUND_EMITTER_CABINET_SIZE.x, SOUND_EMITTER_CABINET_SIZE.y, SOUND_EMITTER_CABINET_SIZE.z),
    createSpeakerMaterial(0x23272e, selected, 0.08, 0.88, 0.02)
  );

  const tweeterRing = new Mesh(
    new TorusGeometry(SOUND_EMITTER_TWEETER_RADIUS, 0.012, 8, 18),
    createSpeakerMaterial(markerColor, selected, 0.22, 0.4, 0.04)
  );
  tweeterRing.rotation.x = Math.PI * 0.5;
  tweeterRing.position.set(0, SOUND_EMITTER_TWEETER_Y, SOUND_EMITTER_FRONT_OFFSET);

  const tweeterCone = new Mesh(
    new CylinderGeometry(SOUND_EMITTER_TWEETER_RADIUS * 0.58, SOUND_EMITTER_TWEETER_RADIUS * 0.58, 0.028, 18),
    createSpeakerMaterial(0x14171c, selected, 0.08, 0.68, 0.01)
  );
  tweeterCone.rotation.x = Math.PI * 0.5;
  tweeterCone.position.set(0, SOUND_EMITTER_TWEETER_Y, SOUND_EMITTER_FRONT_OFFSET + 0.006);

  const wooferRing = new Mesh(
    new TorusGeometry(SOUND_EMITTER_WOOFER_RADIUS, 0.016, 8, 20),
    createSpeakerMaterial(markerColor, selected, 0.22, 0.42, 0.04)
  );
  wooferRing.rotation.x = Math.PI * 0.5;
  wooferRing.position.set(0, SOUND_EMITTER_WOOFER_Y, SOUND_EMITTER_FRONT_OFFSET);

  const wooferCone = new Mesh(
    new CylinderGeometry(SOUND_EMITTER_WOOFER_RADIUS * 0.6, SOUND_EMITTER_WOOFER_RADIUS * 0.6, 0.032, 20),
    createSpeakerMaterial(0x14171c, selected, 0.08, 0.72, 0.01)
  );
  wooferCone.rotation.x = Math.PI * 0.5;
  wooferCone.position.set(0, SOUND_EMITTER_WOOFER_Y, SOUND_EMITTER_FRONT_OFFSET + 0.007);

  return [cabinet, tweeterRing, tweeterCone, wooferRing, wooferCone];
}

export function createNpcMarkerMeshes(
  markerColor: number,
  selected: boolean
): Mesh[] {
  const footing = new Mesh(
    new TorusGeometry(0.24, 0.03, 8, 20),
    createSpeakerMaterial(markerColor, selected, 0.18, 0.45, 0.04)
  );
  footing.rotation.x = Math.PI * 0.5;
  footing.position.y = 0.04;

  const torso = new Mesh(
    new CylinderGeometry(0.1, 0.13, 0.42, 14),
    createSpeakerMaterial(0x20252d, selected, 0.06, 0.78, 0.02)
  );
  torso.position.y = 0.26;

  const shoulders = new Mesh(
    new TorusGeometry(0.17, 0.024, 8, 18),
    createSpeakerMaterial(markerColor, selected, 0.2, 0.42, 0.04)
  );
  shoulders.rotation.x = Math.PI * 0.5;
  shoulders.position.y = 0.34;

  const head = new Mesh(
    new SphereGeometry(0.11, 16, 12),
    createSpeakerMaterial(markerColor, selected, 0.24, 0.34, 0.03)
  );
  head.position.y = 0.58;

  const sightLine = new Mesh(
    new BoxGeometry(0.04, 0.04, 0.2),
    createSpeakerMaterial(markerColor, selected, 0.2, 0.38, 0.04)
  );
  sightLine.position.set(0, 0.48, 0.18);

  return [footing, torso, shoulders, head, sightLine];
}
