'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import MiniOffice from './office/MiniOffice';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const MODEL_URL = `${BASE_PATH}/models/desk.glb`;

// Camera stations around the desk (meters, Y up). Each chapter looks at one prop group.
const CHAPTER_CAMERA = {
  boot: { position: [0.8, 0.75, 2.0], look: [0.08, 0.15, -0.1], fov: 30 },
  hub: { position: [0.45, 0.62, 1.55], look: [0.1, 0.14, -0.05], fov: 30 },
  map: { position: [0.16, 0.3, 0.9], look: [0.26, 0.31, -0.3], fov: 32 },
  loadout: { position: [-0.2, 0.34, 0.85], look: [0.26, 0.31, -0.3], fov: 32 },
  contact: { position: [0.7, 0.34, 0.7], look: [0.27, 0.3, -0.3], fov: 32 },
  // Close over the tiny office that sits on the desk between the keyboard and the monitor stand.
  office: { position: [0.13, 0.2, 0.22], look: [0.13, 0.005, -0.11], fov: 30 },
};

// Monitor pages, keyed like CHAPTER_CAMERA. Content mirrors the profile README.
const SCREEN_PAGES = {
  hub: {
    tag: '~/home', accent: '#00e5ff', title: "Hi, I'm Danh.", sub: 'Full-Stack & Mobile Developer from Vietnam',
    items: [['Education', 'IT student @ HUFLIT University'], ['Building', 'Sporto, a pickleball tournament platform'], ['Interests', 'Trading EAs, Minecraft, Valorant']],
    chips: ['TypeScript', 'Dart', 'Python', 'C#', 'Java'],
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
const LABEL_W = 400;
const MONITOR_SIZE = [0.545, 0.315];
const LOG_LINES = 5;
const LOG_REPAINT_MS = 1000;

const prefersCalm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The office page lists the latest things the residents said; every other page is static.
function pageFor(chapter, log) {
  const page = SCREEN_PAGES[chapter] || SCREEN_PAGES.hub;
  if (chapter !== 'office' || !log.length) return page;
  return { ...page, items: log.slice(-LOG_LINES).map(({ role, text }) => [role, text]) };
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

function drawScreen(ctx, page) {
  const pad = 90;
  ctx.fillStyle = '#060a14';
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = page.accent;
  ctx.globalAlpha = 0.08;
  ctx.fillRect(0, 0, SCREEN_W, 90);
  ctx.globalAlpha = 1;
  ctx.fillRect(0, 88, SCREEN_W, 2);
  ctx.font = "500 34px 'DM Mono', monospace";
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = page.accent;
  ctx.fillText(`babydanh ${page.tag}`, pad, 58);
  ctx.fillStyle = '#edf7fb';
  ctx.font = "700 120px 'Space Grotesk', sans-serif";
  ctx.fillText(page.title, pad, 260);
  ctx.fillStyle = '#8199a8';
  ctx.font = "400 44px 'Space Grotesk', sans-serif";
  ctx.fillText(page.sub, pad, 330);

  let y = 420;
  page.items.forEach(([label, body]) => {
    ctx.fillStyle = page.accent;
    ctx.fillRect(pad, y - 34, 6, 46);
    ctx.font = "500 32px 'DM Mono', monospace";
    ctx.fillText(label, pad + 30, y);
    ctx.fillStyle = '#edf7fb';
    ctx.font = "400 36px 'Space Grotesk', sans-serif";
    const lines = wrapLines(ctx, body, SCREEN_W - pad * 2 - LABEL_W);
    lines.forEach((line, row) => ctx.fillText(line, pad + LABEL_W, y + row * 46));
    y += lines.length * 46 + 30;
  });

  let x = pad;
  ctx.font = "500 30px 'DM Mono', monospace";
  page.chips.forEach((chip) => {
    const width = ctx.measureText(chip).width + 44;
    ctx.strokeStyle = page.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, SCREEN_H - 120, width, 56);
    ctx.fillStyle = '#edf7fb';
    ctx.fillText(chip, x + 22, SCREEN_H - 82);
    x += width + 20;
  });
}

// Outer LED strips baked into the model; hidden to declutter the desk.
const HIDDEN_LEDS = ['mat_edge_f', 'mat_edge_l', 'mon_leg_line'];
// Materials that cycle through the rainbow in lockstep and blink: [name, base emissive intensity].
const RGB_MATERIALS = [['s75_strip_cyan', 3], ['s75_strip_green', 3], ['s75_glow', 1.6], ['lt_backlight', 3]];

// Desk lamp: aim the shade (local axis pivot -> shade centre) at the desk instead of out of the room.
const LAMP_AXIS = new THREE.Vector3(0.159, -0.095, 0.19).normalize();
const LAMP_BULB = [-0.683, 0.364, -0.265];
const LAMP_AIM = new THREE.Vector3(-0.15, 0.02, 0.05);

function Desk({ chapter, logRef }) {
  const { scene, nodes, materials } = useGLTF(MODEL_URL);
  const screen = nodes.mon_screen;
  const wallLed = useRef(null);
  const lampTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.copy(LAMP_AIM);
    return target;
  }, []);
  const screenCanvas = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;
    return canvas;
  }, []);
  const screenTexture = useMemo(() => {
    const texture = new THREE.CanvasTexture(screenCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, [screenCanvas]);
  // Skip the flashing for visitors who ask for reduced motion.
  const calm = useMemo(prefersCalm, []);

  useEffect(() => {
    HIDDEN_LEDS.forEach((name) => { if (nodes[name]) nodes[name].visible = false; });
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

  // Repaint the monitor when the station changes; repaint again once the web fonts have loaded.
  // The office page also repaints once a second so new chatter shows up.
  useEffect(() => {
    const paint = () => {
      drawScreen(screenCanvas.getContext('2d'), pageFor(chapter, logRef.current));
      screenTexture.needsUpdate = true;
    };
    paint();
    document.fonts?.ready.then(paint);
    if (chapter !== 'office') return undefined;
    const timer = window.setInterval(paint, LOG_REPAINT_MS);
    return () => window.clearInterval(timer);
  }, [chapter, logRef, screenCanvas, screenTexture]);

  useFrame(({ clock }) => {
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
              <meshBasicMaterial map={screenTexture} toneMapped={false} />
            </mesh>
          </group>
        </group>
      )}
    </>
  );
}

function Rig({ chapter, pointerRef }) {
  const target = CHAPTER_CAMERA[chapter] || CHAPTER_CAMERA.boot;
  const desired = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const smoothLook = useMemo(() => new THREE.Vector3(...CHAPTER_CAMERA.boot.look), []);
  const fov = useMemo(() => ({ value: CHAPTER_CAMERA.boot.fov }), []);

  useFrame((state, delta) => {
    const { camera, size } = state;
    const pointer = pointerRef?.current || { x: 0, y: 0 };
    // Portrait screens crop the sides, so back the camera off from its look target.
    const fit = THREE.MathUtils.clamp(1.1 / (size.width / size.height), 1, 3);
    look.set(...target.look);
    desired.set(...target.position).sub(look).multiplyScalar(fit).add(look);
    desired.x += pointer.x * 0.04;
    desired.y += pointer.y * 0.02;
    camera.position.lerp(desired, 1 - Math.exp(-3.8 * delta));
    smoothLook.lerp(look, 1 - Math.exp(-3.8 * delta));
    camera.lookAt(smoothLook);
    fov.value = THREE.MathUtils.damp(fov.value, target.fov, 4, delta);
    if (Math.abs(camera.fov - fov.value) > 0.01) {
      camera.fov = fov.value;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

function Scene({ chapter, pointerRef }) {
  const calm = useMemo(prefersCalm, []);
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
      <Rig chapter={chapter} pointerRef={pointerRef} />
      <Suspense fallback={null}>
        <Desk chapter={chapter} logRef={logRef} />
      </Suspense>
      <MiniOffice active={chapter === 'office'} calm={calm} onLog={onLog} />
      {/* Edges of the tiny office are only a few pixels wide, so smooth them while it is the subject. */}
      <EffectComposer multisampling={chapter === 'office' ? 4 : 0}>
        <Bloom mipmapBlur intensity={0.6} luminanceThreshold={1} radius={0.4} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  );
}

useGLTF.preload(MODEL_URL);

export default function ExperienceCanvas({ chapter, pointerRef }) {
  return (
    <div className="experience-canvas" aria-hidden="true">
      <div className="canvas-vignette" />
      <Canvas camera={{ position: CHAPTER_CAMERA.boot.position, fov: CHAPTER_CAMERA.boot.fov, near: 0.05, far: 20 }} dpr={chapter === 'office' ? [1, 1.5] : [0.75, 1]} frameloop="always" performance={{ min: 0.5, max: 1, debounce: 220 }} gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false, depth: true }}>
        <Scene chapter={chapter} pointerRef={pointerRef} />
      </Canvas>
    </div>
  );
}
