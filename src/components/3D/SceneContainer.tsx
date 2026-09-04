import React, { useMemo, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { SphereVisualizer } from './SphereVisualizer';
import { WaveEffect } from './WaveEffect';

// ── Responsive Camera Controller (Auto-fits sphere to ~70% center on any aspect ratio) ──
const ResponsiveCameraController: React.FC = () => {
  const { camera, size } = useThree();

  useEffect(() => {
    if (!camera || !(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / Math.max(1, size.height);
    camera.aspect = aspect;

    // In portrait / mobile (aspect < 1.0), pull back camera so sphere never gets cropped
    // In landscape / ultrawide (aspect >= 1.0), base 6.2 distance maintains ~70% screen height occupancy
    const baseDistance = 6.2;
    const targetZ = aspect < 1.0 ? baseDistance / Math.max(0.45, aspect * 0.92) : baseDistance;
    camera.position.z = targetZ;
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  return null;
};

export const SceneContainer: React.FC = () => {
  const isMobile = useMemo(() => {
    return window.innerWidth < 768;
  }, []);

  const particleCount = isMobile ? 900 : 2200;
  const waveParticleCount = isMobile ? 750 : 1800;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-auto bg-[#060812] overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 50 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        resize={{ debounce: 0, scroll: false }}
      >
        <ResponsiveCameraController />
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
          maxDistance={14}
          rotateSpeed={0.6}
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
};

export default SceneContainer;
