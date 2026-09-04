import React, { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { SphereVisualizer } from './SphereVisualizer';
import { useDeviceCapabilities } from '../../hooks/useDeviceCapabilities';
import { usePlayerStore } from '../../stores/playerStore';

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

export const SceneContainer: React.FC = React.memo(() => {
  const device = useDeviceCapabilities();

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-auto bg-[#060812] overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 50 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false,
          stencil: false,
          depth: true,
        }}
        dpr={[0.8, 1.5]}
        resize={{ debounce: 0, scroll: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#060812'), 1.0);
          gl.toneMapping = THREE.NoToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.autoClear = true;
        }}
      >
        <ResponsiveCameraController />
        <color attach="background" args={['#060812']} />
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.2} color="#00f2fe" />
        <pointLight position={[-10, -10, -10]} intensity={1.2} color="#ff088a" />

        {/* Ambient starfield */}
        <Stars
          radius={50}
          depth={50}
          count={device.isMobile ? 400 : 1200}
          factor={4}
          saturation={0.5}
          fade
          speed={0.8}
        />

        {/* 3D Crystalline Particle Sphere */}
        <SphereVisualizer particleCount={device.particleCount} />

        {/* User Orbit Controls */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3.2}
          maxDistance={14}
          rotateSpeed={0.6}
          dampingFactor={0.05}
          onStart={() => usePlayerStore.getState().setUserInteracting(true)}
          onEnd={() => usePlayerStore.getState().setUserInteracting(false)}
        />
      </Canvas>
    </div>
  );
});

export default SceneContainer;
