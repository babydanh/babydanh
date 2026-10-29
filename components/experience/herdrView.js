// What the laptop shows: a herdr-style terminal with an agent list on the left and a command log on the right.
// Live Board presence drives it when there is any; otherwise a short scripted session loops so the screen is never dead.
import { isFresh } from './office/presence.js';

export const HERDR_LINES = 10;

export const DEMO_SCRIPT = [
  ['cmd', 'herdr status'], ['out', '6 agents · 2 working · 1 blocked'],
  ['cmd', 'git worktree add ../login-fix'], ['out', 'Preparing worktree (new branch login-fix)'],
  ['cmd', 'claude "fix the login redirect"'], ['out', 'Reading auth/session.ts'], ['out', 'Edit auth/session.ts'],
  ['cmd', 'npm test'], ['out', '38 passed, 0 failed'],
  ['cmd', 'git commit -m "fix: login redirect"'], ['out', '[login-fix 3f9a1c2] fix: login redirect'],
];
const DEMO_ROSTER = ['Director', 'Advisor', 'Worker', 'Worker', 'QA', 'Judge'];
const STATE_LABEL = { waiting: 'blocked' };

function demoScene(tick) {
  const busy = Math.floor(tick / 2) % DEMO_ROSTER.length;
  const end = (tick % DEMO_SCRIPT.length) + 1;
  return {
    live: false,
    agents: DEMO_ROSTER.map((name, i) => ({ name, state: i === busy ? 'working' : i === (busy + 1) % DEMO_ROSTER.length ? 'blocked' : 'idle' })),
    lines: DEMO_SCRIPT.slice(Math.max(0, end - HERDR_LINES), end).map(([kind, text]) => ({ kind, text })),
  };
}

export function herdrScene(presence, tick, now = Date.now()) {
  if (!isFresh(presence, now) || !presence.agents.length) return demoScene(tick);
  return {
    live: true,
    agents: presence.agents.map(({ role, state }) => ({ name: role, state: STATE_LABEL[state] ?? state })),
    lines: presence.agents.filter((a) => a.text).slice(-HERDR_LINES).map((a) => ({ kind: 'cmd', text: `${a.role.toLowerCase()}: ${a.text}` })),
  };
}
