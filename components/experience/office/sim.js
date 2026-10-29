// Walking logic for the tiny office. Pure functions: randomness comes in as `rng` so tests can drive it.
import { ROOMS } from './layout.js';

export const roomIndex = (key) => ROOMS.findIndex((r) => r.key === key);

// Waypoints from one seat to another: out of the seat, through the room's door, along the hall,
// through the destination's door, into the seat. Within one room the seat's own waypoints are enough.
export function buildPath(fromRoom, fromSeat, toRoom, toSeat) {
  const from = ROOMS[fromRoom];
  const dest = ROOMS[toRoom];
  const start = from.spots[fromSeat];
  const end = dest.spots[toSeat];
  const points = [[start.x, start.z], ...start.via];
  if (fromRoom !== toRoom) points.push([from.doorX, from.dz], [from.doorX, 0], [dest.doorX, 0], [dest.doorX, dest.dz]);
  points.push(...[...end.via].reverse(), [end.x, end.z]);
  return points;
}

// Move `agent` along its path by `step` units, turning corners within the same call.
// Returns true once the end of the path is reached.
export function advance(agent, step) {
  let left = step;
  while (left > 0 && agent.seg < agent.path.length - 1) {
    const [x0, z0] = agent.path[agent.seg];
    const [x1, z1] = agent.path[agent.seg + 1];
    const length = Math.hypot(x1 - x0, z1 - z0);
    if (length < 1e-6) {
      agent.seg++;
      agent.segD = 0;
      continue;
    }
    const moved = Math.min(left, length - agent.segD);
    agent.segD += moved;
    left -= moved;
    agent.x = x0 + (x1 - x0) * (agent.segD / length);
    agent.z = z0 + (z1 - z0) * (agent.segD / length);
    agent.heading = Math.atan2(x1 - x0, z1 - z0);
    if (agent.segD >= length - 1e-6) {
      agent.seg++;
      agent.segD = 0;
    }
  }
  return agent.seg >= agent.path.length - 1;
}

// Where to go next: mostly a room the resident likes, sometimes any room; never the current one.
export function pickDest(rng, cfg, current) {
  for (let tries = 0; tries < 6; tries++) {
    const to = rng() < 0.8 ? roomIndex(cfg.prefs[Math.floor(rng() * cfg.prefs.length)]) : Math.floor(rng() * ROOMS.length);
    if (to !== current && to >= 0) return to;
  }
  return (current + 1) % ROOMS.length;
}

// Claim a free seat for agent `k`; -1 when the room is full.
export function takeSpot(roomState, k, rng) {
  const free = roomState.owner.flatMap((who, i) => (who === -1 ? [i] : []));
  if (!free.length) return -1;
  const seat = free[Math.floor(rng() * free.length)];
  roomState.owner[seat] = k;
  return seat;
}
