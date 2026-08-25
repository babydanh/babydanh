'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Stars } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function NeonCore({ audioData, scrollProgress }) {
  const group = useRef(null);
  const core = useRef(null);
  const ring = useRef(null);
  const innerRing = useRef(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    const { bass, mid, treble, energy, beat } = audioData;
    const calm = 1 + energy * 0.16;
    const impact = beat ? 1.12 : 1;
    const targetScale = calm * impact;
    const targetY = Math.sin(state.clock.elapsedTime * 0.45) * 0.08 + scrollProgress * 0.12;

    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY, 0.04);
    group.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
    group.current.rotation.y += delta * (0.12 + mid * 0.65);
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.08 + scrollProgress * 0.2;

    if (core.current) {
      core.current.rotation.x += delta * (0.18 + treble);
      core.current.rotation.z -= delta * (0.12 + mid * 0.5);
      core.current.material.emissiveIntensity = 1.6 + energy * 4 + beat * 2;
    }
    if (ring.current) {
      ring.current.rotation.x += delta * (0.24 + bass * 1.5);
      ring.current.rotation.z += delta * 0.18;
      ring.current.scale.setScalar(1 + bass * 0.22 + beat * 0.15);
      ring.current.material.emissiveIntensity = 1.8 + bass * 3;
    }
    if (innerRing.current) {
      innerRing.current.rotation.y -= delta * (0.45 + treble * 2);
      innerRing.current.rotation.z += delta * 0.25;
    }
  });

  return (
    <group ref={group} position={[0.55, 0, 0]}>
      <mesh ref={core}>
        <icosahedronGeometry args={[1.05, 2]} />
        <meshStandardMaterial color="#0b1220" emissive="#00d9ff" emissiveIntensity={2} metalness={0.82} roughness={0.2} wireframe />
      </mesh>
      <mesh scale={0.72}>
        <icosahedronGeometry args={[1.05, 2]} />
        <meshStandardMaterial color="#06131b" emissive="#7c5cff" emissiveIntensity={1.6} metalness={0.9} roughness={0.12} />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2.2, 0.2, 0]}>
        <torusGeometry args={[1.48, 0.018, 12, 96]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh ref={innerRing} rotation={[0.7, 0, 0.55]}>
        <torusGeometry args={[1.78, 0.008, 8, 96]} />
        <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <pointLight color="#00d9ff" intensity={2.4 + audioData.bass * 5} distance={5} />
    </group>
  );
}

function ParticleField({ audioData }) {
  const points = useRef(null);
  const positions = useMemo(() => {
    const array = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i += 1) {
      const radius = 2.6 + Math.random() * 3.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      array[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      array[i * 3 + 1] = radius * Math.cos(phi);
      array[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return array;
  }, []);

  useFrame((state, delta) => {
    if (!points.current) return;
    points.current.rotation.y += delta * (0.012 + audioData.mid * 0.08);
    points.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.08;
    points.current.material.size = 0.018 + audioData.treble * 0.035 + audioData.beat * 0.02;
  });

  return (
    <points ref={points} position={[0.25, 0, -0.8]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#9eeaff" size={0.025} transparent opacity={0.72} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function OrbitLines({ audioData }) {
  const group = useRef(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.z -= delta * (0.035 + audioData.bass * 0.12);
  });
  return (
    <group ref={group} rotation={[0.35, 0.2, 0]} position={[0.55, 0, -0.4]}>
      {[2.15, 2.55, 3].map((radius, index) => (
        <mesh key={radius} rotation={[index * 0.6, index * 0.25, index * 0.3]}>
          <torusGeometry args={[radius, 0.004 + index * 0.002, 6, 128]} />
          <meshBasicMaterial color={index === 1 ? '#7c5cff' : '#1c8ca8'} transparent opacity={0.24 - index * 0.04} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ audioData, scrollProgress }) {
  return (
    <>
      <color attach="background" args={['#05070c']} />
      <fog attach="fog" args={['#05070c', 5, 12]} />
      <ambientLight intensity={0.36} />
      <directionalLight position={[3, 4, 2]} color="#a9eaff" intensity={1.2} />
      <pointLight position={[-4, -2, 2]} color="#6e4bff" intensity={3} distance={8} />
      <Stars radius={9} depth={5} count={720} factor={1.8} saturation={0.6} fade speed={0.25 + audioData.treble * 0.8} />
      <Sparkles count={90} scale={[10, 6, 7]} size={1.7} speed={0.18 + audioData.energy * 0.9} color="#5bdcff" opacity={0.42} />
      <ParticleField audioData={audioData} />
      <OrbitLines audioData={audioData} />
      <NeonCore audioData={audioData} scrollProgress={scrollProgress} />
    </>
  );
}

export default function ExperienceCanvas({ audioData, theme, scrollProgress }) {
  return (
    <div className={`experience-canvas theme-${theme}`} aria-hidden="true">
      <div className="canvas-vignette" />
      <canvas className="canvas-fallback" />
      <div className="canvas-stage">
        <Canvas camera={{ position: [0, 0, 7], fov: 42 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
          <Scene audioData={audioData} scrollProgress={scrollProgress} />
        </Canvas>
      </div>
    </div>
  );
}

