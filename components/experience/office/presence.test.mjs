import test from 'node:test';
import assert from 'node:assert/strict';
import { CAST } from './layout.js';
import { assignPresence, isFresh, roomFor, sanitizePresence, MAX_TEXT, MAX_AGENTS, STALE_MS } from './presence.js';

const NOW = 1_700_000_000_000;
const good = (agents) => ({ updatedAt: NOW, agents });

test('sanitize keeps whitelisted role, state and clipped text', () => {
  const out = sanitizePresence(good([{ role: 'worker', state: 'working', text: 'Fixing the login bug' }]), NOW);
  assert.deepEqual(out.agents, [{ role: 'Coder', state: 'working', text: 'Fixing the login bug' }]);
  assert.equal(out.updatedAt, NOW);
});

test('sanitize maps Board roles onto garlic roles and drops unknown ones', () => {
  const out = sanitizePresence(good([
    { role: 'Director', state: 'working' }, { role: 'advisor', state: 'idle' }, { role: 'qa', state: 'working' },
    { role: 'judge', state: 'waiting' }, { role: 'root', state: 'working' }, { role: 'worker', state: 'rm -rf' },
  ]), NOW);
  assert.deepEqual(out.agents.map((a) => a.role), ['Director', 'Scout', 'Tester', 'Tester']);
});

test('sanitize strips control characters, markup and over-long text', () => {
  const out = sanitizePresence(good([{ role: 'worker', state: 'working', text: `<b>hi</b>\u0000\n${'x'.repeat(500)}` }]), NOW);
  assert.ok(out.agents[0].text.length <= MAX_TEXT);
  assert.doesNotMatch(out.agents[0].text, /[<>\u0000-\u001f]/);
});

test('sanitize drops every field it does not know (paths, prompts, secrets cannot ride along)', () => {
  const out = sanitizePresence(good([{ role: 'worker', state: 'working', text: 'ok', cwd: 'C:/secret', prompt: 'p', token: 't' }]), NOW);
  assert.deepEqual(Object.keys(out.agents[0]).sort(), ['role', 'state', 'text']);
});

test('sanitize caps the number of agents and tolerates garbage input', () => {
  const many = Array.from({ length: 50 }, () => ({ role: 'worker', state: 'idle' }));
  assert.equal(sanitizePresence(good(many), NOW).agents.length, MAX_AGENTS);
  for (const bad of [null, undefined, 7, 'x', [], {}, { agents: 'no' }]) assert.deepEqual(sanitizePresence(bad, NOW).agents, []);
});

test('sanitize ignores a client-supplied clock that is far in the future', () => {
  assert.equal(sanitizePresence({ updatedAt: NOW + 10 * 86_400_000, agents: [] }, NOW).updatedAt, NOW);
});

test('isFresh turns false once the data is older than the stale window', () => {
  assert.equal(isFresh({ updatedAt: NOW }, NOW + STALE_MS - 1), true);
  assert.equal(isFresh({ updatedAt: NOW }, NOW + STALE_MS + 1), false);
  assert.equal(isFresh(null, NOW), false);
});

test('roomFor sends working agents to their workplace and the rest elsewhere', () => {
  const coder = CAST.find((c) => c.role === 'Coder');
  const tester = CAST.find((c) => c.role === 'Tester');
  const director = CAST.find((c) => c.role === 'Director');
  assert.equal(roomFor('working', coder), 'work');
  assert.equal(roomFor('working', tester), 'server');
  assert.equal(roomFor('working', director), 'meet');
  assert.equal(roomFor('waiting', coder), 'lobby');
  assert.equal(roomFor('error', coder), 'server');
  assert.equal(roomFor('idle', coder), 'lounge');
});

test('assignPresence gives the k-th entry of a role to the k-th cast member of that role', () => {
  const presence = sanitizePresence(good([
    { role: 'worker', state: 'working', text: 'one' }, { role: 'worker', state: 'idle', text: 'two' },
  ]), NOW);
  const map = assignPresence(presence, CAST);
  const coders = CAST.flatMap((c, k) => (c.role === 'Coder' ? [k] : []));
  assert.equal(map.get(coders[0]).text, 'one');
  assert.equal(map.get(coders[1]).state, 'idle');
  assert.equal(map.has(coders[2]), false);
});

test('assignPresence drops entries that exceed the cast and returns nothing for no data', () => {
  const three = sanitizePresence(good([{ role: 'judge', state: 'idle' }, { role: 'qa', state: 'idle' }, { role: 'tester', state: 'idle' }]), NOW);
  assert.equal(assignPresence(three, CAST).size, 2); // the cast has two testers
  assert.equal(assignPresence(null, CAST).size, 0);
});

test('sanitize ignores non-string roles and text and prototype keys', () => {
  const out = sanitizePresence(good([
    { role: { toString: 1 }, state: 'working' }, { role: 'constructor', state: 'idle' }, { role: '__proto__', state: 'idle' },
    { role: 'worker', state: 'working', text: { toString: 1 } },
  ]), NOW);
  assert.deepEqual(out.agents, [{ role: 'Coder', state: 'working', text: '' }]);
});

test('text that looks like a secret, a home path or a long token is dropped; ordinary labels stay', () => {
  const bad = [
    'Bash: curl -H "Authorization: Bearer abc"', 'Reading C:/Users/danh/notes.txt', 'Reading C:\\Users\\danh', 'cat /home/danh/.ssh/id_rsa',
    'export KEY=sk-abcdefghijklmnopqrstuvwxyz', 'token=abc123', 'ghp_abcdefghijklmnopqrstuvwxyz0123456789', 'a'.repeat(30), 'password is hunter2',
  ];
  for (const text of bad) assert.equal(sanitizePresence(good([{ role: 'worker', state: 'working', text }]), NOW).agents[0].text, '', text);
  for (const text of ['Using Edit', 'Edit auth/session.ts', 'Bash: npm test']) {
    assert.equal(sanitizePresence(good([{ role: 'worker', state: 'working', text }]), NOW).agents[0].text, text);
  }
});
