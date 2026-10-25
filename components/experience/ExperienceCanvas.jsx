'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const MODEL_URL = `${BASE_PATH}/models/desk.glb`;

// Camera stations around the desk (meters, Y up). Each chapter looks at one prop group.
const CHAPTER_CAMERA = {
  boot: { position: [0.9, 0.7, 1.9], look: [-0.05, 0.18, -0.1], fov: 30 },
  hub: { position: [0.5, 0.6, 1.3], look: [-0.05, 0.18, -0.1], fov: 30 },
  map: { position: [0.3, 0.3, 0.9], look: [0.4, 0.24, -0.3], fov: 32 },
  loadout: { position: [-0.9, 0.45, 0.8], look: [-0.45, 0.12, -0.05], fov: 30 },
  contact: { position: [-0.1, 0.34, 1.0], look: [-0.1, 0.25, -0.2], fov: 34 },
};

const PROJECT_COLORS = ['#00e5ff', '#a78bfa', '#ff4d8d'];
const CARD_X = [-0.18, 0, 0.18];
const NEON_MATERIAL = /^(neon_|bar_)/;

function readAudio(audioDataRef) {
  return audioDataRef?.current || { bass: 0, mid: 0, treble: 0, energy: 0, beatPulse: 0 };
}

// Project cards drawn on the monitor; selection comes from the HTML overlay (the canvas ignores pointer events).
function ProjectCard({ x, color, selected }) {
  const glow = useRef(null);
  useFrame((_, delta) => {
    if (!glow.current) return;
    const target = selected ? 3 : 0.5;
    glow.current.emissiveIntensity = THREE.MathUtils.damp(glow.current.emissiveIntensity, target, 8, delta);
  });
  return (
    <group position={[x, 0.01, 0.002]}>
      <mesh><planeGeometry args={[0.15, 0.2]} /><meshBasicMaterial color="#050a14" /></mesh>
      <mesh position={[0, 0.082, 0.001]}>
        <planeGeometry args={[0.15, 0.022]} />
        <meshStandardMaterial ref={glow} color={color} emissive={color} emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
      {[0.03, -0.01, -0.05].map((y, row) => (
        <mesh key={y} position={[-0.02 * row, y, 0.001]}>
          <planeGeometry args={[0.1 - row * 0.02, 0.008]} />
          <meshBasicMaterial color={color} transparent opacity={selected ? 0.9 : 0.35} />
        </mesh>
      ))}
    </group>
  );
}

function Desk({ audioDataRef, activeProject }) {
  const { scene, nodes } = useGLTF(MODEL_URL);
  const neon = useMemo(() => {
    const found = new Map();
    scene.traverse((object) => {
      const material = object.isMesh && object.material;
      if (material && NEON_MATERIAL.test(material.name) && !found.has(material)) found.set(material, material.emissiveIntensity);
    });
    return [...found];
  }, [scene]);
  const screen = nodes.mon_screen;

  useFrame(() => {
    const audio = readAudio(audioDataRef);
    const boost = 1 + audio.energy * 0.6 + audio.beatPulse * 0.8;
    neon.forEach(([material, base]) => { material.emissiveIntensity = base * boost; });
  });

  return (
    <>
      <primitive object={scene} />
      {screen && (
        // Same pose as the monitor panel, then tilt so +Y of the cards is screen-up and +Z is the screen normal.
        <group position={screen.position} quaternion={screen.quaternion}>
          <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
            {CARD_X.map((x, index) => (
              <ProjectCard key={x} x={x} color={PROJECT_COLORS[index]} selected={activeProject === index} />
            ))}
          </group>
        </group>
      )}
    </>
  );
}

function Rig({ chapter, pointerRef, audioDataRef }) {
  const target = CHAPTER_CAMERA[chapter] || CHAPTER_CAMERA.boot;
  const desired = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const smoothLook = useMemo(() => new THREE.Vector3(...CHAPTER_CAMERA.boot.look), []);
  const fov = useMemo(() => ({ value: CHAPTER_CAMERA.boot.fov }), []);

  useFrame((state, delta) => {
    const { camera, size } = state;
    const pointer = pointerRef?.current || { x: 0, y: 0 };
    const audio = readAudio(audioDataRef);
    // Portrait screens crop the sides, so back the camera off from its look target.
    const fit = THREE.MathUtils.clamp(1.1 / (size.width / size.height), 1, 2.2);
    look.set(...target.look);
    desired.set(...target.position).sub(look).multiplyScalar(fit).add(look);
    desired.x += pointer.x * 0.04;
    desired.y += pointer.y * 0.02;
    camera.position.lerp(desired, 1 - Math.exp(-3.8 * delta));
    smoothLook.lerp(look, 1 - Math.exp(-3.8 * delta));
    camera.lookAt(smoothLook);
    fov.value = THREE.MathUtils.damp(fov.value, target.fov, 4, delta);
    const nextFov = fov.value + audio.beatPulse * 1.5;
    if (Math.abs(camera.fov - nextFov) > 0.01) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

function Scene({ chapter, audioDataRef, pointerRef, activeProject }) {
  return (
    <>
      <color attach="background" args={['#02030a']} />
      <ambientLight color="#404070" intensity={0.35} />
      <directionalLight color="#dde6ff" intensity={0.8} position={[0.2, 0.9, 0.3]} />
      <pointLight color="#00e5ff" intensity={0.3} distance={2.5} position={[-0.7, 0.3, -0.3]} />
      <pointLight color="#ff4d8d" intensity={0.35} distance={2.5} position={[0.8, 0.3, -0.25]} />
      <Rig chapter={chapter} pointerRef={pointerRef} audioDataRef={audioDataRef} />
      <Suspense fallback={null}>
        <Desk audioDataRef={audioDataRef} activeProject={activeProject} />
      </Suspense>
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.6} luminanceThreshold={1} radius={0.4} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  );
}

useGLTF.preload(MODEL_URL);

export default function ExperienceCanvas({ chapter, audioDataRef, pointerRef, activeProject }) {
  return (
    <div className="experience-canvas" aria-hidden="true">
      <div className="canvas-vignette" />
      <Canvas camera={{ position: CHAPTER_CAMERA.boot.position, fov: CHAPTER_CAMERA.boot.fov, near: 0.05, far: 20 }} dpr={[0.75, 1]} frameloop="always" performance={{ min: 0.5, max: 1, debounce: 220 }} gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false, depth: true }}>
        <Scene chapter={chapter} audioDataRef={audioDataRef} pointerRef={pointerRef} activeProject={activeProject} />
      </Canvas>
    </div>
  );
}
