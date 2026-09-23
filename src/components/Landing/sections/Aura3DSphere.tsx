import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

const AnimatedSphere: React.FC<{ mousePos: { x: number; y: number } }> = ({ mousePos }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetRotation = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    // Auto-rotation around Y
    meshRef.current.rotation.y += 0.3 * delta;

    // React smoothly to mouse coordinates with lerp (factor 0.05)
    targetRotation.current.x = (mousePos.y - 0.5) * 0.8;
    targetRotation.current.y = (mousePos.x - 0.5) * 1.2;

    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      targetRotation.current.x,
      0.05
    );
    meshRef.current.rotation.z = THREE.MathUtils.lerp(
      meshRef.current.rotation.z,
      targetRotation.current.y * 0.3,
      0.05
    );
  });

  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh ref={meshRef} scale={1.8}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color="#00e5ff"
          roughness={0.1}
          metalness={0.8}
          transmission={0.6}
          thickness={1.2}
          ior={1.5}
          distort={0.35}
          speed={2.2}
        />
      </mesh>
    </Float>
  );
};

export const Aura3DSphere: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] lg:w-[380px] lg:h-[380px] mx-auto select-none pointer-events-none"
    >
      {/* Soft cyan & violet backing glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 via-sky-400/15 to-violet-600/20 blur-3xl" />
      
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 5, 5]} intensity={2.5} color="#00e5ff" />
        <directionalLight position={[-5, -5, -3]} intensity={1.8} color="#8c38ff" />
        <pointLight position={[0, 2, 2]} intensity={1.5} color="#ffffff" />
        <AnimatedSphere mousePos={mousePos} />
      </Canvas>
    </div>
  );
};
