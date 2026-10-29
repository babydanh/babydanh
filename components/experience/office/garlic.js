// One garlic-bulb resident: a round bulb with a pointy tip and two small cheeks, big glossy eyes, round hands and feet.
// Geometry and most materials are shared by every resident; only skin and the tip colour differ.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const { lerp } = THREE.MathUtils;
const sin = Math.sin;
let shared = null;

// Widest low down, narrowing to a tip, with soft clove ridges.
function bulbGeometry() {
  const profile = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    profile.push(new THREE.Vector2(0.19 * Math.pow(Math.max(0, sin(Math.PI * Math.pow(t, 0.75))), 0.85), 0.02 + t * 0.5));
  }
  const g = new THREE.LatheGeometry(profile, 30);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const ridge = 1 + 0.04 * Math.cos(6 * Math.atan2(z, x));
    pos.setX(i, x * ridge);
    pos.setZ(i, z * ridge);
  }
  g.computeVertexNormals();
  return g;
}

function getShared() {
  if (shared) return shared;
  const sphere = (r) => new THREE.SphereGeometry(r, 14, 10);
  const cheek = (side) => sphere(0.092).translate(0.065 * side, 0.11, -0.08);
  shared = {
    body: mergeGeometries([bulbGeometry(), cheek(-1), cheek(1)]),
    bud: sphere(0.026),
    eye: sphere(0.048),
    bigShine: sphere(0.016),
    smallShine: sphere(0.008),
    hand: sphere(0.042),
    foot: sphere(0.048),
    mouth: sphere(0.028),
    blush: new THREE.CircleGeometry(0.03, 12),
    brow: new THREE.BoxGeometry(0.044, 0.011, 0.011),
    smile: new THREE.TorusGeometry(0.013, 0.0036, 6, 10, Math.PI),
    shadow: new THREE.CircleGeometry(0.19, 18),
    eyeMat: new THREE.MeshStandardMaterial({ color: 0x0c0609, roughness: 0.12, metalness: 0.1 }),
    shineMat: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    mouthMat: new THREE.MeshStandardMaterial({ color: 0x8a2234, roughness: 0.5 }),
    smileMat: new THREE.MeshBasicMaterial({ color: 0x5a1d2b }),
    blushMat: new THREE.MeshBasicMaterial({ color: 0xff7f9f, transparent: true, opacity: 0.55, depthWrite: false }),
    browMat: new THREE.MeshStandardMaterial({ color: 0x3a1a14, roughness: 0.6 }),
    handMat: new THREE.MeshStandardMaterial({ color: 0xffe3d6, roughness: 0.5 }),
    shadowMat: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false }),
  };
  return shared;
}

const mesh = (geometry, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
};

function buildFace(s) {
  const face = new THREE.Group();
  const eyes = new THREE.Group();
  eyes.position.set(0, 0.28, 0.16);
  for (const side of [-1, 1]) {
    const eye = mesh(s.eye, s.eyeMat, 0.075 * side);
    eye.scale.set(1, 1.08, 0.5);
    eye.add(mesh(s.bigShine, s.shineMat, 0.016, 0.02, 0.05), mesh(s.smallShine, s.shineMat, -0.016, -0.018, 0.048));
    eyes.add(eye);
  }
  const brows = [-1, 1].map((side) => mesh(s.brow, s.browMat, 0.075 * side, 0.352, 0.115));
  const smile = new THREE.Group();
  smile.position.set(0, 0.238, 0.182);
  for (const side of [-1, 1]) {
    const arc = mesh(s.smile, s.smileMat, 0.013 * side);
    arc.rotation.z = Math.PI;
    smile.add(arc);
  }
  const mouth = mesh(s.mouth, s.mouthMat, 0, 0.228, 0.176);
  mouth.scale.set(1.1, 0.8, 0.5);
  mouth.visible = false;
  face.add(eyes, smile, mouth, ...brows);
  for (const side of [-1, 1]) {
    const blush = mesh(s.blush, s.blushMat, 0.12 * side, 0.235, 0.148);
    blush.rotation.y = 0.75 * side;
    face.add(blush);
  }
  return { face, eyes, brows, smile, mouth };
}

export function createGarlic(leafColor, skinColor) {
  const s = getShared();
  const skin = new THREE.MeshStandardMaterial({ color: skinColor, emissive: 0x2a1c24, emissiveIntensity: 0.5, roughness: 0.55, side: THREE.DoubleSide });
  const tip = new THREE.MeshStandardMaterial({ color: leafColor, emissive: leafColor, emissiveIntensity: 0.9, roughness: 0.4 });
  const root = new THREE.Group();
  const shadow = mesh(s.shadow, s.shadowMat, 0, 0.003, 0);
  shadow.rotation.x = -Math.PI / 2;
  const body = new THREE.Group();
  const face = buildFace(s);
  const hands = [-1, 1].map((side) => mesh(s.hand, s.handMat, 0.235 * side, 0.16, 0.03));
  const feet = [-1, 1].map((side) => {
    const foot = mesh(s.foot, s.handMat, 0.075 * side, 0.03, 0.04);
    foot.scale.set(1, 0.7, 1.3);
    return foot;
  });
  body.add(mesh(s.body, skin), mesh(s.bud, tip, 0, 0.535, 0), face.face, ...hands);
  root.add(shadow, body, ...feet);
  // Parts too small to see from across the desk; the office hides them while the camera is far away.
  const fine = [face.face, ...hands, ...feet, shadow];
  return { root, body, hands, feet, shadow, fine, ...face };
}

// Hand height, hand reach and which hand moves, for what the resident is doing.
function handTargets(act, t, k, walk, w) {
  const bob = walk ? 0.015 * w : 0;
  const out = { left: 0.15 + bob, right: 0.15 - bob, reach: 0.03 };
  const tap = (phase) => 0.14 + Math.max(0, sin(t * 16 + k + phase)) * 0.04;
  if (act === 'type') Object.assign(out, { left: tap(0), right: tap(2), reach: 0.1 });
  else if (act === 'talk') Object.assign(out, { left: 0.17 + (sin(t * 5 + k) > 0.3 ? 0.1 : 0), reach: 0.08 });
  else if (act === 'sip') Object.assign(out, { left: 0.25 + sin(t * 2 + k) * 0.02, right: 0.25 + sin(t * 2 + k) * 0.02, reach: 0.12 });
  else if (act === 'wave') out.right = 0.28 + sin(t * 8 + k) * 0.04;
  else if (act === 'check') Object.assign(out, { left: 0.2 + Math.max(0, sin(t * 6 + k)) * 0.05, reach: 0.1 });
  else if (act === 'play') Object.assign(out, { left: 0.2 + Math.max(0, sin(t * 9 + k)) * 0.05, right: 0.2 + Math.max(0, sin(t * 9 + k + 3)) * 0.05, reach: 0.1 });
  return out;
}

function poseFace(g, { t, k, act, speaking }) {
  const working = act === 'type';
  const blink = (t + k * 1.3) % 5 > 4.9 ? 0.1 : 1;
  g.eyes.scale.y = lerp(g.eyes.scale.y, blink, 0.4);
  g.eyes.position.x = lerp(g.eyes.position.x, working ? 0 : sin(t * 1.3 + k * 1.7) * 0.012, 0.15);
  g.eyes.position.y = lerp(g.eyes.position.y, 0.28 + (working ? -0.01 : sin(t * 1.1 + k * 2.1) * 0.004), 0.15);
  g.brows.forEach((b, i) => {
    const side = i === 0 ? -1 : 1;
    b.rotation.z = lerp(b.rotation.z, (working ? -0.3 : 0.2) * -side, 0.25);
    b.position.y = lerp(b.position.y, speaking ? 0.366 : 0.352, 0.25);
  });
  g.smile.visible = !speaking;
  g.mouth.visible = speaking;
  g.mouth.scale.y = lerp(g.mouth.scale.y, 0.5 + 0.45 * Math.abs(sin(t * 13 + k)), 0.35);
}

// Animate one resident for this frame. `walk` is true while moving; `act` is what it does when standing.
export function poseGarlic(g, state) {
  const { t, phase, k, walk, act } = state;
  const w = sin(phase);
  g.body.position.y = lerp(g.body.position.y, walk ? Math.abs(w) * 0.035 : w * 0.006, 0.4);
  g.body.rotation.z = lerp(g.body.rotation.z, walk ? w * 0.1 : act === 'rest' ? sin(t * 0.8 + k) * 0.05 : 0, 0.3);
  const swing = walk ? w * 0.07 : 0;
  const lift = (x) => (walk ? Math.max(0, x) * 0.035 : 0);
  g.feet[0].position.set(-0.075, 0.03 + lift(Math.cos(phase)), 0.04 + swing);
  g.feet[1].position.set(0.075, 0.03 + lift(-Math.cos(phase)), 0.04 - swing);
  const h = handTargets(act, t, k, walk, w);
  const sway = walk ? 0.06 * w : 0;
  g.hands[0].position.y = lerp(g.hands[0].position.y, h.left, 0.3);
  g.hands[1].position.y = lerp(g.hands[1].position.y, h.right, 0.3);
  g.hands[0].position.z = lerp(g.hands[0].position.z, h.reach - sway, 0.3);
  g.hands[1].position.z = lerp(g.hands[1].position.z, h.reach + sway, 0.3);
  poseFace(g, state);
}
