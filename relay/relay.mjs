// Presence relay: the Board POSTs a snapshot with a bearer token, the site GETs the sanitized copy. No dependencies, no storage.
import { timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import { isFresh, sanitizePresence } from '../components/experience/office/presence.js';

const MIN_TOKEN_LENGTH = 24;
const WINDOW_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_CONNECTIONS = 64;

function tokenMatches(header, token) {
  const given = Buffer.from(String(header ?? '').replace(/^Bearer /, ''));
  const want = Buffer.from(token);
  return given.length === want.length && timingSafeEqual(given, want);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size <= limit) chunks.push(chunk);
      else if (size - chunk.length <= limit) reject(Object.assign(new Error('too large'), { status: 413 })); // once; the rest is discarded
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function createRelay({ token, allowOrigin = '', now = Date.now, maxBody = 4096, postsPerMinute = 60 } = {}) {
  if (typeof token !== 'string' || token.length < MIN_TOKEN_LENGTH) throw new Error(`token must be at least ${MIN_TOKEN_LENGTH} characters`);
  let latest = null;
  let windowStart = 0;
  let posts = 0;

  const send = (res, status, body, headers = {}) => {
    res.writeHead(status, { 'cache-control': 'no-store', ...headers, ...(body === undefined ? {} : { 'content-type': 'application/json' }) });
    res.end(body === undefined ? undefined : JSON.stringify(body));
  };

  async function publish(req, res) {
    if (!tokenMatches(req.headers.authorization, token)) return send(res, 401, { error: 'unauthorized' });
    if (now() - windowStart >= WINDOW_MS) [windowStart, posts] = [now(), 0];
    if (++posts > postsPerMinute) return send(res, 429, { error: 'rate limited' });
    let raw;
    try {
      raw = JSON.parse(await readBody(req, maxBody));
    } catch (error) {
      return error.status === 413 ? send(res, 413, { error: 'too large' }, { connection: 'close' }) : send(res, 400, { error: 'bad json' });
    }
    try {
      latest = sanitizePresence(raw, now());
    } catch {
      return send(res, 400, { error: 'bad snapshot' });
    }
    return send(res, 204);
  }

  return (req, res) => {
    // Compare the raw target: `new URL` throws on request lines like `//` and `//:`, which anyone can send.
    if (String(req.url).split('?')[0] !== '/presence') return send(res, 404, { error: 'not found' });
    if (req.method === 'POST') return publish(req, res);
    if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
    const body = isFresh(latest, now()) ? latest : { updatedAt: now(), agents: [] };
    const cors = allowOrigin && req.headers.origin === allowOrigin ? { 'access-control-allow-origin': allowOrigin, vary: 'Origin' } : { vary: 'Origin' };
    return send(res, 200, body, cors);
  };
}

// The handler on a server that drops slow clients and caps open connections (the URL is public, the token is not).
export function createRelayServer(options) {
  const server = http.createServer(createRelay(options));
  server.requestTimeout = REQUEST_TIMEOUT_MS;
  server.headersTimeout = REQUEST_TIMEOUT_MS;
  server.maxConnections = MAX_CONNECTIONS;
  return server;
}
