import React from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { SphereVisualizer } from './SphereVisualizer';
import { AirInstruments3D } from './AirInstruments3D';
import { useDeviceCapabilities } from '../../hooks/useDeviceCapabilities';
import { usePlayerStore } from '../../stores/playerStore';

// ── Responsive Camera Controller (Auto-fits sphere centered comfortably above bottom controls) ──
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
    
    // In VR mode or on initial view, position camera with +0.35 Y lift so full sphere is framed above player bar
    if (vrMode) {
      camera.position.set(0, 0.35, targetZ);
      camera.lookAt(0, 0.35, 0);
    } else {
      camera.position.set(0, 0.35, targetZ);
      camera.lookAt(0, 0.35, 0);
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
      camera.position.y += (0.35 - camera.position.y) * 0.1;
      camera.position.z += (targetZ - camera.position.z) * 0.1;
      camera.lookAt(0, 0.35, 0);
      camera.updateProjectionMatrix();
    }
  });

  return null;
};

export const SceneContainer: React.FC = React.memo(() => {
  const device = useDeviceCapabilities();
  const vrMode = usePlayerStore((s) => s.vrMode);
  const isAirInstrumentsActive = usePlayerStore((s) => s.isAirInstrumentsActive);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme.primary);
  const lucidSecondary = usePlayerStore((s) => s.lucidSecondaryColor || s.lucidTheme.secondary);
  const performanceTier = usePlayerStore((s) => s.performanceTier);

  // Dynamic particle count and DPR based on user 3-tier quality setting
  const effectiveParticleCount =
    performanceTier === 'eco'
      ? 900
      : performanceTier === 'medium'
      ? 1600
      : Math.min(2400, Math.max(1800, device.particleCount));

  const effectiveDpr: [number, number] | number =
    performanceTier === 'eco' ? 0.85 : performanceTier === 'medium' ? 1.0 : [1.0, 1.5];

  const blobSettings = usePlayerStore((s) => s.blobSettings);
  const hasAtmosphere = (blobSettings.backgroundAtmosphere && blobSettings.backgroundAtmosphere !== 'none') || !!blobSettings.customBackgroundImage;
  const bgColor = isLucid ? '#03050e' : '#060812';

  return (
    <div
      className="absolute inset-0 w-full h-full pointer-events-auto overflow-hidden bg-transparent"
    >
      {/* Focal Contrast Vignette for 3D Sphere (ensures particles stand out with subtle cinematic contrast) */}
      {hasAtmosphere && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(3, 5, 14, 0.28) 0%, rgba(3, 5, 14, 0.12) 50%, transparent 80%)',
          }}
        />
      )}

      <Canvas
        camera={{ position: [0, 0.35, 6.2], fov: 50 }}
        gl={{
          antialias: performanceTier !== 'eco',
          alpha: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
          stencil: false,
          depth: true,
        }}
        dpr={effectiveDpr}
        resize={{ debounce: 0, scroll: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.NoToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.autoClear = true;
        }}
      >
        <ResponsiveCameraController />
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
        <SphereVisualizer particleCount={effectiveParticleCount} />

        {/* 3D Air Virtual Instruments */}
        <AirInstruments3D />

        {/* User Orbit Controls (Disabled during VR tracking or Air Instruments to prevent motion conflicts) */}
        <OrbitControls
          enabled={!vrMode && !isAirInstrumentsActive}
          enablePan={false}
          enableZoom={!vrMode && !isAirInstrumentsActive}
          target={[0, 0.35, 0]}
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
