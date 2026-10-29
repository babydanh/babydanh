// Presence: what the Board tells the portfolio about its agents. Pure functions, shared by the relay and the browser.
//
// Wire contract (publisher -> relay -> site):
//   { updatedAt: <ms>, agents: [{ role, state, text? }] }
//   role  : a Board role (director, advisor, worker, qa, judge) or a garlic role; anything else is dropped
//   state : working | waiting | idle | error
//   text  : one short line, optional
// Only these three fields survive `sanitizePresence`. `text` is free text, so it is also dropped whole when it looks like a
// path, a credential or a long opaque token; that is a safety net, the publisher should still send fixed labels only.
import { ROOMS } from './layout.js';

export const MAX_AGENTS = 12;
export const MAX_TEXT = 60;
export const STALE_MS = 90_000; // no news for this long: the office goes back to its own simulation
const FUTURE_SKEW_MS = 5 * 60_000;

const ROLE_ALIASES = {
  director: 'Director', advisor: 'Scout', scout: 'Scout', reception: 'Reception',
  worker: 'Coder', coder: 'Coder', qa: 'Tester', tester: 'Tester', judge: 'Tester', designer: 'Designer',
};
const STATES = new Set(['working', 'waiting', 'idle', 'error']);

// Where a working resident sits; waiting / error / idle are the same for everyone.
const WORKPLACE = { Director: 'meet', Scout: 'work', Reception: 'lobby', Coder: 'work', Tester: 'server', Designer: 'studio' };
const OTHER_ROOM = { waiting: 'lobby', error: 'server', idle: 'lounge' };

// Drive paths, leading-slash paths, bearer/credential words, well-known key prefixes, and any 24+ character unbroken run.
const UNSAFE_TEXT = [
  /\b[a-z]:[\\/]/i,
  /(^|[\s"'=])~?\/\w/,
  /\b(bearer|authorization|token|secret|password|passwd|api[_-]?key)\b/i,
  /\b(sk|ghp|gho|ghs|xox[bp]|akia|aiza)[-_a-z0-9]{10,}/i,
  /\S{24,}/,
];

function cleanText(value) {
  if (typeof value !== 'string') return '';
  const text = value.replace(/[<>\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return UNSAFE_TEXT.some((pattern) => pattern.test(text)) ? '' : text.slice(0, MAX_TEXT);
}

export function sanitizePresence(raw, now = Date.now()) {
  const list = Array.isArray(raw?.agents) ? raw.agents : [];
  const agents = [];
  for (const item of list) {
    const key = typeof item?.role === 'string' ? item.role.toLowerCase() : '';
    const role = Object.hasOwn(ROLE_ALIASES, key) ? ROLE_ALIASES[key] : undefined;
    if (!role || !STATES.has(item?.state)) continue;
    agents.push({ role, state: item.state, text: cleanText(item.text) });
    if (agents.length === MAX_AGENTS) break;
  }
  const at = raw?.updatedAt;
  const updatedAt = typeof at === 'number' && Number.isFinite(at) && at <= now + FUTURE_SKEW_MS ? at : now;
  return { updatedAt, agents };
}

export const isFresh = (presence, now = Date.now()) => Boolean(presence) && now - presence.updatedAt <= STALE_MS;

export function roomFor(state, cfg) {
  const key = state === 'working' ? WORKPLACE[cfg.role] : OTHER_ROOM[state];
  return ROOMS.some((r) => r.key === key) ? key : cfg.home;
}

// Cast index -> { state, text }. The k-th entry of a role goes to the k-th resident of that role; extras are dropped.
export function assignPresence(presence, cast) {
  const result = new Map();
  const used = {};
  for (const entry of presence?.agents ?? []) {
    const slots = cast.flatMap((c, k) => (c.role === entry.role ? [k] : []));
    const k = slots[used[entry.role] ?? 0];
    if (k === undefined) continue;
    used[entry.role] = (used[entry.role] ?? 0) + 1;
    result.set(k, { state: entry.state, text: entry.text });
  }
  return result;
}
