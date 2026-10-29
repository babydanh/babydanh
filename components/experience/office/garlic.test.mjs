import test from 'node:test';
import assert from 'node:assert/strict';
import { createGarlic, poseGarlic } from './garlic.js';

const ACTS = ['type', 'talk', 'sip', 'wave', 'check', 'play', 'rest', null];
const frame = (extra) => ({ t: 1.2, phase: 0.7, k: 3, walk: false, act: null, speaking: false, ...extra });

test('a resident has a body, two hands, two feet and a face', () => {
  const g = createGarlic(0x00e5ff, 0xf6efe4);
  assert.equal(g.hands.length, 2);
  assert.equal(g.feet.length, 2);
  assert.equal(g.brows.length, 2);
  assert.ok(g.root.children.includes(g.body));
});

test('the fine parts can be hidden together', () => {
  const g = createGarlic(0x00e5ff, 0xf6efe4);
  assert.equal(g.fine.length, 6); // face, two hands, two feet, shadow
  assert.ok(g.fine.every((part) => part.visible));
  assert.ok(!g.fine.includes(g.body));
});

test('every activity poses the resident without producing NaN', () => {
  const g = createGarlic(0xffc857, 0xffd9bd);
  for (const act of ACTS) for (const walk of [false, true]) for (let i = 0; i < 20; i++) {
    poseGarlic(g, frame({ act, walk, t: i * 0.1, phase: i * 0.3 }));
    for (const part of [...g.hands, ...g.feet, g.body, g.eyes]) {
      for (const v of [part.position.x, part.position.y, part.position.z]) assert.ok(Number.isFinite(v), `${act} walk=${walk}: ${v}`);
    }
  }
});

test('the mouth opens only while speaking, the smile only while not', () => {
  const g = createGarlic(0xa78bfa, 0xdcd0f0);
  poseGarlic(g, frame({ speaking: true }));
  assert.equal(g.mouth.visible, true);
  assert.equal(g.smile.visible, false);
  poseGarlic(g, frame({ speaking: false }));
  assert.equal(g.mouth.visible, false);
  assert.equal(g.smile.visible, true);
});

test('typing lowers the eyes and raises the hands towards the desk', () => {
  const g = createGarlic(0x5ef2a0, 0xdff3e4);
  for (let i = 0; i < 60; i++) poseGarlic(g, frame({ act: 'type', t: i * 0.05 }));
  assert.ok(g.eyes.position.y < 0.28, 'eyes should look down while typing');
  assert.ok(g.hands[0].position.z > 0.08, 'hands should reach forward while typing');
});

test('two residents share geometry but not skin', () => {
  const a = createGarlic(0x00e5ff, 0xf6efe4);
  const b = createGarlic(0xff4d8d, 0xf6d6e4);
  const bodyA = a.body.children[0];
  const bodyB = b.body.children[0];
  assert.equal(bodyA.geometry, bodyB.geometry);
  assert.notEqual(bodyA.material, bodyB.material);
});
