'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const MODEL_URL = `${BASE_PATH}/models/desk.glb`;

// Camera stations around the desk (meters, Y up). Each chapter looks at one prop group.
const CHAPTER_CAMERA = {
  boot: { position: [0.8, 0.75, 2.0], look: [0.08, 0.15, -0.1], fov: 30 },
  hub: { position: [0.45, 0.62, 1.55], look: [0.1, 0.14, -0.05], fov: 30 },
  map: { position: [0.3, 0.3, 0.9], look: [0.4, 0.24, -0.3], fov: 32 },
  loadout: { position: [-0.75, 0.38, 0.75], look: [-0.32, 0.1, 0.0], fov: 32 },
  contact: { position: [0.25, 0.3, 0.9], look: [0.08, 0.06, 0.1], fov: 34 },
};

const PROJECT_COLORS = ['#00e5ff', '#a78bfa', '#ff4d8d'];
const CARD_X = [-0.18, 0, 0.18];

// Static project cards drawn on the monitor.
function ProjectCard({ x, color }) {
  return (
    <group position={[x, 0.01, 0.002]}>
      <mesh><planeGeometry args={[0.15, 0.2]} /><meshBasicMaterial color="#050a14" /></mesh>
      <mesh position={[0, 0.082, 0.001]}>
        <planeGeometry args={[0.15, 0.022]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
      {[0.03, -0.01, -0.05].map((y, row) => (
        <mesh key={y} position={[-0.02 * row, y, 0.001]}>
          <planeGeometry args={[0.1 - row * 0.02, 0.008]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Desk() {
  const { scene, nodes } = useGLTF(MODEL_URL);
  const screen = nodes.mon_screen;

  return (
    <>
      <primitive object={scene} />
      {screen && (
        // Same pose as the monitor panel, then tilt so +Y of the cards is screen-up and +Z is the screen normal.
        <group position={screen.position} quaternion={screen.quaternion}>
          <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
            {CARD_X.map((x, index) => (
              <ProjectCard key={x} x={x} color={PROJECT_COLORS[index]} />
            ))}
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
  return (
    <>
      <color attach="background" args={['#02030a']} />
      <ambientLight color="#404070" intensity={0.35} />
      <directionalLight color="#dde6ff" intensity={0.8} position={[0.2, 0.9, 0.3]} />
      <pointLight color="#00e5ff" intensity={0.3} distance={2.5} position={[-0.7, 0.3, -0.3]} />
      <pointLight color="#ff4d8d" intensity={0.35} distance={2.5} position={[0.8, 0.3, -0.25]} />
      <Rig chapter={chapter} pointerRef={pointerRef} />
      <Suspense fallback={null}>
        <Desk />
      </Suspense>
      <EffectComposer multisampling={0}>
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
      <Canvas camera={{ position: CHAPTER_CAMERA.boot.position, fov: CHAPTER_CAMERA.boot.fov, near: 0.05, far: 20 }} dpr={[0.75, 1]} frameloop="always" performance={{ min: 0.5, max: 1, debounce: 220 }} gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false, depth: true }}>
        <Scene chapter={chapter} pointerRef={pointerRef} />
      </Canvas>
    </div>
  );
}
