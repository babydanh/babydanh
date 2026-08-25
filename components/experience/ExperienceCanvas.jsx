'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Line, Sparkles, Stars } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const CHAPTER_CAMERA = {
  boot: { position: [0, 0, 8.8], look: [0, 0, 0] },
  hub: { position: [0.7, 0.12, 7.2], look: [0.25, 0, 0] },
  map: { position: [-0.5, 0.35, 6.4], look: [0, 0.2, 0] },
  loadout: { position: [0.4, 0.2, 7.8], look: [0, 0.25, 0] },
  contact: { position: [0, -0.1, 7.4], look: [0, 0, 0] },
};

const PROJECT_POSITIONS = [[-2.35, 0.85, 0], [0.35, -0.35, 0.2], [2.25, 0.95, -0.15]];

function useSoftOpacity(ref, active, target = 1) {
  useFrame((_, delta) => {
    if (!ref.current) return;
    const next = THREE.MathUtils.damp(ref.current.material.opacity, active ? target : 0, 4, delta);
    ref.current.material.opacity = next;
  });
}

function SignalCore({ audioData, active, pointer }) {
  const group = useRef(null);
  const shell = useRef(null);
  const ring = useRef(null);
  useFrame((state, delta) => {
    if (!group.current) return;
    const energy = audioData.energy || 0;
    const beat = audioData.beatPulse || 0;
    const target = active ? 1 + energy * 0.12 + beat * 0.12 : 0.78;
    group.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
    group.current.rotation.y += delta * (0.16 + energy * 0.55);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, pointer.y * 0.16, 0.04);
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, pointer.x * 0.25, 0.035);
    if (shell.current) shell.current.rotation.z -= delta * (0.1 + audioData.mid * 0.5);
    if (ring.current) {
      ring.current.rotation.x += delta * (0.3 + audioData.bass * 1.3);
      ring.current.scale.setScalar(1 + audioData.bass * 0.15 + beat * 0.16);
    }
  });
  return (
    <group ref={group} position={[0, 0, 0]}>
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.05, 2]} />
        <meshBasicMaterial color="#0a1929" wireframe transparent opacity={active ? 0.75 : 0.15} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial color="#152945" emissive="#00d9ff" emissiveIntensity={active ? 3 : 0.4} metalness={0.8} roughness={0.24} transparent opacity={active ? 0.95 : 0.12} />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2.2, 0.2, 0]}>
        <torusGeometry args={[1.46, 0.018, 8, 96]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={active ? 0.86 : 0.08} />
      </mesh>
      <pointLight color="#00e5ff" intensity={active ? 2.4 + audioData.bass * 4 : 0.15} distance={5} />
    </group>
  );
}

function HubScene({ audioData, pointer, active }) {
  const station = useRef(null);
  const grid = useRef(null);
  useSoftOpacity(grid, active, 0.48);
  useFrame((_, delta) => {
    if (!station.current) return;
    station.current.rotation.y += delta * 0.025;
    station.current.rotation.z = THREE.MathUtils.lerp(station.current.rotation.z, pointer.x * 0.04, 0.05);
  });
  return (
    <group ref={station} position={[0.4, 0.1, 0]}>
      <SignalCore audioData={audioData} active={active} pointer={pointer} />
      <mesh ref={grid} position={[0, -1.65, -0.5]} rotation={[-Math.PI / 2.1, 0, 0]}>
        <planeGeometry args={[9, 7, 18, 12]} />
        <meshBasicMaterial color="#1e6074" wireframe transparent opacity={0.48} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-2.1, 0.15, -0.2]}>
        <torusGeometry args={[0.55, 0.012, 6, 32]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={active ? 0.7 : 0.08} />
      </mesh>
      <mesh rotation={[0, 0.5, 0]} position={[2.1, -0.2, -0.5]}>
        <boxGeometry args={[0.7, 0.7, 0.05]} />
        <meshBasicMaterial color="#ff4d8d" wireframe transparent opacity={active ? 0.5 : 0.06} />
      </mesh>
    </group>
  );
}

function MissionNode({ position, color, active, selected, project, onSelect, onHover }) {
  const group = useRef(null);
  const orb = useRef(null);
  useFrame((state, delta) => {
    if (!group.current) return;
    const pulse = selected ? 1.12 + Math.sin(state.clock.elapsedTime * 5) * 0.05 : active ? 1 : 0.78;
    group.current.scale.lerp(new THREE.Vector3(pulse, pulse, pulse), 0.12);
    group.current.rotation.y += delta * (selected ? 0.45 : 0.12);
    if (orb.current) orb.current.material.emissiveIntensity = selected ? 4 : active ? 1.8 : 0.4;
  });
  return (
    <group ref={group} position={position} onClick={(event) => { event.stopPropagation(); onSelect(project); }} onPointerOver={(event) => { event.stopPropagation(); onHover(project); }} onPointerOut={() => onHover(null)}>
      <mesh ref={orb}>
        <icosahedronGeometry args={[0.48, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} metalness={0.6} roughness={0.25} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, selected ? 0.027 : 0.012, 8, 48]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.95 : active ? 0.45 : 0.12} />
      </mesh>
      <pointLight color={color} intensity={selected ? 2.7 : active ? 0.8 : 0.08} distance={2.2} />
    </group>
  );
}

function QuestMapScene({ audioData, active, activeProject, onSelectProject, onHoverProject }) {
  const map = useRef(null);
  const linePoints = useMemo(() => PROJECT_POSITIONS.map(([x, y, z]) => [x, y, z]), []);
  useFrame((_, delta) => {
    if (!map.current) return;
    map.current.rotation.y += delta * (0.015 + audioData.mid * 0.03);
    map.current.position.y = THREE.MathUtils.lerp(map.current.position.y, active ? 0 : -0.4, 0.06);
  });
  const colors = ['#00e5ff', '#a78bfa', '#ff4d8d'];
  const projects = ['RaoVat24H', 'Neon Archive', 'EA Research Lab'];
  return (
    <group ref={map} position={[0, 0.2, 0]}>
      <Line points={linePoints} color="#296073" transparent opacity={active ? 0.48 : 0.08} lineWidth={1} dashed dashSize={0.15} gapSize={0.1} />
      {PROJECT_POSITIONS.map((position, index) => (
        <MissionNode key={projects[index]} position={position} color={colors[index]} active={active} selected={activeProject === index} project={{ index, title: projects[index] }} onSelect={onSelectProject} onHover={onHoverProject} />
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.3]}>
        <ringGeometry args={[2.9, 2.92, 64]} />
        <meshBasicMaterial color="#153b4c" transparent opacity={active ? 0.6 : 0.08} />
      </mesh>
    </group>
  );
}

function LoadoutScene({ audioData, active, pointer }) {
  const group = useRef(null);
  const points = useMemo(() => [[-1.6, 0.9, 0], [-0.55, 0.2, 0.1], [0.55, 0.9, -0.1], [1.55, 0.22, 0], [0, -0.85, 0.2]], []);
  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.z += delta * (0.02 + audioData.treble * 0.04);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, pointer.y * 0.1, 0.04);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, active ? 0 : -0.35, 0.06);
  });
  return (
    <group ref={group} position={[0, 0, 0]}>
      <Line points={points} color="#7c5cff" transparent opacity={active ? 0.55 : 0.08} lineWidth={1.2} />
      {points.map((point, index) => (
        <mesh key={point.join('-')} position={point} scale={active ? 1 : 0.65}>
          <octahedronGeometry args={[index === 2 ? 0.3 : 0.22, 0]} />
          <meshStandardMaterial color={index === 2 ? '#00e5ff' : '#a78bfa'} emissive={index === 2 ? '#00e5ff' : '#a78bfa'} emissiveIntensity={active ? 2.5 + audioData.energy * 2 : 0.2} />
        </mesh>
      ))}
      <pointLight color="#7c5cff" intensity={active ? 2 + audioData.energy * 2 : 0.1} distance={4} />
    </group>
  );
}

function ContactScene({ audioData, active }) {
  const portal = useRef(null);
  useFrame((_, delta) => {
    if (!portal.current) return;
    portal.current.rotation.y += delta * (0.22 + audioData.energy * 0.4);
    portal.current.rotation.z -= delta * 0.08;
    portal.current.scale.setScalar(THREE.MathUtils.lerp(portal.current.scale.x, active ? 1 + audioData.beatPulse * 0.12 : 0.72, 0.08));
  });
  return (
    <group ref={portal} position={[0, 0, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.55, 0.06, 12, 96]} /><meshBasicMaterial color="#00e5ff" transparent opacity={active ? 0.75 : 0.06} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0.35]}><torusGeometry args={[1.05, 0.025, 8, 96]} /><meshBasicMaterial color="#ff4d8d" transparent opacity={active ? 0.6 : 0.05} /></mesh>
      <mesh><circleGeometry args={[0.82, 64]} /><meshBasicMaterial color="#082330" transparent opacity={active ? 0.72 : 0.02} /></mesh>
      <pointLight color="#00e5ff" intensity={active ? 3 + audioData.bass * 4 : 0.1} distance={4} />
    </group>
  );
}

function Scene({ chapter, audioData, pointer, activeProject, onSelectProject, onHoverProject }) {
  const group = useRef(null);
  const target = CHAPTER_CAMERA[chapter] || CHAPTER_CAMERA.boot;
  useFrame((state, delta) => {
    const camera = state.camera;
    const desired = new THREE.Vector3(...target.position);
    desired.x += pointer.x * 0.2;
    desired.y += pointer.y * 0.12;
    camera.position.lerp(desired, 1 - Math.exp(-3.8 * delta));
    camera.lookAt(new THREE.Vector3(...target.look));
    if (group.current) group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * 0.025, 0.04);
  });
  return (
    <>
      <color attach="background" args={['#03070d']} />
      <fog attach="fog" args={['#03070d', 4, 13]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 4, 3]} color="#b8f4ff" intensity={1.1} />
      <pointLight position={[-4, -2, 2]} color="#5638c7" intensity={2.8} distance={8} />
      <Stars radius={10} depth={6} count={800} factor={1.7} saturation={0.45} fade speed={0.22 + audioData.treble * 0.5} />
      <Sparkles count={105} scale={[10, 6, 8]} size={1.5} speed={0.15 + audioData.energy * 0.6} color="#7bdfff" opacity={0.35} />
      <group ref={group}>
        <HubScene audioData={audioData} pointer={pointer} active={chapter === 'hub'} />
        <QuestMapScene audioData={audioData} active={chapter === 'map'} activeProject={activeProject} onSelectProject={onSelectProject} onHoverProject={onHoverProject} />
        <LoadoutScene audioData={audioData} active={chapter === 'loadout'} pointer={pointer} />
        <ContactScene audioData={audioData} active={chapter === 'contact'} />
      </group>
    </>
  );
}

export default function ExperienceCanvas({ chapter, audioData, pointer, activeProject, onSelectProject, onHoverProject }) {
  return (
    <div className="experience-canvas" aria-hidden="true">
      <div className="canvas-vignette" />
      <Canvas camera={{ position: CHAPTER_CAMERA.boot.position, fov: 42 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <Scene chapter={chapter} audioData={audioData} pointer={pointer} activeProject={activeProject} onSelectProject={onSelectProject} onHoverProject={onHoverProject} />
      </Canvas>
    </div>
  );
}
