import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS, CAST, HALL_Z, DOOR_HALF } from './layout.js';
import { buildPath, advance, pickDest, takeSpot, roomIndex } from './sim.js';

const SAMPLE = 0.02;

// Which room (index) or the hall ('hall') a point stands in; -1 means outside every walkable area.
function zoneOf(x, z) {
  if (z > HALL_Z[0] && z < HALL_Z[1]) return 'hall';
  return ROOMS.findIndex((r) => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2);
}

// Walk a path in small steps; every step must stay walkable and only cross room <-> hall inside a door.
function assertWalkable(path, label) {
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, z0] = path[i];
    const [x1, z1] = path[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / SAMPLE));
    let prev = zoneOf(x0, z0);
    assert.notEqual(prev, -1, `${label}: point (${x0},${z0}) is outside every room`);
    for (let s = 1; s <= n; s++) {
      const x = x0 + ((x1 - x0) * s) / n;
      const z = z0 + ((z1 - z0) * s) / n;
      const zone = zoneOf(x, z);
      assert.notEqual(zone, -1, `${label}: (${x.toFixed(2)},${z.toFixed(2)}) is outside every room`);
      if (zone !== prev) {
        const room = ROOMS[zone === 'hall' ? prev : zone];
        assert.ok(zone === 'hall' || prev === 'hall', `${label}: jumped room to room at (${x.toFixed(2)},${z.toFixed(2)})`);
        assert.ok(Math.abs(x - room.doorX) <= DOOR_HALF + 1e-9, `${label}: crossed a wall outside the door of ${room.key} at x=${x.toFixed(2)}`);
      }
      prev = zone;
    }
  }
}

test('the office has seven rooms with 26 seats, every seat inside its own room', () => {
  assert.equal(ROOMS.length, 7);
  assert.equal(new Set(ROOMS.map((r) => r.key)).size, 7);
  assert.equal(ROOMS.reduce((sum, r) => sum + r.spots.length, 0), 26);
  for (const r of ROOMS) for (const s of r.spots) {
    assert.ok(s.x >= r.x1 && s.x <= r.x2 && s.z >= r.z1 && s.z <= r.z2, `${r.key}: seat (${s.x},${s.z}) is outside the room`);
  }
});

test('twelve agents whose home rooms can seat them all', () => {
  assert.equal(CAST.length, 12);
  for (const c of CAST) assert.ok(roomIndex(c.home) >= 0, `unknown home ${c.home}`);
  for (const r of ROOMS) {
    const living = CAST.filter((c) => c.home === r.key).length;
    assert.ok(living <= r.spots.length, `${r.key} has ${living} residents for ${r.spots.length} seats`);
  }
});

test('every seat reaches every seat of every other room through doors only', () => {
  for (let a = 0; a < ROOMS.length; a++) for (let b = 0; b < ROOMS.length; b++) {
    if (a === b) continue;
    ROOMS[a].spots.forEach((_, i) => ROOMS[b].spots.forEach((__, j) => {
      assertWalkable(buildPath(a, i, b, j), `${ROOMS[a].key}#${i} -> ${ROOMS[b].key}#${j}`);
    }));
  }
});

test('a path starts on the departure seat and ends on the arrival seat', () => {
  const path = buildPath(0, 0, 1, 2);
  const from = ROOMS[0].spots[0];
  const to = ROOMS[1].spots[2];
  assert.deepEqual(path[0], [from.x, from.z]);
  assert.deepEqual(path[path.length - 1], [to.x, to.z]);
});

test('advance walks along the path at the given step and reports arrival exactly once', () => {
  const agent = { x: 0, z: 0, heading: 0, path: [[0, 0], [1, 0], [1, 1]], seg: 0, segD: 0 };
  assert.equal(advance(agent, 0.5), false);
  assert.deepEqual([agent.x, agent.z], [0.5, 0]);
  assert.equal(advance(agent, 0.75), false); // turns the corner: 0.5 left on the first leg, 0.25 up the second
  assert.deepEqual([agent.x, agent.z], [1, 0.25]);
  assert.equal(advance(agent, 5), true);
  assert.deepEqual([agent.x, agent.z], [1, 1]);
});

test('pickDest never returns the room the agent is already in', () => {
  const cfg = CAST[3];
  let n = 0;
  const rng = () => ((n = (n * 7 + 3) % 11) / 11);
  for (let room = 0; room < ROOMS.length; room++) for (let i = 0; i < 50; i++) {
    const dest = pickDest(rng, cfg, room);
    assert.notEqual(dest, room);
    assert.ok(dest >= 0 && dest < ROOMS.length);
  }
});

test('takeSpot hands out each seat once and reports a full room with -1', () => {
  const owner = [-1, -1];
  const room = { spots: [{}, {}], owner };
  const first = takeSpot(room, 7, () => 0);
  const second = takeSpot(room, 8, () => 0);
  assert.notEqual(first, second);
  assert.deepEqual([...owner].sort(), [7, 8]);
  assert.equal(takeSpot(room, 9, () => 0), -1);
});
