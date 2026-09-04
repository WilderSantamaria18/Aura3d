import React from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { SphereVisualizer } from './SphereVisualizer';
import { useDeviceCapabilities } from '../../hooks/useDeviceCapabilities';
import { usePlayerStore } from '../../stores/playerStore';

// ── Responsive Camera Controller (Auto-fits sphere to ~70% center on any aspect ratio with smooth lerp) ──
const ResponsiveCameraController: React.FC = () => {
  const { camera, size } = useThree();
  const vrMode = usePlayerStore((s) => s.vrMode);

  // Reset and align camera whenever VR mode is toggled or container size changes
  React.useEffect(() => {
    if (!camera || !(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / Math.max(1, size.height);
    camera.aspect = aspect;

    const baseDistance = 6.2;
    const targetZ = aspect < 1.0 ? baseDistance / Math.max(0.45, aspect * 0.92) : baseDistance;
    
    // In VR mode, ensure camera is perfectly centered on origin
    if (vrMode) {
      camera.position.set(0, 0, targetZ);
      camera.lookAt(0, 0, 0);
    }
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, vrMode]);

  useFrame(() => {
    if (!camera || !(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / Math.max(1, size.height);
    if (Math.abs(camera.aspect - aspect) > 0.001) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }

    const baseDistance = 6.2;
    const targetZ = aspect < 1.0 ? baseDistance / Math.max(0.45, aspect * 0.92) : baseDistance;

    if (vrMode) {
      // Smoothly keep camera centered without OrbitControls drift
      camera.position.x += (0 - camera.position.x) * 0.1;
      camera.position.y += (0 - camera.position.y) * 0.1;
      camera.position.z += (targetZ - camera.position.z) * 0.1;
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.z += (targetZ - camera.position.z) * 0.08;
    }
    camera.updateProjectionMatrix();
  });

  return null;
};

export const SceneContainer: React.FC = React.memo(() => {
  const device = useDeviceCapabilities();
  const vrMode = usePlayerStore((s) => s.vrMode);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme.primary);
  const lucidSecondary = usePlayerStore((s) => s.lucidSecondaryColor || s.lucidTheme.secondary);

  const bgColor = isLucid ? '#03050e' : '#060812';

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-auto overflow-hidden" style={{ backgroundColor: bgColor }}>
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
          gl.setClearColor(new THREE.Color(bgColor), 1.0);
          gl.toneMapping = THREE.NoToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.autoClear = true;
        }}
      >
        <ResponsiveCameraController />
        <color attach="background" args={[bgColor]} />
        <ambientLight intensity={0.6} />
        <pointLight
          position={[10, 10, 10]}
          intensity={1.3}
          color={isLucid ? lucidPrimary : '#00f2fe'}
        />
        <pointLight
          position={[-10, -10, -10]}
          intensity={1.3}
          color={isLucid ? lucidSecondary : '#ff088a'}
        />

        {/* Ambient starfield (lightweight optimized) */}
        <Stars
          radius={30}
          depth={30}
          count={device.isMobile ? 200 : 600}
          factor={3}
          saturation={0.3}
          fade
          speed={0.5}
        />

        {/* 3D Crystalline Particle Sphere */}
        <SphereVisualizer particleCount={device.particleCount} />

        {/* User Orbit Controls (Disabled during VR tracking to prevent motion conflicts) */}
        <OrbitControls
          enabled={!vrMode}
          enablePan={false}
          enableZoom={!vrMode}
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
