import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRelay, createRelayServer } from './relay.mjs';
import { STALE_MS } from '../components/experience/office/presence.js';

const TOKEN = 'test-token-0123456789-abcdefghij';
const SITE = 'https://babydanh.github.io';

// Boots the real handler on a free loopback port; `clock.now` lets a test move time.
async function boot(options = {}) {
  const clock = { now: 1_700_000_000_000 };
  const server = http.createServer(createRelay({ token: TOKEN, allowOrigin: SITE, now: () => clock.now, ...options }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body, headers = {}) => fetch(`${base}/presence`, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { base, clock, post, get: (headers) => fetch(`${base}/presence`, { headers }), close: () => server.close() };
}

const sample = (now) => ({ updatedAt: now, agents: [{ role: 'worker', state: 'working', text: 'Fixing a bug', cwd: 'C:/secret' }] });

test('refuses to start without a long enough token', () => {
  assert.throws(() => createRelay({}), /token/);
  assert.throws(() => createRelay({ token: 'short' }), /token/);
});

test('a publisher without the token, or with a wrong one, is refused', async () => {
  const r = await boot();
  try {
    assert.equal((await r.post(sample(r.clock.now), { authorization: '' })).status, 401);
    assert.equal((await r.post(sample(r.clock.now), { authorization: 'Bearer wrong' })).status, 401);
    assert.equal((await r.post(sample(r.clock.now), { authorization: `Bearer ${TOKEN}x` })).status, 401);
  } finally { r.close(); }
});

test('a published snapshot is served sanitized, uncached, and readable from the site origin only', async () => {
  const r = await boot();
  try {
    assert.equal((await r.post(sample(r.clock.now))).status, 204);
    const res = await r.get({ origin: SITE });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), SITE);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const body = await res.json();
    assert.deepEqual(body.agents, [{ role: 'Coder', state: 'working', text: 'Fixing a bug' }]);
    assert.equal((await r.get({ origin: 'https://evil.example' })).headers.get('access-control-allow-origin'), null);
  } finally { r.close(); }
});

test('with nothing published, or once the data is stale, the feed is empty', async () => {
  const r = await boot();
  try {
    assert.deepEqual((await (await r.get()).json()).agents, []);
    await r.post(sample(r.clock.now));
    r.clock.now += STALE_MS + 1;
    assert.deepEqual((await (await r.get()).json()).agents, []);
  } finally { r.close(); }
});

test('oversized and malformed bodies are rejected', async () => {
  const r = await boot({ maxBody: 256 });
  try {
    assert.equal((await r.post({ updatedAt: 1, agents: [], pad: 'x'.repeat(1000) })).status, 413);
    assert.equal((await r.post('{not json')).status, 400);
  } finally { r.close(); }
});

test('unknown paths and methods are refused', async () => {
  const r = await boot();
  try {
    assert.equal((await fetch(`${r.base}/other`)).status, 404);
    assert.equal((await fetch(`${r.base}/presence`, { method: 'DELETE' })).status, 405);
    assert.equal((await fetch(`${r.base}/presence`, { method: 'OPTIONS' })).status, 405);
  } finally { r.close(); }
});

test('publishing is rate limited per minute and recovers in the next minute', async () => {
  const r = await boot({ postsPerMinute: 3 });
  try {
    for (let i = 0; i < 3; i++) assert.equal((await r.post(sample(r.clock.now))).status, 204);
    assert.equal((await r.post(sample(r.clock.now))).status, 429);
    r.clock.now += 61_000;
    assert.equal((await r.post(sample(r.clock.now))).status, 204);
  } finally { r.close(); }
});

// fetch() normalises the target, so the odd request lines go through http.request.
const rawGet = (base, path) => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port: new URL(base).port, path, method: 'GET' }, (res) => {
    res.resume();
    resolve(res.statusCode);
  });
  req.on('error', reject);
  req.end();
});

test('request targets that are not valid URLs (//, //:, //host:abc) get a 404 and do not crash the relay', async () => {
  const r = await boot();
  try {
    for (const path of ['//', '//:', '//host:abc']) assert.equal(await rawGet(r.base, path), 404, path);
    assert.equal((await r.get()).status, 200); // still alive
  } finally { r.close(); }
});

test('a publisher body with objects where strings belong cannot crash the relay', async () => {
  const r = await boot();
  try {
    assert.equal((await r.post({ updatedAt: { toString: 1 }, agents: [{ role: { toString: 1 }, state: 'working', text: { toString: 1 } }] })).status, 204);
    assert.equal((await r.get()).status, 200);
  } finally { r.close(); }
});

test('the server is created with short timeouts and a connection cap', () => {
  const server = createRelayServer({ token: TOKEN });
  assert.equal(server.requestTimeout, 10_000);
  assert.equal(server.headersTimeout, 10_000);
  assert.equal(server.maxConnections, 64);
  server.close();
});
