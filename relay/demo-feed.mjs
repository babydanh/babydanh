// Demo only: posts scripted agent activity to the relay so the office can be watched without the Board. Not real data.
// Run: PRESENCE_TOKEN=<same token as the relay> node relay/demo-feed.mjs [http://127.0.0.1:8787/presence]
const url = process.argv[2] ?? 'http://127.0.0.1:8787/presence';
const token = process.env.PRESENCE_TOKEN;
if (!token) throw new Error('PRESENCE_TOKEN is required');

const ROSTER = ['director', 'advisor', 'worker', 'worker', 'qa', 'judge'];
// [roster index, what it is doing]; at each step one agent works and the others rest.
const SCRIPT = [
  [0, 'Planning the login fix'], [1, 'Reading auth/session.ts'], [2, 'Edit auth/session.ts'], [3, 'Bash: npm test'],
  [4, 'Running login.spec.ts'], [5, 'Checking the diff'], [2, 'Edit routes/login.tsx'], [3, 'Write login.test.ts'],
];
let step = 0;

async function tick() {
  const [busy, text] = SCRIPT[step++ % SCRIPT.length];
  const agents = ROSTER.map((role, i) => (i === busy ? { role, state: 'working', text } : { role, state: 'idle' }));
  try {
    const res = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ updatedAt: Date.now(), agents }) });
    if (!res.ok) console.warn(`[demo-feed] relay answered ${res.status}`);
  } catch (error) {
    console.warn(`[demo-feed] ${error.message}`);
  }
}

tick();
setInterval(tick, 3000);
