// Floor plan of the tiny office, in office-local units (x right, z towards the viewer, y up).
// Pure data: no three.js, no DOM, so the walking logic can be tested with plain node.

export const DOOR_HALF = 0.4; // half width of every door gap
export const HALL_Z = [-0.35, 0.35]; // the hall runs along z = 0 between the two rows of rooms

// A seat: where an agent stands, which way it faces, an optional raised y, waypoints (`via`) to leave it
// without cutting through furniture, and an optional activity that overrides the room's.
const seat = (x, z, face = 0, extra = {}) => ({ x, z, face, y: 0, via: [], act: null, ...extra });

function room(key, name, color, [x1, x2, z1, z2], doorX, act, say, spots) {
  // `dz` is the room edge that touches the hall, where its door is.
  return { key, name, color, x1, x2, z1, z2, doorX, dz: z2 < 0 ? z2 : z1, cx: (x1 + x2) / 2, cz: (z1 + z2) / 2, act, say, spots };
}

export const MEET_CENTER = [3.0, -1.75];
const meetSeats = [
  [4.85, -1.75, [[5.05, -1.05]]], [1.15, -1.75, [[0.95, -1.05]]],
  [4.42, -1.11, []], [1.58, -1.11, []],
  [4.42, -2.39, [[5.1, -2.39], [5.1, -1.05]]], [1.58, -2.39, [[0.9, -2.39], [0.9, -1.05]]],
].map(([x, z, via]) => seat(x, z, Math.atan2(MEET_CENTER[0] - x, MEET_CENTER[1] - z), { via }));

// Two rows of four desks; an agent stands behind its desk and the aisle at x = -2.5 leads to the door.
export const DESK_X = [-4.6, -3.4, -1.6, -0.4];
export const DESK_Z = [-2.4, -1.2];
const deskSeats = DESK_Z.flatMap((dz) => DESK_X.map((dx) => seat(dx, dz - 0.4, 0, { via: [[-2.5, dz - 0.4]] })));

export const ROOMS = [
  room('work', 'Workspace', 0x00e5ff, [-5.5, 0.5, -3.2, -0.35], -2.5, 'type',
    ['Typing…', 'One more fix', 'Almost done', 'Commit it'], deskSeats),
  room('meet', 'Meeting room', 0xa78bfa, [0.5, 5.5, -3.2, -0.35], 3.0, 'talk',
    ['Quick sync', 'Good idea', 'Decided!', 'Who takes this?'], meetSeats),
  room('lobby', 'Lobby', 0x6ec6ff, [-5.5, -3.5, 0.35, 3.2], -5.0, 'wave',
    ['Good morning', 'Visitor at the door'], [seat(-4.2, 1.25, 0, { via: [[-4.7, 1.3]] }), seat(-3.6, 1.25, 0, { via: [[-4.7, 1.3]] })]),
  room('pantry', 'Pantry', 0xffc857, [-3.5, -1.1, 0.35, 3.2], -2.9, 'sip',
    ['Coffee time', 'Quick break'], [seat(-2.2, 1.25, 0, { via: [[-2.85, 1.3]] }), seat(-1.6, 1.25, 0, { via: [[-2.85, 1.3]] })]),
  room('server', 'Server room', 0x5ef2a0, [-1.1, 1.1, 0.35, 3.2], -0.6, 'check',
    ['Checking the servers', 'All green'], [seat(0.2, 1.25, 0, { via: [[-0.55, 1.3]] }), seat(0.65, 1.25, 0, { via: [[-0.55, 1.3]] })]),
  room('lounge', 'Lounge', 0xff7fa8, [1.1, 3.7, 0.35, 3.2], 1.6, 'rest',
    ['Taking five', 'Yawn…', 'One more round'],
    [seat(2.45, 0.88, 0, { y: 0.12, via: [[2.0, 1.35]] }), seat(3.0, 0.88, 0, { y: 0.12, via: [[2.0, 1.35]] }), seat(2.0, 2.55, 0, { y: 0.1 }), seat(3.45, 1.15, Math.PI, { act: 'play', via: [[2.0, 1.35]] })]),
  room('studio', 'Studio', 0xff4d8d, [3.7, 5.5, 0.35, 3.2], 4.2, 'type',
    ['Mixing colours', 'Softer lines', 'Draft done'], [seat(4.45, 1.5, 0, { via: [[4.2, 1.45]] }), seat(5.0, 1.5, 0, { via: [[4.2, 1.45]] })]),
];

// Twelve residents. `prefs` are rooms they like to visit (repeats weight the choice); the rest is random.
export const CAST = [
  { role: 'Director', leaf: 0x00e5ff, skin: 0xf6efe4, home: 'meet', prefs: ['meet', 'meet', 'work', 'lobby', 'pantry'] },
  { role: 'Scout', leaf: 0x6ec6ff, skin: 0xf3d3dc, home: 'lobby', prefs: ['lobby', 'work', 'pantry', 'meet'] },
  { role: 'Reception', leaf: 0xffa85a, skin: 0xffe2c9, home: 'lobby', prefs: ['lobby', 'lobby', 'pantry', 'lounge'] },
  { role: 'Coder', leaf: 0xa78bfa, skin: 0xdcd0f0, home: 'work', prefs: ['work', 'work', 'work', 'pantry', 'meet'] },
  { role: 'Coder', leaf: 0xffc857, skin: 0xffd9bd, home: 'work', prefs: ['work', 'work', 'work', 'server', 'lounge'] },
  { role: 'Coder', leaf: 0xff4d8d, skin: 0xf6d6e4, home: 'work', prefs: ['work', 'work', 'work', 'meet', 'pantry'] },
  { role: 'Coder', leaf: 0x7be0ff, skin: 0xd8ecf6, home: 'work', prefs: ['work', 'work', 'work', 'pantry', 'lounge'] },
  { role: 'Coder', leaf: 0xffb86b, skin: 0xffe5c4, home: 'work', prefs: ['work', 'work', 'work', 'studio', 'meet'] },
  { role: 'Coder', leaf: 0xb6a4ff, skin: 0xe6defa, home: 'work', prefs: ['work', 'work', 'work', 'server', 'pantry'] },
  { role: 'Tester', leaf: 0x5ef2a0, skin: 0xdff3e4, home: 'server', prefs: ['server', 'server', 'work', 'lounge'] },
  { role: 'Tester', leaf: 0xbde85a, skin: 0xeaf3cf, home: 'server', prefs: ['server', 'work', 'work', 'meet'] },
  { role: 'Designer', leaf: 0xff6fb5, skin: 0xfad3e3, home: 'studio', prefs: ['studio', 'studio', 'lounge', 'pantry', 'meet'] },
];
