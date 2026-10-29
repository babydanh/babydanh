import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_SCRIPT, HERDR_LINES, herdrScene } from './herdrView.js';

const NOW = 1_700_000_000_000;
const live = (agents) => ({ updatedAt: NOW, agents });

test('without live data the laptop runs a scripted session that grows line by line', () => {
  const first = herdrScene(null, 0, NOW);
  const later = herdrScene(null, 4, NOW);
  assert.equal(first.live, false);
  assert.equal(first.lines.length, 1);
  assert.equal(later.lines.length, 5);
  assert.deepEqual(later.lines[0], { kind: DEMO_SCRIPT[0][0], text: DEMO_SCRIPT[0][1] });
});

test('the scripted session keeps only the newest lines and loops forever', () => {
  const scene = herdrScene(null, DEMO_SCRIPT.length * 3 + 2, NOW);
  assert.ok(scene.lines.length <= HERDR_LINES);
  assert.equal(scene.lines.at(-1).text, DEMO_SCRIPT[2][1]);
});

test('fresh live data lists the real agents and their current action', () => {
  const scene = herdrScene(live([{ role: 'Coder', state: 'working', text: 'Using Edit' }, { role: 'Tester', state: 'waiting', text: '' }]), 7, NOW);
  assert.equal(scene.live, true);
  assert.deepEqual(scene.agents, [{ name: 'Coder', state: 'working' }, { name: 'Tester', state: 'blocked' }]);
  assert.deepEqual(scene.lines, [{ kind: 'cmd', text: 'coder: Using Edit' }]);
});

test('live agents that are idle with nothing to say add no command lines', () => {
  const scene = herdrScene(live([{ role: 'Director', state: 'idle', text: '' }]), 3, NOW);
  assert.deepEqual(scene.agents, [{ name: 'Director', state: 'idle' }]);
  assert.deepEqual(scene.lines, []);
});

test('stale live data falls back to the scripted session', () => {
  const stale = { updatedAt: NOW - 10 * 60_000, agents: [{ role: 'Coder', state: 'working', text: 'old' }] };
  assert.equal(herdrScene(stale, 2, NOW).live, false);
});

test('the scripted roster changes who is working as time passes', () => {
  const a = herdrScene(null, 0, NOW).agents.map((x) => x.state).join();
  const b = herdrScene(null, 3, NOW).agents.map((x) => x.state).join();
  assert.notEqual(a, b);
});
