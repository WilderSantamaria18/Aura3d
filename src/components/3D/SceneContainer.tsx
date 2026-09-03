import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { SphereVisualizer } from './SphereVisualizer';
import { WaveEffect } from './WaveEffect';

export const SceneContainer: React.FC = () => {
  const isMobile = useMemo(() => {
    return window.innerWidth < 768;
  }, []);

  const particleCount = isMobile ? 850 : 2200;
  const waveParticleCount = isMobile ? 700 : 1800;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-auto bg-[#060812]">
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 50 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#060812']} />
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.2} color="#00f2fe" />
        <pointLight position={[-10, -10, -10]} intensity={1.2} color="#ff088a" />

        {/* Ambient starfield */}
        <Stars radius={50} depth={50} count={isMobile ? 500 : 1500} factor={4} saturation={0.5} fade speed={1} />

        {/* 3D Crystalline Particle Sphere */}
        <SphereVisualizer particleCount={particleCount} />

        {/* 3D Dynamic Particle Wave Effect */}
        <WaveEffect particleCount={waveParticleCount} />

        {/* User Orbit Controls */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3.2}
          maxDistance={12}
          rotateSpeed={0.6}
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
};
