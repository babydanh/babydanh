import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS } from './layout.js';
import { PARTS, MATERIALS, MIN_SIZE, PLINTH } from './furniture.js';

// Largest edge of a part, in office units. One unit is about 2 cm on the desk.
function extent(p) {
  if (p.t === 'box') return Math.max(...p.s);
  if (p.t === 'cyl') return Math.max(2 * p.r * Math.max(p.sx ?? 1, p.sz ?? 1), p.h);
  return 2 * p.r;
}

test('every part uses a material that is defined', () => {
  for (const p of PARTS) assert.ok(MATERIALS[p.m], `unknown material ${p.m}`);
});

test('parts too small to show on screen are left out', () => {
  for (const p of PARTS) assert.ok(extent(p) >= MIN_SIZE, `${p.t} of ${p.m} at ${p.p} is ${extent(p).toFixed(3)} units, under ${MIN_SIZE}`);
});

test('every part sits on the plinth', () => {
  for (const p of PARTS) {
    assert.ok(Math.abs(p.p[0]) <= PLINTH.x && Math.abs(p.p[2]) <= PLINTH.z, `${p.t} of ${p.m} at ${p.p} is off the plinth`);
    if (p.m !== 'plinth') assert.ok(p.p[1] >= 0, `${p.t} of ${p.m} at ${p.p} is below the floor`); // the plinth is the only part under it
  }
});

test('each room has its own floor', () => {
  for (const r of ROOMS) assert.ok(PARTS.some((p) => p.m === `floor.${r.key}`), `${r.key} has no floor`);
});

test('the three server-rack led materials exist for blinking', () => {
  for (const k of ['led0', 'led1', 'led2']) assert.ok(PARTS.some((p) => p.m === k), `no part uses ${k}`);
});
