'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
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

function readAudio(audioDataRef) {
  return audioDataRef?.current || { bass: 0, mid: 0, treble: 0, energy: 0, beatPulse: 0 };
}

function GalaxyField({ audioDataRef, pointerRef }) {
  const group = useRef(null);
  const material = useRef(null);
  const geometry = useMemo(() => {
    const count = 950;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    const palette = ['#64e9ff', '#b38cff', '#f5d6ff', '#4db8e8'];

    for (let index = 0; index < count; index += 1) {
      const radius = Math.pow(Math.random(), 0.62) * 7.2;
      const arm = index % 4;
      const angle = (arm / 4) * Math.PI * 2 + radius * 0.72 + (Math.random() - 0.5) * (0.3 + radius * 0.07);
      const spread = (Math.random() - 0.5) * (0.12 + radius * 0.075);
      const offset = index * 3;
      positions[offset] = Math.cos(angle) * radius + spread;
      positions[offset + 1] = Math.sin(angle) * radius * 0.72 + spread * 0.7;
      positions[offset + 2] = (Math.random() - 0.5) * (0.35 + radius * 0.08) - 1.8;
      color.set(palette[index % palette.length]);
      const brightness = 0.45 + Math.random() * 0.65;
      colors[offset] = color.r * brightness;
      colors[offset + 1] = color.g * brightness;
      colors[offset + 2] = color.b * brightness;
    }

    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    nextGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return nextGeometry;
  }, []);

  useFrame((_, delta) => {
    if (!group.current) return;
    const audio = readAudio(audioDataRef);
    const pointer = pointerRef?.current || { x: 0, y: 0 };
    group.current.rotation.z += delta * (0.012 + audio.energy * 0.035);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, pointer.y * 0.035, 0.025);
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * 0.045, 0.025);
    if (material.current) {
      material.current.opacity = THREE.MathUtils.lerp(material.current.opacity, 0.58 + audio.energy * 0.18 + audio.beatPulse * 0.08, 0.08);
    }
  });

  return (
    <points ref={group} geometry={geometry} position={[0, 0, -0.4]} frustumCulled={false}>
      <pointsMaterial ref={material} vertexColors transparent opacity={0.58} size={0.045} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

function useSoftOpacity(ref, active, target = 1) {
  useFrame((_, delta) => {
    if (!ref.current) return;
    const material = ref.current.material;
    material.opacity = THREE.MathUtils.damp(material.opacity, active ? target : 0, 4, delta);
  });
}

function SignalCore({ audioDataRef, active, pointerRef }) {
  const group = useRef(null);
  const shell = useRef(null);
  const ring = useRef(null);
  const targetScale = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    if (!group.current) return;
    const audio = readAudio(audioDataRef);
    const pointer = pointerRef?.current || { x: 0, y: 0 };
    const target = active ? 1 + audio.energy * 0.12 + audio.beatPulse * 0.12 : 0.78;
    targetScale.setScalar(target);
    group.current.scale.lerp(targetScale, 0.1);
    group.current.rotation.y += delta * (0.16 + audio.energy * 0.55);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, pointer.y * 0.16, 0.04);
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, pointer.x * 0.25, 0.035);
    if (shell.current) shell.current.rotation.z -= delta * (0.1 + audio.mid * 0.5);
    if (ring.current) {
      ring.current.rotation.x += delta * (0.3 + audio.bass * 1.3);
      ring.current.scale.setScalar(1 + audio.bass * 0.15 + audio.beatPulse * 0.16);
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
        <torusGeometry args={[1.46, 0.018, 8, 72]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={active ? 0.86 : 0.08} />
      </mesh>
      
    </group>
  );
}

function HubScene({ audioDataRef, pointerRef, active }) {
  const station = useRef(null);
  const grid = useRef(null);
  useSoftOpacity(grid, active, 0.48);
  useFrame((_, delta) => {
    if (!station.current) return;
    const pointer = pointerRef?.current || { x: 0 };
    station.current.rotation.y += delta * 0.025;
    station.current.rotation.z = THREE.MathUtils.lerp(station.current.rotation.z, pointer.x * 0.04, 0.05);
  });
  return (
    <group ref={station} position={[0.4, 0.1, 0]} visible={active}>
      <SignalCore audioDataRef={audioDataRef} active={active} pointerRef={pointerRef} />
      <mesh ref={grid} position={[0, -1.65, -0.5]} rotation={[-Math.PI / 2.1, 0, 0]}>
        <planeGeometry args={[9, 7, 14, 9]} />
        <meshBasicMaterial color="#1e6074" wireframe transparent opacity={0.48} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-2.1, 0.15, -0.2]}>
        <torusGeometry args={[0.55, 0.012, 6, 28]} />
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
  const targetScale = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, delta) => {
    if (!group.current) return;
    const pulse = selected ? 1.12 + Math.sin(state.clock.elapsedTime * 5) * 0.05 : active ? 1 : 0.78;
    targetScale.setScalar(pulse);
    group.current.scale.lerp(targetScale, 0.12);
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
        <torusGeometry args={[0.72, selected ? 0.027 : 0.012, 8, 36]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.95 : active ? 0.45 : 0.12} />
      </mesh>
      
    </group>
  );
}

function QuestMapScene({ audioDataRef, active, activeProject, onSelectProject, onHoverProject }) {
  const map = useRef(null);
  const linePoints = useMemo(() => PROJECT_POSITIONS.map(([x, y, z]) => [x, y, z]), []);
  useFrame((_, delta) => {
    if (!map.current) return;
    const audio = readAudio(audioDataRef);
    map.current.rotation.y += delta * (0.015 + audio.mid * 0.03);
    map.current.position.y = THREE.MathUtils.lerp(map.current.position.y, active ? 0 : -0.4, 0.06);
  });
  const colors = ['#00e5ff', '#a78bfa', '#ff4d8d'];
  const projects = ['RaoVat24H', 'Neon Archive', 'EA Research Lab'];
  return (
    <group ref={map} position={[0, 0.2, 0]} visible={active}>
      <Line points={linePoints} color="#70d9ef" transparent opacity={active ? 0.56 : 0.08} lineWidth={1} dashed dashSize={0.15} gapSize={0.1} />
      {PROJECT_POSITIONS.map((position, index) => (
        <MissionNode key={projects[index]} position={position} color={colors[index]} active={active} selected={activeProject === index} project={{ index, title: projects[index] }} onSelect={onSelectProject} onHover={onHoverProject} />
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.3]}>
        <ringGeometry args={[2.9, 2.92, 48]} />
        <meshBasicMaterial color="#153b4c" transparent opacity={active ? 0.6 : 0.08} />
      </mesh>
    </group>
  );
}

function LoadoutScene({ audioDataRef, active, pointerRef }) {
  const group = useRef(null);
  const points = useMemo(() => [[-1.6, 0.9, 0], [-0.55, 0.2, 0.1], [0.55, 0.9, -0.1], [1.55, 0.22, 0], [0, -0.85, 0.2]], []);
  useFrame((_, delta) => {
    if (!group.current) return;
    const audio = readAudio(audioDataRef);
    const pointer = pointerRef?.current || { y: 0 };
    group.current.rotation.z += delta * (0.02 + audio.treble * 0.04);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, pointer.y * 0.1, 0.04);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, active ? 0 : -0.35, 0.06);
  });
  return (
    <group ref={group} position={[0, 0, 0]} visible={active}>
      <Line points={points} color="#7c5cff" transparent opacity={active ? 0.55 : 0.08} lineWidth={1.2} />
      {points.map((point, index) => (
        <mesh key={point.join('-')} position={point} scale={active ? 1 : 0.65}>
          <octahedronGeometry args={[index === 2 ? 0.3 : 0.22, 0]} />
          <meshStandardMaterial color={index === 2 ? '#00e5ff' : '#a78bfa'} emissive={index === 2 ? '#00e5ff' : '#a78bfa'} emissiveIntensity={active ? 2.5 + readAudio(audioDataRef).energy * 2 : 0.2} />
        </mesh>
      ))}
      
    </group>
  );
}

function ContactScene({ audioDataRef, active }) {
  const portal = useRef(null);
  useFrame((_, delta) => {
    if (!portal.current) return;
    const audio = readAudio(audioDataRef);
    portal.current.rotation.y += delta * (0.22 + audio.energy * 0.4);
    portal.current.rotation.z -= delta * 0.08;
    portal.current.scale.setScalar(THREE.MathUtils.lerp(portal.current.scale.x, active ? 1 + audio.beatPulse * 0.12 : 0.72, 0.08));
  });
  return (
    <group ref={portal} position={[0, 0, 0]} visible={active}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.55, 0.06, 12, 72]} /><meshBasicMaterial color="#00e5ff" transparent opacity={active ? 0.75 : 0.06} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0.35]}><torusGeometry args={[1.05, 0.025, 8, 72]} /><meshBasicMaterial color="#ff4d8d" transparent opacity={active ? 0.6 : 0.05} /></mesh>
      <mesh><circleGeometry args={[0.82, 48]} /><meshBasicMaterial color="#082330" transparent opacity={active ? 0.72 : 0.02} /></mesh>
      
    </group>
  );
}

function Scene({ chapter, audioDataRef, pointerRef, activeProject, onSelectProject, onHoverProject }) {
  const group = useRef(null);
  const target = CHAPTER_CAMERA[chapter] || CHAPTER_CAMERA.boot;
  const desired = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const nextFov = useMemo(() => ({ value: 42 }), []);
  useFrame((state, delta) => {
    const camera = state.camera;
    const pointer = pointerRef?.current || { x: 0, y: 0 };
    const audio = readAudio(audioDataRef);
    desired.set(target.position[0] + pointer.x * 0.2, target.position[1] + pointer.y * 0.12, target.position[2]);
    lookTarget.set(target.look[0], target.look[1], target.look[2]);
    camera.position.lerp(desired, 1 - Math.exp(-3.8 * delta));
    camera.lookAt(lookTarget);
    nextFov.value = THREE.MathUtils.damp(nextFov.value, 42 + audio.beatPulse * 3.5 + audio.energy * 1.2, 4, delta);
    if (Math.abs(camera.fov - nextFov.value) > 0.01) {
      camera.fov = nextFov.value;
      camera.updateProjectionMatrix();
    }
    if (group.current) group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * 0.025, 0.04);
  });
  return (
    <>
      <color attach="background" args={['#03070d']} />
      <fog attach="fog" args={['#03070d', 5, 15]} />
      <ambientLight intensity={0.22} />
      <directionalLight position={[3, 4, 3]} color="#b8f4ff" intensity={0.75} />
      <pointLight position={[-4, -2, 2]} color="#5638c7" intensity={1.15} distance={8} />
      <GalaxyField audioDataRef={audioDataRef} pointerRef={pointerRef} />
      <group ref={group}>
        <HubScene audioDataRef={audioDataRef} pointerRef={pointerRef} active={chapter === 'hub'} />
        <QuestMapScene audioDataRef={audioDataRef} active={chapter === 'map'} activeProject={activeProject} onSelectProject={onSelectProject} onHoverProject={onHoverProject} />
        <LoadoutScene audioDataRef={audioDataRef} active={chapter === 'loadout'} pointerRef={pointerRef} />
        <ContactScene audioDataRef={audioDataRef} active={chapter === 'contact'} />
      </group>
    </>
  );
}

export default function ExperienceCanvas({ chapter, audioDataRef, pointerRef, activeProject, onSelectProject, onHoverProject }) {
  return (
    <div className="experience-canvas" aria-hidden="true">
      <div className="canvas-vignette" />
      <Canvas camera={{ position: CHAPTER_CAMERA.boot.position, fov: 42 }} dpr={[0.75, 1]} frameloop="always" performance={{ min: 0.5, max: 1, debounce: 220 }} gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false, depth: true }}>
        <Scene chapter={chapter} audioDataRef={audioDataRef} pointerRef={pointerRef} activeProject={activeProject} onSelectProject={onSelectProject} onHoverProject={onHoverProject} />
      </Canvas>
    </div>
  );
}
