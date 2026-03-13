"use client";

import { Float, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Points } from "three";

function ParticleField() {
  const ref = useRef<Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(900);
    for (let index = 0; index < values.length; index += 3) {
      values[index] = (Math.random() - 0.5) * 10;
      values[index + 1] = (Math.random() - 0.5) * 8;
      values[index + 2] = (Math.random() - 0.5) * 8;
    }
    return values;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.05;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.08;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#8bf3d8" size={0.04} transparent opacity={0.6} />
    </points>
  );
}

function OrbitShape() {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.28;
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.35) * 0.1;
    }
  });

  return (
    <group ref={ref}>
      <Float speed={2} rotationIntensity={1.2} floatIntensity={1.6}>
        <mesh position={[-0.95, 0.2, 0]}>
          <torusKnotGeometry args={[0.72, 0.18, 160, 24]} />
          <meshStandardMaterial color="#9af0db" wireframe transparent opacity={0.5} />
        </mesh>
      </Float>
      <Float speed={1.6} rotationIntensity={0.8} floatIntensity={1.2}>
        <mesh position={[1.05, -0.45, -0.5]} scale={0.75}>
          <icosahedronGeometry args={[0.9, 0]} />
          <meshStandardMaterial color="#ffbb8b" wireframe transparent opacity={0.38} />
        </mesh>
      </Float>
      <mesh rotation={[0.4, 0.8, 0]}>
        <torusGeometry args={[2.2, 0.03, 16, 160]} />
        <meshStandardMaterial color="#5fe0ff" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

export default function HeroScene() {
  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(139,243,216,0.22),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,187,139,0.16),transparent_32%),rgba(5,10,19,0.86)] shadow-[0_30px_80px_rgba(0,0,0,0.4)] md:h-[520px]">
      <Canvas dpr={[1, 1.8]} gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[0, 0, 5.6]} />
        <ambientLight intensity={1.2} />
        <pointLight position={[3, 2, 4]} intensity={30} color="#89f6dc" />
        <pointLight position={[-2.5, -2.5, 2]} intensity={20} color="#ff9d71" />
        <OrbitShape />
        <ParticleField />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(3,7,13,0.75)_100%)]" />
    </div>
  );
}
