// Furniture of the tiny office as plain data (office-local units; the floor top is at y = 0.04).
// MiniOffice merges the parts by material into a handful of meshes. Props smaller than MIN_SIZE
// (mugs, papers, lamps, keyboards) are left out on purpose: at desk scale they would be under a pixel and shimmer.
import { ROOMS, DESK_X, DESK_Z, MEET_CENTER } from './layout.js';

export const MIN_SIZE = 0.1;
export const PLINTH = { x: 5.7, z: 3.45 };
const FLOOR = 0.04;
const WALL_H = 0.5;
const WALL_T = 0.06;

const glowMat = (color, k) => ({ color, emissive: color, k });
const floorMat = (color) => ({ color: scale(color, 0.3), emissive: color, k: 0.06 });
function scale(color, f) {
  const r = Math.round(((color >> 16) & 255) * f);
  const g = Math.round(((color >> 8) & 255) * f);
  const b = Math.round((color & 255) * f);
  return (r << 16) | (g << 8) | b;
}

// Plain-data description of every material; MiniOffice turns these into three.js materials.
export const MATERIALS = {
  plinth: { color: 0x07131d },
  hall: { color: 0x1a3347 },
  wall: { color: 0x17405c, opacity: 0.8 },
  wood: { color: 0x1f3e57 },
  white: { color: 0xdfeaf2, emissive: 0xdfeaf2, k: 0.12 },
  shell: { color: 0x0d2132, metal: 0.35 },
  dark: { color: 0x0a141c },
  metal: { color: 0x9fb4c4, metal: 0.6 },
  leaf: { color: 0x2f9e66, emissive: 0x0d3a24, k: 0.5 },
  leaf2: { color: 0x4cc58a, emissive: 0x0d3a24, k: 0.4 },
  pot: { color: 0xb45c3c },
  sofa: { color: 0x4a3a85 },
  arcade: { color: 0x3a2b7a },
  screen: glowMat(0x06202a, 0.7),
  rim: glowMat(0x00e5ff, 0.5),
  mat: glowMat(0x00e5ff, 0.35),
  led0: glowMat(0x5ef2a0, 0.8),
  led1: glowMat(0x00e5ff, 0.8),
  led2: glowMat(0x5ef2a0, 0.8),
  cyan: glowMat(0x00e5ff, 0.5),
  cyanSoft: glowMat(0x00e5ff, 0.12),
  violet: glowMat(0xa78bfa, 0.18),
  blue: glowMat(0x6ec6ff, 0.9),
  amber: glowMat(0xffc857, 0.9),
  coral: glowMat(0xff4d8d, 0.55),
  pink: glowMat(0xff7fa8, 0.4),
  red: glowMat(0xff4d4d, 1.2),
  stick0: glowMat(0xffc857, 0.55),
  stick1: glowMat(0xff4d8d, 0.55),
  stick2: glowMat(0x00e5ff, 0.55),
  stick3: glowMat(0xa78bfa, 0.55),
  stick4: glowMat(0x5ef2a0, 0.55),
  ...Object.fromEntries(ROOMS.map((r) => [`floor.${r.key}`, floorMat(r.color)])),
  // One kanban column per Board lane: a dim column and brighter cards.
  ...Object.fromEntries([0x8199a8, 0x00e5ff, 0xffc857, 0xff4d8d, 0xa78bfa, 0x5ef2a0, 0xff5f5f].flatMap((c, i) => [[`lane${i}`, glowMat(c, 0.25)], [`card${i}`, glowMat(c, 0.9)]])),
};

export const PARTS = [];
const box = (m, w, h, d, x, y, z) => PARTS.push({ t: 'box', m, s: [w, h, d], p: [x, y, z] });
const cyl = (m, r, h, x, y, z, sx = 1, sz = 1) => PARTS.push({ t: 'cyl', m, r, h, sx, sz, p: [x, y, z] });
const ball = (m, r, x, y, z, sy = 1) => PARTS.push({ t: 'ball', m, r, sy, p: [x, y, z] });

function plant(x, z, s = 1) {
  cyl('pot', 0.08 * s, 0.12 * s, x, FLOOR + 0.06 * s, z);
  ball('leaf', 0.13 * s, x, FLOOR + 0.22 * s, z);
  ball('leaf2', 0.09 * s, x + 0.05 * s, FLOOR + 0.34 * s, z - 0.02 * s);
}

function sofa(x, z, w, backZ) {
  box('sofa', w, 0.1, 0.4, x, 0.1, z);
  box('sofa', w, 0.26, 0.09, x, 0.17, backZ);
  box('sofa', 0.08, 0.2, 0.4, x - w / 2 + 0.04, 0.14, z);
  box('sofa', 0.08, 0.2, 0.4, x + w / 2 - 0.04, 0.14, z);
}

// A wall along x at depth z, with gaps (doors) left open.
function wallZ(x1, x2, z, gaps = []) {
  const seg = (a, b) => box('wall', b - a, WALL_H, WALL_T, (a + b) / 2, WALL_H / 2, z);
  let cur = x1;
  for (const g of [...gaps].sort((p, q) => p - q)) {
    if (g - 0.4 > cur) seg(cur, g - 0.4);
    cur = g + 0.4;
  }
  if (x2 > cur) seg(cur, x2);
}
const wallX = (z1, z2, x) => box('wall', WALL_T, WALL_H, z2 - z1, x, WALL_H / 2, (z1 + z2) / 2);

function shell() {
  box('plinth', 11.4, 0.12, 6.9, 0, -0.06, 0);
  for (const r of ROOMS) box(`floor.${r.key}`, r.x2 - r.x1 - 0.05, 0.04, r.z2 - r.z1 - 0.05, r.cx, 0.02, r.cz);
  box('hall', 11, 0.04, 0.7, 0, 0.02, 0);
  wallZ(-5.5, 5.5, -3.2);
  wallZ(-5.5, 5.5, 3.2, [-4.5]);
  wallX(-3.2, 3.2, -5.5);
  wallX(-3.2, 3.2, 5.5);
  wallZ(-5.5, 5.5, -0.35, [ROOMS[0].doorX, ROOMS[1].doorX]);
  wallZ(-5.5, 5.5, 0.35, ROOMS.slice(2).map((r) => r.doorX));
  wallX(-3.2, -0.35, 0.5);
  for (const x of [-3.5, -1.1, 1.1, 3.7]) wallX(0.35, 3.2, x);
  box('rim', 11, 0.012, 0.07, 0, WALL_H + 0.006, -3.2);
  box('rim', 0.07, 0.012, 6.4, -5.5, WALL_H + 0.006, 0);
  box('rim', 0.07, 0.012, 6.4, 5.5, WALL_H + 0.006, 0);
  box('mat', 1.0, 0.012, 0.5, -4.5, FLOOR + 0.006, 2.95);
}

function workspace() {
  for (const dz of DESK_Z) for (const dx of DESK_X) {
    box('wood', 0.8, 0.03, 0.42, dx, FLOOR + 0.2, dz);
    box('wood', 0.7, 0.17, 0.04, dx, FLOOR + 0.1, dz - 0.17);
    box('shell', 0.38, 0.24, 0.03, dx, FLOOR + 0.395, dz - 0.08);
    box('screen', 0.34, 0.2, 0.012, dx, FLOOR + 0.395, dz - 0.062);
  }
  box('cyanSoft', 0.7, 0.012, 2.4, -2.5, FLOOR + 0.006, -1.85);
  box('white', 0.03, 0.46, 2.5, -5.47, 0.27, -1.9);
  for (let i = 0; i < 7; i++) {
    const z = -2.95 + i * 0.35;
    box(`lane${i}`, 0.012, 0.38, 0.3, -5.45, 0.27, z);
    for (let j = 0; j < (i % 3) + 1; j++) box(`card${i}`, 0.014, 0.1, 0.2, -5.44, 0.4 - j * 0.1, z);
  }
  cyl('white', 0.1, 0.34, -5.2, 0.21, -0.55);
  ball('blue', 0.1, -5.2, 0.45, -0.55);
  box('metal', 0.32, 0.14, 0.26, 0.1, FLOOR + 0.07, -0.62);
  plant(-5.2, -3.0);
  plant(0.15, -3.0);
  plant(0.15, -1.8, 0.8);
}

function meetingRoom() {
  const [cx, cz] = MEET_CENTER;
  cyl('violet', 1, 0.012, cx, FLOOR + 0.006, cz, 2.0, 1.1);
  cyl('wood', 1, 0.04, cx, FLOOR + 0.2, cz, 1.2, 0.6);
  cyl('shell', 0.14, 0.2, cx, FLOOR + 0.1, cz);
  box('white', 2.6, 0.44, 0.03, 3.0, 0.27, -3.15);
  for (let i = 0; i < 10; i++) box(`stick${i % 5}`, 0.18, 0.14, 0.012, 2.1 + (i % 5) * 0.45, 0.2 + Math.floor(i / 5) * 0.2, -3.13);
  plant(0.85, -3.0);
  plant(5.2, -3.0);
  plant(5.2, -0.65, 0.9);
}

function lobbyAndPantry() {
  box('wood', 0.9, 0.22, 0.32, -4.0, FLOOR + 0.11, 0.7);
  box('cyan', 0.96, 0.02, 0.36, -4.0, FLOOR + 0.23, 0.7);
  box('cyan', 0.5, 0.09, 0.01, -4.0, 0.17, 0.87);
  sofa(-4.2, 2.35, 0.8, 2.52);
  cyl('wood', 0.14, 0.02, -4.2, 0.17, 1.95);
  box('blue', 0.03, 0.22, 0.7, -5.47, 0.3, 1.8);
  plant(-5.2, 3.0);
  plant(-3.75, 3.0, 0.9);
  box('wood', 1.1, 0.24, 0.3, -1.95, FLOOR + 0.12, 0.62);
  box('white', 1.14, 0.02, 0.34, -1.95, FLOOR + 0.25, 0.62);
  box('shell', 0.16, 0.26, 0.16, -2.3, 0.43, 0.6);
  box('metal', 0.24, 0.14, 0.2, -1.8, 0.35, 0.62);
  box('white', 0.28, 0.62, 0.28, -1.25, 0.35, 0.58);
  box('dark', 0.26, 0.6, 0.26, -3.34, 0.34, 0.75);
  box('coral', 0.2, 0.4, 0.01, -3.34, 0.36, 0.885);
  cyl('wood', 0.3, 0.03, -1.9, 0.2, 2.3);
  cyl('shell', 0.04, 0.17, -1.9, 0.115, 2.3);
  for (const sx of [-2.4, -1.4]) cyl('sofa', 0.11, 0.03, sx, 0.15, 2.3);
  plant(-3.3, 2.95);
}

function serverAndLounge() {
  [0.1, 0.45, 0.8].forEach((x, i) => {
    box('shell', 0.28, 0.62, 0.3, x, FLOOR + 0.31, 0.62);
    for (let k = 0; k < 5; k++) box(`led${(i + k) % 3}`, 0.2, 0.022, 0.01, x, 0.17 + k * 0.095, 0.775);
  });
  box('wood', 0.9, 0.2, 0.36, 0.2, FLOOR + 0.1, 2.75);
  box('shell', 0.28, 0.2, 0.03, 0.05, 0.42, 2.66);
  box('screen', 0.24, 0.16, 0.012, 0.05, 0.42, 2.678);
  box('screen', 0.03, 0.3, 0.7, -1.07, 0.3, 1.8);
  plant(0.9, 2.95, 0.9);
  cyl('pink', 1, 0.012, 2.75, FLOOR + 0.006, 1.7, 0.9, 0.8);
  sofa(2.75, 0.85, 1.1, 0.66);
  box('arcade', 0.26, 0.5, 0.26, 3.5, 0.29, 0.75);
  box('screen', 0.2, 0.14, 0.012, 3.5, 0.38, 0.885);
  box('coral', 0.22, 0.05, 0.02, 3.5, 0.55, 0.87);
  cyl('wood', 0.33, 0.04, 2.75, 0.17, 1.75);
  cyl('shell', 0.04, 0.13, 2.75, 0.1, 1.75);
  ball('pink', 0.22, 2.0, FLOOR + 0.12, 2.55, 0.65);
  ball('violet', 0.2, 3.3, FLOOR + 0.11, 2.6, 0.65);
  plant(3.5, 2.95, 0.9);
}

function studio() {
  box('white', 0.44, 0.34, 0.02, 5.05, 0.4, 0.83);
  box('violet', 0.4, 0.3, 0.01, 5.05, 0.4, 0.845);
  box('coral', 0.4, 0.07, 0.012, 5.05, 0.3, 0.852);
  ball('amber', 0.055, 5.15, 0.46, 0.855);
  box('wood', 0.8, 0.2, 0.36, 4.55, FLOOR + 0.1, 2.75);
  box('shell', 0.3, 0.22, 0.03, 4.5, 0.43, 2.66);
  box('coral', 0.26, 0.18, 0.012, 4.5, 0.43, 2.678);
  [[2.0, 'coral'], [2.5, 'cyan'], [3.0, 'amber']].forEach(([z, m]) => {
    box('white', 0.03, 0.2, 0.3, 5.47, 0.3, z);
    box(m, 0.012, 0.15, 0.24, 5.45, 0.3, z);
  });
  plant(5.2, 3.0, 0.9);
}

shell();
workspace();
meetingRoom();
lobbyAndPantry();
serverAndLounge();
studio();
