'use client';

import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createGarlic, poseGarlic } from './garlic.js';
import { MATERIALS, PARTS } from './furniture.js';
import { CAST, ROOMS } from './layout.js';
import { advance, buildPath, pickDest, roomIndex, takeSpot } from './sim.js';

// The office sits on the desk just above the keyboard, centred on it (metres); one office unit is UNIT metres.
const OFFICE_POS = [0.13, 0.0055, -0.11];
const UNIT = 0.021;
const FLOOR_Y = 0.04;
const SPEED = 0.75; // office units per second
const IDLE_INTERVAL = 1 / 12; // seconds between updates while the camera is on another station
const SAY_SECONDS = 2.8;
const MOBILE_WIDTH = 700;
const MOBILE_RESIDENTS = 6;

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function angleLerp(a, b, k) {
  const d = ((((b - a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  return a + d * k;
}

function makeMaterial(def) {
  const m = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.55, metalness: def.metal ?? 0 });
  if (def.emissive !== undefined) {
    m.emissive = new THREE.Color(def.emissive);
    m.emissiveIntensity = def.k ?? 1;
  }
  if (def.opacity) Object.assign(m, { transparent: true, opacity: def.opacity, depthWrite: false });
  return m;
}

function partGeometry(p) {
  let g;
  if (p.t === 'box') g = new THREE.BoxGeometry(...p.s);
  else if (p.t === 'cyl') g = new THREE.CylinderGeometry(p.r, p.r, p.h, 20).scale(p.sx, 1, p.sz);
  else g = new THREE.SphereGeometry(p.r, 14, 10).scale(1, p.sy, 1);
  return g.translate(...p.p);
}

// All furniture parts that share a material become one mesh.
function mergeFurniture() {
  const byMaterial = new Map();
  for (const p of PARTS) {
    if (!byMaterial.has(p.m)) byMaterial.set(p.m, []);
    byMaterial.get(p.m).push(partGeometry(p));
  }
  return [...byMaterial].map(([key, list]) => ({ key, geometry: mergeGeometries(list) }));
}

function createWorld(count) {
  const seats = ROOMS.map((r) => ({ owner: r.spots.map(() => -1) }));
  const residents = CAST.slice(0, count).map((cfg, k) => {
    const room = roomIndex(cfg.home);
    const spot = Math.max(0, takeSpot(seats[room], k, Math.random));
    const seat = ROOMS[room].spots[spot];
    const g = createGarlic(cfg.leaf, cfg.skin);
    g.root.rotation.y = seat.face;
    return { k, cfg, g, room, spot, x: seat.x, z: seat.z, y: seat.y, heading: seat.face, facing: seat.face, path: [], seg: 0, segD: 0, moving: false, wait: 2 + Math.random() * 8, phase: Math.random() * 6, sayUntil: 0, node: null };
  });
  return { seats, residents };
}

function startTrip(world, a) {
  const to = pickDest(Math.random, a.cfg, a.room);
  const spot = takeSpot(world.seats[to], a.k, Math.random);
  if (spot < 0) {
    a.wait = 1 + Math.random() * 1.5; // destination full: try again soon
    return;
  }
  world.seats[a.room].owner[a.spot] = -1;
  Object.assign(a, { path: buildPath(a.room, a.spot, to, spot), seg: 0, segD: 0, destRoom: to, destSpot: spot, moving: true });
}

// Walk or wait; returns true on the frame the resident reaches its seat.
function stepResident(world, a, dt) {
  if (a.moving) {
    a.phase += dt * 11;
    return advance(a, SPEED * dt);
  }
  a.phase += dt * 3;
  a.wait -= dt;
  if (a.wait <= 0) startTrip(world, a);
  return false;
}

function settle(a) {
  a.room = a.destRoom;
  a.spot = a.destSpot;
  a.moving = false;
  const seat = ROOMS[a.room].spots[a.spot];
  a.x = seat.x;
  a.z = seat.z;
  a.wait = a.room === roomIndex(a.cfg.home) ? 6 + Math.random() * 8 : 3 + Math.random() * 4;
}

function applyResident(a, t) {
  const seat = ROOMS[a.room].spots[a.spot];
  a.y = THREE.MathUtils.lerp(a.y, a.moving ? 0 : seat.y, 0.2);
  a.facing = angleLerp(a.facing, a.moving ? a.heading : seat.face, 0.15);
  a.node?.position.set(a.x, FLOOR_Y + a.y, a.z);
  a.g.root.rotation.y = a.facing;
  const act = a.moving ? '' : seat.act || ROOMS[a.room].act;
  poseGarlic(a.g, { t, phase: a.phase, k: a.k, walk: a.moving, act, speaking: t < a.sayUntil });
}

export default function MiniOffice({ active, calm, onLog }) {
  const width = useThree((s) => s.size.width);
  const count = width < MOBILE_WIDTH ? MOBILE_RESIDENTS : CAST.length;
  const furniture = useMemo(mergeFurniture, []);
  const materials = useMemo(() => Object.fromEntries(Object.entries(MATERIALS).map(([key, def]) => [key, makeMaterial(def)])), []);
  const world = useMemo(() => createWorld(count), [count]);
  const [speech, setSpeech] = useState({});
  const acc = useRef(0);
  const timers = useRef([]);

  // The face is only worth drawing from the Office station; elsewhere the residents are a few pixels tall.
  useEffect(() => {
    world.residents.forEach((a) => { a.g.face.visible = active; });
  }, [active, world]);

  // Reduced motion: hold everyone in a still pose at their seat.
  useEffect(() => {
    if (calm) world.residents.forEach((a) => applyResident(a, 0));
  }, [calm, world]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const say = (a, t) => {
    const room = ROOMS[a.room];
    const text = pick(room.say);
    a.sayUntil = t + SAY_SECONDS;
    setSpeech((s) => ({ ...s, [a.k]: text }));
    timers.current.push(setTimeout(() => setSpeech((s) => ({ ...s, [a.k]: '' })), SAY_SECONDS * 1000));
    onLog?.({ role: a.cfg.role, text: `${room.name}: ${text}` });
  };

  useFrame((state, delta) => {
    if (calm) return;
    acc.current += delta;
    if (!active && acc.current < IDLE_INTERVAL) return;
    const dt = Math.min(acc.current, 0.1);
    acc.current = 0;
    const t = state.clock.elapsedTime;
    for (const a of world.residents) {
      if (stepResident(world, a, dt)) {
        settle(a);
        say(a, t);
      }
      applyResident(a, t);
    }
    ['led0', 'led1', 'led2'].forEach((key, i) => { materials[key].emissiveIntensity = Math.sin(t * 3 + i * 2.1) > 0 ? 1 : 0.25; });
  });

  return (
    <group position={OFFICE_POS} scale={UNIT}>
      {furniture.map(({ key, geometry }) => <mesh key={key} geometry={geometry} material={materials[key]} />)}
      {world.residents.map((a) => (
        <group key={a.k} ref={(node) => { a.node = node; node?.position.set(a.x, FLOOR_Y + a.y, a.z); }}>
          <primitive object={a.g.root} />
          {active && speech[a.k] ? <Html position={[0, 0.85, 0]} center className="office-bubble">{speech[a.k]}</Html> : null}
        </group>
      ))}
    </group>
  );
}
