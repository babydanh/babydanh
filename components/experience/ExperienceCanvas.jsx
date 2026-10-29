'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stats, useGLTF } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { herdrScene } from './herdrView';
import MiniOffice from './office/MiniOffice';
import { usePresence } from './office/usePresence';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const MODEL_URL = `${BASE_PATH}/models/desk.glb`;
// Pictures painted onto the monitor. The snake is the README's own contribution graph; its host allows cross-origin reads.
const SCREEN_ART = {
  avatar: `${BASE_PATH}/avatar-sm.jpg`,
  snake: 'https://raw.githubusercontent.com/babydanh/babydanh/output/github-contribution-grid-snake-dark.svg',
};

const PRESENCE_URL = process.env.NEXT_PUBLIC_PRESENCE_URL; // unset: the office simulates itself

// Camera stations around the desk (meters, Y up). Each chapter looks at one prop group.
const CHAPTER_CAMERA = {
  boot: { position: [0.8, 0.75, 2.0], look: [0.08, 0.15, -0.1], fov: 30 },
  hub: { position: [0.45, 0.62, 1.55], look: [0.1, 0.14, -0.05], fov: 30 },
  map: { position: [0.16, 0.3, 0.9], look: [0.26, 0.31, -0.3], fov: 32 },
  loadout: { position: [-0.2, 0.34, 0.85], look: [0.26, 0.31, -0.3], fov: 32 },
  contact: { position: [0.7, 0.34, 0.7], look: [0.27, 0.3, -0.3], fov: 32 },
  // Close over the office on the right of the desk, in front of the monitor stand.
  office: { position: [0.49, 0.28, 0.36], look: [0.49, 0.005, -0.125], fov: 30 },
  // Close-ups the visitor reaches by clicking an object; they are not stations on the scroll loop.
  screen: { position: [0.247, 0.27, 0.47], look: [0.247, 0.255, -0.28], fov: 30 },
  laptop: { position: [-0.22, 0.22, 0.48], look: [-0.22, 0.06, 0.03], fov: 30 },
  keyboard: { position: [0.1, 0.2, 0.36], look: [0.1, 0.01, 0.06], fov: 30 },
};

// Invisible boxes over the clickable objects. Raycasting these is far cheaper than raycasting the model.
const FOCUS_TARGETS = [
  { key: 'screen', position: [0.247, 0.255, -0.28], size: [0.56, 0.33, 0.05] },
  { key: 'laptop', position: [-0.22, 0.08, 0.02], size: [0.32, 0.17, 0.26] },
  { key: 'keyboard', position: [0.098, 0.015, 0.058], size: [0.35, 0.04, 0.16] },
  { key: 'office', position: [0.49, 0.03, -0.125], size: [0.35, 0.06, 0.215] },
];

// Monitor pages, keyed like CHAPTER_CAMERA. Content mirrors the profile README.
const SCREEN_PAGES = {
  hub: {
    tag: '~/home', accent: '#00e5ff', title: "Hi, I'm Danh.", sub: 'Full-Stack & Mobile Developer from Vietnam',
    items: [['Education', 'IT student @ HUFLIT University'], ['Building', 'Sporto, a pickleball tournament platform'], ['Interests', 'Trading EAs, Minecraft, Valorant']],
    chips: [],
    avatar: true,
    snake: true,
  },
  map: {
    tag: '~/work', accent: '#a78bfa', title: 'Selected work', sub: 'Things I have built and shipped',
    items: [
      ['Sporto', 'Pickleball tournament platform: registration, draws, court scheduling, live scoring'],
      ['autotestSportO', 'Playwright E2E and API tests for Sporto, results synced to Excel'],
      ['expressjsbooking', 'Backend for an appointment booking system'],
      ['agent-orchestrator', 'Runs AI coding agents and E2E pipelines on GitHub Actions'],
    ],
    chips: [],
  },
  loadout: {
    tag: '~/about', accent: '#ffc857', title: 'About me', sub: 'What I work with every day',
    items: [
      ['Languages', 'TypeScript, Dart, Python, C#, Java'],
      ['Stack', 'Next.js, NestJS, Flutter, PostgreSQL/PostGIS, Redis, Docker'],
      ['Tooling', 'AI coding agents, GitHub Actions, Playwright, Git, Figma'],
    ],
    chips: [],
  },
  contact: {
    tag: '~/contact', accent: '#ff4d8d', title: "Let's talk.", sub: 'Find me online',
    items: [['GitHub', 'github.com/babydanh'], ['Discord', 'babydanh'], ['Portfolio', 'babydanh.github.io/babydanh']],
    chips: [],
  },
  office: {
    tag: '~/office', accent: '#5ef2a0', title: 'The office', sub: 'Twelve garlic bulbs, hard at work',
    items: [['status', 'Everyone is settling in...']],
    chips: [],
  },
};
const SCREEN_W = 1600;
const SCREEN_H = 925;
const LABEL_W = 330;
const MONITOR_SIZE = [0.545, 0.315];
const LOG_LINES = 5;
const LOG_REPAINT_MS = 1500;
// The laptop panel is a bare quad with no UVs, so a plane of the same size is laid over it.
const LAPTOP_SIZE = [0.291, 0.1745];
const LAPTOP_W = 1280;
const LAPTOP_H = 768;
const HERDR_REPAINT_MS = 700;

const wrap = (index, count) => ((index % count) + count) % count;

const prefersCalm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The office page lists the latest things the residents said; every other page is static.
function pageFor(chapter, log) {
  const page = SCREEN_PAGES[chapter] || SCREEN_PAGES.hub;
  if (chapter !== 'office' || !log.length) return page;
  const live = log[log.length - 1].live;
  return { ...page, sub: live ? 'Live: what the AI agents are doing right now' : page.sub, items: log.slice(-LOG_LINES).map(({ role, text }) => [role, text]) };
}

// Break `text` into lines no wider than `maxWidth` for the current ctx font.
function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  text.split(' ').forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  return line ? [...lines, line] : lines;
}

// The monitor is a GitHub repository page: the profile README in GitHub's dark theme, one page per station.
const GITHUB = { bg: '#0d1117', bar: '#161b22', border: '#30363d', rule: '#21262d', text: '#e6edf3', body: '#c9d1d9', muted: '#8b949e', link: '#4493f8' };
const SANS = "'Segoe UI', -apple-system, Helvetica, Arial, sans-serif";
const MONO = "'DM Mono', monospace";
const OCTOCAT_PATH = 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.22 1.88.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z';
const CARD = { x: 90, y: 126, w: 1420, h: 739 };
const CARD_PAD = 44;
const ROW_LINE = 42;

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

// Top bar: logo, "owner / repo" and the visibility pill.
function drawTopBar(ctx) {
  ctx.fillStyle = GITHUB.bar;
  ctx.fillRect(0, 0, SCREEN_W, 96);
  ctx.fillStyle = GITHUB.border;
  ctx.fillRect(0, 95, SCREEN_W, 1);
  ctx.save();
  ctx.translate(CARD.x, 22);
  ctx.scale(3.25, 3.25);
  ctx.fillStyle = GITHUB.text;
  ctx.fill(new Path2D(OCTOCAT_PATH));
  ctx.restore();
  let cursor = CARD.x + 76;
  [['babydanh', GITHUB.link, 400], [' / ', GITHUB.muted, 400], ['babydanh', GITHUB.link, 700]].forEach(([text, color, weight]) => {
    ctx.font = `${weight} 36px ${SANS}`;
    ctx.fillStyle = color;
    ctx.fillText(text, cursor, 62);
    cursor += ctx.measureText(text).width;
  });
  ctx.font = `500 24px ${SANS}`;
  roundedRect(ctx, cursor + 22, 32, ctx.measureText('Public').width + 36, 38, 19);
  ctx.strokeStyle = GITHUB.border;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = GITHUB.muted;
  ctx.fillText('Public', cursor + 40, 59);
}

// File header of the card: the README.md tab (underlined in the page accent) and the station tag.
function drawFileHeader(ctx, page) {
  const { x, y, w } = CARD;
  ctx.fillStyle = GITHUB.bar;
  ctx.fillRect(x, y, w, 64);
  ctx.fillStyle = GITHUB.border;
  ctx.fillRect(x, y + 63, w, 1);
  ctx.font = `600 26px ${SANS}`;
  ctx.fillStyle = GITHUB.text;
  ctx.fillText('README.md', x + 30, y + 41);
  ctx.fillStyle = page.accent;
  ctx.fillRect(x + 24, y + 60, ctx.measureText('README.md').width + 12, 4);
  ctx.font = `400 24px ${MONO}`;
  ctx.fillStyle = GITHUB.muted;
  ctx.textAlign = 'right';
  ctx.fillText(page.tag, x + w - 30, y + 41);
  ctx.textAlign = 'left';
}

// Label and body in two columns with hairlines between rows, like a README table.
function drawRows(ctx, items, top) {
  const { x, w } = CARD;
  const labelWidth = LABEL_W;
  const bodyWidth = w - CARD_PAD * 2 - labelWidth - 20;
  let rowTop = top;
  items.forEach(([label, body]) => {
    ctx.font = `400 30px ${SANS}`;
    const lines = wrapLines(ctx, body, bodyWidth);
    ctx.fillStyle = GITHUB.rule;
    ctx.fillRect(x + CARD_PAD, rowTop, w - CARD_PAD * 2, 1);
    ctx.font = `600 30px ${SANS}`;
    ctx.fillStyle = GITHUB.text;
    ctx.fillText(label, x + CARD_PAD, rowTop + 38);
    ctx.font = `400 30px ${SANS}`;
    ctx.fillStyle = GITHUB.body;
    lines.forEach((line, row) => ctx.fillText(line, x + CARD_PAD + labelWidth, rowTop + 38 + row * ROW_LINE));
    rowTop += lines.length * ROW_LINE + 30;
  });
}

function drawChips(ctx, chips) {
  const { x, y, h } = CARD;
  let cursor = x + CARD_PAD;
  ctx.font = `500 26px ${MONO}`;
  chips.forEach((chip) => {
    const width = ctx.measureText(chip).width + 44;
    roundedRect(ctx, cursor, y + h - 96, width, 52, 26);
    ctx.fillStyle = GITHUB.rule;
    ctx.fill();
    ctx.strokeStyle = GITHUB.border;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = GITHUB.body;
    ctx.fillText(chip, cursor + 22, y + h - 60);
    cursor += width + 16;
  });
}

// Profile photo: a round crop with an accent ring.
function drawAvatar(ctx, image, accent, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(image, cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  ctx.stroke();
}

// The contribution snake fills the band under the rows, kept at its own aspect ratio and centred.
function drawSnake(ctx, image) {
  const top = CARD.y + 514;
  const height = CARD.y + CARD.h - 24 - top;
  const width = Math.min(CARD.w - CARD_PAD * 2, height * (image.width / image.height));
  ctx.drawImage(image, CARD.x + (CARD.w - width) / 2, top, width, width * (image.height / image.width));
}

function drawScreen(ctx, page, art = {}) {
  const { x, y, w, h } = CARD;
  ctx.fillStyle = GITHUB.bg;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.textBaseline = 'alphabetic';
  drawTopBar(ctx);

  // The README card; anything that would spill past its rounded edge is clipped.
  ctx.save();
  roundedRect(ctx, x, y, w, h, 14);
  ctx.clip();
  drawFileHeader(ctx, page);
  const titleBase = y + 164;
  ctx.font = `600 56px ${SANS}`;
  ctx.fillStyle = GITHUB.text;
  ctx.fillText(page.title, x + CARD_PAD, titleBase);
  ctx.fillStyle = GITHUB.rule;
  ctx.fillRect(x + CARD_PAD, titleBase + 22, w - CARD_PAD * 2, 2);
  ctx.font = `400 30px ${SANS}`;
  ctx.fillStyle = GITHUB.muted;
  ctx.fillText(page.sub, x + CARD_PAD, titleBase + 72);
  drawRows(ctx, page.items, titleBase + 112);
  drawChips(ctx, page.chips);
  if (page.avatar && art.avatar) drawAvatar(ctx, art.avatar, page.accent, CARD.x + CARD.w - CARD_PAD - 84, CARD.y + 182, 78);
  if (page.snake && art.snake) drawSnake(ctx, art.snake);
  ctx.restore();

  roundedRect(ctx, x, y, w, h, 14);
  ctx.strokeStyle = GITHUB.border;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Outer LED strips baked into the model, and the laptop's decorative bars (its screen is painted instead); all hidden.
const HIDDEN_LEDS = ['mat_edge_f', 'mat_edge_l', 'mon_leg_line', 'lt_lines_c', 'lt_lines_p', 'lt_lines_v'];
// Materials that cycle through the rainbow in lockstep and blink: [name, base emissive intensity].
const RGB_MATERIALS = [['s75_strip_cyan', 3], ['s75_strip_green', 3], ['s75_glow', 1.6], ['lt_backlight', 3]];

// Make room for the office: the keyboard and mouse slide left, the pencil cup slides right. [node name prefix, metres along x]
const DESK_SHIFTS = [['s75_', -0.035], ['mouse', -0.035], ['stationery_supplies_', 0.06]];

// Desk lamp: aim the shade (local axis pivot -> shade centre) at the desk instead of out of the room.
const LAMP_AXIS = new THREE.Vector3(0.159, -0.095, 0.19).normalize();
const LAMP_BULB = [-0.683, 0.364, -0.265];
const LAMP_AIM = new THREE.Vector3(-0.15, 0.02, 0.05);

// ---- README page: the whole profile README painted on the monitor, laid out once and scrolled by `scroll` pixels.
const README_VIEW_H = CARD.h - 64;
const README_HEAD = { accent: '#00e5ff', tag: '~/readme' };
const README_LABEL_W = 380;
const SNAKE_H = 290;

function layoutReadme(ctx, blocks) {
  const left = CARD.x + CARD_PAD;
  const inner = CARD.w - CARD_PAD * 2;
  const mid = CARD.x + CARD.w / 2;
  const items = [];
  const text = (value, x, y, font, color, align = 'left', maxWidth) => items.push({ value, x, y, font, color, align, maxWidth });
  text('babydanh', mid, 232, `700 44px ${SANS}`, GITHUB.text, 'center');
  text('An IT Student and Developer', mid, 274, `400 26px ${SANS}`, GITHUB.muted, 'center');
  let y = 330;
  blocks.forEach((block) => {
    if (block.type === 'h') {
      const big = block.level <= 2;
      text(block.text, mid, y + 38, `600 ${big ? 38 : 32}px ${SANS}`, GITHUB.text, 'center');
      if (big) items.push({ rule: true, x: left, y: y + 58, w: inner });
      y += big ? 104 : 72;
    } else if (block.type === 'p') {
      ctx.font = `400 28px ${SANS}`;
      const lines = wrapLines(ctx, block.text, inner);
      lines.forEach((line, row) => text(line, mid, y + 30 + row * 40, ctx.font, GITHUB.muted, 'center'));
      y += lines.length * 40 + 18;
    } else if (block.type === 'li') {
      ctx.font = `400 28px ${SANS}`;
      const lines = wrapLines(ctx, block.text, inner - 56);
      text('•', left + 10, y + 30, ctx.font, GITHUB.muted);
      lines.forEach((line, row) => text(line, left + 44, y + 30 + row * 40, ctx.font, GITHUB.body));
      y += lines.length * 40 + 8;
    } else {
      ctx.font = `400 26px ${SANS}`;
      const lines = wrapLines(ctx, block.cells.slice(1).join('  ·  '), inner - README_LABEL_W);
      text(block.cells[0], left + 10, y + 30, `600 26px ${SANS}`, GITHUB.link, 'left', README_LABEL_W - 24);
      lines.forEach((line, row) => text(line, left + README_LABEL_W, y + 30 + row * 36, ctx.font, GITHUB.body));
      y += Math.max(1, lines.length) * 36 + 26;
    }
  });
  return { items, snakeY: y + 20, height: y + 20 + SNAKE_H + 60 };
}

function drawReadme(ctx, layout, scroll, art) {
  const { x, y, w, h } = CARD;
  const top = y + 64;
  ctx.fillStyle = GITHUB.bg;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.textBaseline = 'alphabetic';
  drawTopBar(ctx);
  ctx.save();
  roundedRect(ctx, x, y, w, h, 14);
  ctx.clip();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, top, w, README_VIEW_H);
  ctx.clip();
  ctx.translate(0, top - scroll);
  if (art.avatar) drawAvatar(ctx, art.avatar, README_HEAD.accent, x + w / 2, 110, 70);
  layout.items.forEach((item) => {
    const onScreen = item.y - scroll;
    if (onScreen < -60 || onScreen > README_VIEW_H + 60) return;
    if (item.rule) {
      ctx.fillStyle = GITHUB.rule;
      ctx.fillRect(item.x, item.y, item.w, 2);
      return;
    }
    ctx.font = item.font;
    ctx.fillStyle = item.color;
    ctx.textAlign = item.align;
    ctx.fillText(item.value, item.x, item.y, item.maxWidth);
  });
  ctx.textAlign = 'left';
  if (art.snake) ctx.drawImage(art.snake, x + CARD_PAD, layout.snakeY, CARD.w - CARD_PAD * 2, (CARD.w - CARD_PAD * 2) * (art.snake.height / art.snake.width));
  ctx.restore();
  drawFileHeader(ctx, README_HEAD);
  const max = layout.height - README_VIEW_H;
  if (max > 0) {
    const track = README_VIEW_H - 16;
    const thumb = Math.max(48, (track * README_VIEW_H) / layout.height);
    roundedRect(ctx, x + w - 14, top + 8 + (track - thumb) * (scroll / max), 6, thumb, 3);
    ctx.fillStyle = GITHUB.border;
    ctx.fill();
  }
  ctx.restore();
  roundedRect(ctx, x, y, w, h, 14);
  ctx.strokeStyle = GITHUB.border;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ---- Laptop: a herdr-style terminal. Agent list on the left, command log on the right.
const HERDR = { bg: '#0b0f14', bar: '#131a22', rule: '#1f2933', text: '#d7e0ea', muted: '#6b7a8a', cmd: '#5ef2a0', working: '#ffc857', blocked: '#ff5d73', error: '#ff5d73', idle: '#6b7a8a' };
const HERDR_SIDE = 340;

function drawHerdr(ctx, scene, cursorOn) {
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = HERDR.bg;
  ctx.fillRect(0, 0, LAPTOP_W, LAPTOP_H);
  ctx.fillStyle = HERDR.bar;
  ctx.fillRect(0, 0, LAPTOP_W, 52);
  ctx.font = `700 26px ${MONO}`;
  ctx.fillStyle = HERDR.cmd;
  ctx.fillText('herdr', 24, 35);
  ctx.font = `400 22px ${MONO}`;
  ctx.fillStyle = HERDR.muted;
  ctx.fillText(scene.live ? 'live · Board' : 'demo session', 130, 35);
  ctx.textAlign = 'right';
  ctx.fillText(`${scene.agents.length} agents`, LAPTOP_W - 24, 35);
  ctx.textAlign = 'left';
  ctx.fillStyle = HERDR.rule;
  ctx.fillRect(HERDR_SIDE, 52, 2, LAPTOP_H - 52);

  scene.agents.slice(0, 10).forEach((agent, row) => {
    const rowY = 108 + row * 58;
    ctx.beginPath();
    ctx.arc(34, rowY - 8, 9, 0, Math.PI * 2);
    ctx.fillStyle = HERDR[agent.state] || HERDR.idle;
    ctx.fill();
    ctx.font = `600 26px ${SANS}`;
    ctx.fillStyle = HERDR.text;
    ctx.fillText(agent.name, 58, rowY, 150);
    ctx.font = `400 20px ${MONO}`;
    ctx.fillStyle = HERDR[agent.state] || HERDR.idle;
    ctx.textAlign = 'right';
    ctx.fillText(agent.state, HERDR_SIDE - 24, rowY);
    ctx.textAlign = 'left';
  });

  const left = HERDR_SIDE + 34;
  const maxWidth = LAPTOP_W - left - 24;
  ctx.font = `400 23px ${MONO}`;
  scene.lines.forEach((line, row) => {
    const lineY = 108 + row * 40;
    if (line.kind === 'cmd') {
      ctx.fillStyle = HERDR.cmd;
      ctx.fillText('$', left, lineY);
      ctx.fillStyle = HERDR.text;
      ctx.fillText(line.text, left + 30, lineY, maxWidth - 30);
    } else {
      ctx.fillStyle = HERDR.muted;
      ctx.fillText(line.text, left + 30, lineY, maxWidth - 30);
    }
  });
  if (cursorOn) {
    ctx.fillStyle = HERDR.cmd;
    ctx.fillRect(left + 30, 108 + scene.lines.length * 40 - 22, 12, 26);
  }
}

// A canvas with a texture, painted by hand and uploaded to the GPU once.
function paintable(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { canvas, texture };
}

function Desk({ chapter, logRef, focusRef, scrollRef, blocks, presenceRef }) {
  const { scene, nodes, materials } = useGLTF(MODEL_URL);
  const screen = nodes.mon_screen;
  const laptop = nodes.lt_display;
  const wallLed = useRef(null);
  const lampTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.copy(LAMP_AIM);
    return target;
  }, []);
  // One canvas and texture per page, painted and uploaded up front, so a station change only swaps the texture.
  const gl = useThree((state) => state.gl);
  const pages = useMemo(() => Object.fromEntries([...Object.keys(SCREEN_PAGES), 'readme'].map((key) => [key, paintable(SCREEN_W, SCREEN_H)])), []);
  const laptopPage = useMemo(() => paintable(LAPTOP_W, LAPTOP_H), []);
  const seenEntry = useRef(null);
  const screenMaterial = useRef(null);
  const art = useRef({});
  const readmeLayout = useRef(null);
  const readmeShown = useRef(0); // the scroll offset currently painted; eases towards scrollRef
  const readmeDrawn = useRef(-1);
  // Skip the flashing for visitors who ask for reduced motion.
  const calm = useMemo(prefersCalm, []);

  useEffect(() => {
    HIDDEN_LEDS.forEach((name) => { if (nodes[name]) nodes[name].visible = false; });
    // The model is cached and this effect can run twice, so shift from the remembered original position.
    Object.entries(nodes).forEach(([name, node]) => {
      const shift = DESK_SHIFTS.find(([prefix]) => name.startsWith(prefix));
      if (!shift) return;
      node.userData.baseX ??= node.position.x;
      node.position.x = node.userData.baseX + shift[1];
    });
    // The wall bar shares its material with the sign, so give it its own to recolour.
    const bar = nodes.neon_back_p;
    if (bar) {
      wallLed.current = bar.material.clone();
      bar.material = wallLed.current;
    }
    // Keyboard underglow: drop the baked gradient so every LED shows the same cycling colour.
    if (materials.s75_glow) {
      materials.s75_glow.emissiveMap = null;
      materials.s75_glow.needsUpdate = true;
    }
    // Turn the desk lamp bulb on and swing the head towards the desk.
    if (materials.desk_lamp_arm_01_light) materials.desk_lamp_arm_01_light.emissiveIntensity = 3;
    const aim = LAMP_AIM.clone().sub(new THREE.Vector3(...LAMP_BULB)).normalize();
    ['b_geo_lamp-head', 'b_geo_lamp-head-button'].forEach((name) => {
      if (nodes[name]) nodes[name].quaternion.setFromUnitVectors(LAMP_AXIS, aim);
    });
  }, [nodes, materials]);

  const paintReadme = useCallback(() => {
    const { canvas, texture } = pages.readme;
    const ctx = canvas.getContext('2d');
    readmeLayout.current ??= layoutReadme(ctx, blocks);
    drawReadme(ctx, readmeLayout.current, readmeShown.current, art.current);
    readmeDrawn.current = readmeShown.current;
    texture.needsUpdate = true;
  }, [pages, blocks]);

  // Paint every page, and paint again once the web fonts have loaded.
  useEffect(() => {
    const paintAll = () => {
      Object.entries(pages).forEach(([key, { canvas, texture }]) => {
        if (key === 'readme') return;
        drawScreen(canvas.getContext('2d'), pageFor(key, logRef.current), art.current);
        texture.needsUpdate = true;
      });
      paintReadme();
    };
    const uploadAll = () => Object.values(pages).forEach(({ texture }) => gl.initTexture(texture));
    let cancelled = false;
    paintAll();
    document.fonts?.ready.then(() => {
      if (cancelled) return;
      readmeLayout.current = null; // the text is measured with the web fonts now
      paintAll();
      uploadAll();
    });
    // Each picture repaints the pages once it has arrived; one that fails to load is simply left out.
    const images = Object.entries(SCREEN_ART).map(([key, src]) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        art.current[key] = image;
        paintAll();
        uploadAll();
      };
      image.src = src;
      return image;
    });
    return () => {
      cancelled = true;
      images.forEach((image) => { image.onload = null; });
    };
  }, [pages, logRef, gl, paintReadme]);

  // The laptop types on: a new line every beat, or the Board's real agents when the relay is live.
  useEffect(() => {
    const { canvas, texture } = laptopPage;
    let tick = 0;
    let cancelled = false;
    const paint = () => {
      if (document.hidden) return; // nobody sees the laptop in a background tab
      drawHerdr(canvas.getContext('2d'), herdrScene(presenceRef.current, tick, Date.now()), tick % 2 === 0);
      texture.needsUpdate = true;
      tick += 1;
    };
    paint();
    document.fonts?.ready.then(() => { if (!cancelled) paint(); }); // text is measured with the web fonts
    if (calm) return () => { cancelled = true; };
    const timer = window.setInterval(paint, HERDR_REPAINT_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [laptopPage, presenceRef, calm]);

  // The office page repaints when the residents have said something new.
  useEffect(() => {
    if (chapter !== 'office') return undefined;
    const { canvas, texture } = pages.office;
    const repaint = () => {
      const latest = logRef.current[logRef.current.length - 1];
      if (latest === seenEntry.current) return;
      seenEntry.current = latest;
      drawScreen(canvas.getContext('2d'), pageFor('office', logRef.current));
      texture.needsUpdate = true;
    };
    repaint();
    const timer = window.setInterval(repaint, LOG_REPAINT_MS);
    return () => window.clearInterval(timer);
  }, [chapter, logRef, pages]);

  useFrame(({ clock }, delta) => {
    const reading = focusRef.current === 'screen';
    if (reading) {
      const max = Math.max(0, (readmeLayout.current?.height ?? 0) - README_VIEW_H);
      scrollRef.current = THREE.MathUtils.clamp(scrollRef.current, 0, max);
      const gap = scrollRef.current - readmeShown.current;
      readmeShown.current = Math.abs(gap) < 0.3 ? scrollRef.current : readmeShown.current + gap * (1 - Math.exp(-12 * delta));
      if (readmeShown.current !== readmeDrawn.current) paintReadme();
    } else {
      readmeShown.current = 0; // the next visit starts at the top, like the scroll offset does
    }
    if (screenMaterial.current) screenMaterial.current.map = (reading ? pages.readme : pages[chapter] || pages.hub).texture;
    const t = calm ? 0 : clock.elapsedTime;
    // ~0.6 Hz soft blink, never fully dark.
    const blink = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 3.9));
    RGB_MATERIALS.forEach(([name, base]) => {
      const material = materials[name];
      if (!material) return;
      material.emissive.setHSL((t * 0.15) % 1, 1, 0.5);
      material.emissiveIntensity = base * blink;
    });
    const wall = wallLed.current;
    if (!wall) return;
    wall.emissive.setHSL((t * 0.15 + 0.5) % 1, 1, 0.5);
    wall.emissiveIntensity = 4 * blink;
  });

  return (
    <>
      <primitive object={scene} />
      <primitive object={lampTarget} />
      <spotLight color="#ffd9a0" intensity={2} angle={0.7} penumbra={0.9} decay={2} distance={3} position={LAMP_BULB} target={lampTarget} />
      {screen && (
        // Same pose as the monitor panel, then tilt so +Y is screen-up and +Z is the screen normal.
        <group position={screen.position} quaternion={screen.quaternion}>
          <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
            <mesh>
              <planeGeometry args={MONITOR_SIZE} />
              <meshBasicMaterial ref={screenMaterial} map={pages.hub.texture} toneMapped={false} />
            </mesh>
          </group>
        </group>
      )}
      {laptop && (
        // The panel's visible side faces local -Y and its top edge is local +Z, so turn the plane a quarter about X.
        <group position={laptop.position} quaternion={laptop.quaternion}>
          <group rotation={[Math.PI / 2, 0, 0]} position={[0, -0.002, 0.11075]}>
            <mesh>
              <planeGeometry args={LAPTOP_SIZE} />
              <meshBasicMaterial map={laptopPage.texture} toneMapped={false} />
            </mesh>
          </group>
        </group>
      )}
    </>
  );
}

// The camera follows a fractional position that loops round `scenes`, blending the two stations either side of it.
// A clicked close-up (focusRef) overrides the scroll position until it is cleared.
function Rig({ scenes, progressRef, focusRef, pointerRef }) {
  const desired = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const other = useMemo(() => new THREE.Vector3(), []);
  const smoothLook = useMemo(() => new THREE.Vector3(...CHAPTER_CAMERA.boot.look), []);
  const fov = useMemo(() => ({ value: CHAPTER_CAMERA.boot.fov }), []);

  useFrame((state, delta) => {
    const { camera, size } = state;
    const pointer = pointerRef?.current || { x: 0, y: 0 };
    const position = progressRef.current;
    const from = Math.floor(position);
    const closeUp = focusRef.current ? CHAPTER_CAMERA[focusRef.current] : null;
    const a = closeUp || CHAPTER_CAMERA[scenes[wrap(from, scenes.length)]];
    const b = closeUp || CHAPTER_CAMERA[scenes[wrap(from + 1, scenes.length)]];
    const blend = closeUp ? 0 : THREE.MathUtils.smoothstep(position - from, 0, 1);
    look.set(...a.look).lerp(other.set(...b.look), blend);
    // Portrait screens crop the sides, so back the camera off from its look target.
    const fit = THREE.MathUtils.clamp(1.1 / (size.width / size.height), 1, 3);
    desired.set(...a.position).lerp(other.set(...b.position), blend).sub(look).multiplyScalar(fit).add(look);
    desired.x += pointer.x * 0.04;
    desired.y += pointer.y * 0.02;
    camera.position.lerp(desired, 1 - Math.exp(-3.8 * delta));
    smoothLook.lerp(look, 1 - Math.exp(-3.8 * delta));
    camera.lookAt(smoothLook);
    fov.value = THREE.MathUtils.damp(fov.value, THREE.MathUtils.lerp(a.fov, b.fov, blend), 4, delta);
    if (Math.abs(camera.fov - fov.value) > 0.01) {
      camera.fov = fov.value;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

// Hover shows a pointer; a click asks the shell to zoom to that object.
function FocusTargets({ onFocus }) {
  const dom = useThree((state) => state.gl.domElement);
  return FOCUS_TARGETS.map(({ key, position, size }) => (
    <mesh
      key={key}
      position={position}
      onClick={(event) => { event.stopPropagation(); onFocus(key); }}
      onPointerOver={(event) => { event.stopPropagation(); dom.style.cursor = 'pointer'; }}
      onPointerOut={() => { dom.style.cursor = ''; }}
    >
      <boxGeometry args={size} />
      <meshBasicMaterial visible={false} />
    </mesh>
  ));
}

function Scene({ chapter, scenes, progressRef, focusRef, scrollRef, blocks, pointerRef, onFocus }) {
  const calm = useMemo(prefersCalm, []);
  const presenceRef = usePresence(PRESENCE_URL);
  const logRef = useRef([]);
  const onLog = useCallback((entry) => {
    logRef.current.push(entry);
    if (logRef.current.length > LOG_LINES) logRef.current.shift();
  }, []);
  return (
    <>
      <color attach="background" args={['#02030a']} />
      <ambientLight color="#404070" intensity={0.35} />
      <directionalLight color="#dde6ff" intensity={0.8} position={[0.2, 0.9, 0.3]} />
      <pointLight color="#00e5ff" intensity={0.3} distance={2.5} position={[-0.7, 0.3, -0.3]} />
      <pointLight color="#ff4d8d" intensity={0.35} distance={2.5} position={[0.8, 0.3, -0.25]} />
      <Rig scenes={scenes} progressRef={progressRef} focusRef={focusRef} pointerRef={pointerRef} />
      <Suspense fallback={null}>
        <Desk chapter={chapter} logRef={logRef} focusRef={focusRef} scrollRef={scrollRef} blocks={blocks} presenceRef={presenceRef} />
      </Suspense>
      <MiniOffice active={chapter === 'office'} calm={calm} onLog={onLog} presenceRef={presenceRef} />
      <FocusTargets onFocus={onFocus} />
      {process.env.NODE_ENV === 'development' ? <Stats className="stats-corner" /> : null}
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.6} luminanceThreshold={1} radius={0.4} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  );
}

useGLTF.preload(MODEL_URL);

export default function ExperienceCanvas({ chapter, scenes, progressRef, focusRef, scrollRef, blocks, pointerRef, onFocus }) {
  return (
    <div className="experience-canvas" aria-hidden="true">
      <div className="canvas-vignette" />
      <Canvas camera={{ position: CHAPTER_CAMERA.boot.position, fov: CHAPTER_CAMERA.boot.fov, near: 0.05, far: 20 }} dpr={[0.75, 1]} onPointerMissed={() => onFocus(null)} frameloop="always" performance={{ min: 0.5, max: 1, debounce: 220 }} gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false, depth: true }}>
        <Scene chapter={chapter} scenes={scenes} progressRef={progressRef} focusRef={focusRef} scrollRef={scrollRef} blocks={blocks} pointerRef={pointerRef} onFocus={onFocus} />
      </Canvas>
    </div>
  );
}
