import React from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { SphereVisualizer } from './SphereVisualizer';
import { AirInstruments3D } from './AirInstruments3D';
import { AudioRibbons } from './AudioRibbons';
import { FloatingLyrics3D } from './FloatingLyrics3D';
import { useDeviceCapabilities } from '../../hooks/useDeviceCapabilities';
import { usePlayerStore } from '../../stores/playerStore';

// ── Responsive Camera Controller (Auto-fits sphere centered comfortably above bottom controls) ──
const ResponsiveCameraController: React.FC = () => {
  const { camera, size } = useThree();
  const vrMode = usePlayerStore((s) => s.vrMode);
  const cameraPreset = usePlayerStore((s) => s.cameraPreset);
  const orbitAngleRef = React.useRef(0);

  // Reset and align camera whenever VR mode is toggled or container size changes
  React.useEffect(() => {
    if (!camera || !(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / Math.max(1, size.height);
    camera.aspect = aspect;

    const baseDistance = 6.2;
    const targetZ = aspect < 1.0 ? baseDistance / Math.max(0.45, aspect * 0.92) : baseDistance;
    camera.position.set(0, 0.35, targetZ);
    camera.lookAt(0, 0.35, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, vrMode]);

  useFrame((_, delta) => {
    if (!camera || !(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / Math.max(1, size.height);
    if (Math.abs(camera.aspect - aspect) > 0.001) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }

    const baseDistance = 6.2;
    const targetZ = aspect < 1.0 ? baseDistance / Math.max(0.45, aspect * 0.92) : baseDistance;

    if (vrMode) {
      camera.position.x += (0 - camera.position.x) * 0.1;
      camera.position.y += (0.35 - camera.position.y) * 0.1;
      camera.position.z += (targetZ - camera.position.z) * 0.1;
      camera.lookAt(0, 0.35, 0);
      camera.updateProjectionMatrix();
      return;
    }

    if (cameraPreset === 'orbit') {
      orbitAngleRef.current += delta * 0.35;
      const targetX = Math.sin(orbitAngleRef.current) * targetZ;
      const targetY = 0.4 + Math.sin(orbitAngleRef.current * 0.5) * 0.25;
      const targetPosZ = Math.cos(orbitAngleRef.current) * targetZ;
      camera.position.x += (targetX - camera.position.x) * 0.08;
      camera.position.y += (targetY - camera.position.y) * 0.08;
      camera.position.z += (targetPosZ - camera.position.z) * 0.08;
      camera.lookAt(0, 0.35, 0);
    } else if (cameraPreset === 'drone') {
      // Continuous autonomous drone flyby with sweeping Lissajous trajectory & banking
      orbitAngleRef.current += delta * 0.45;
      const t = orbitAngleRef.current;
      const targetX = Math.sin(t) * (targetZ * 0.92);
      const targetY = 0.35 + Math.sin(t * 1.6) * 1.5;
      const targetPosZ = Math.cos(t * 0.75) * (targetZ * 0.9);
      camera.position.x += (targetX - camera.position.x) * 0.05;
      camera.position.y += (targetY - camera.position.y) * 0.05;
      camera.position.z += (targetPosZ - camera.position.z) * 0.05;
      camera.rotation.z = Math.sin(t * 0.8) * 0.08;
      camera.lookAt(0, 0.35, 0);
    } else if (cameraPreset === 'top') {
      camera.position.x += (0 - camera.position.x) * 0.08;
      camera.position.y += (targetZ * 1.25 - camera.position.y) * 0.08;
      camera.position.z += (0.1 - camera.position.z) * 0.08;
      camera.lookAt(0, 0, 0);
    } else if (cameraPreset === 'driver') {
      camera.position.x += (0 - camera.position.x) * 0.08;
      camera.position.y += (-0.15 - camera.position.y) * 0.08;
      camera.position.z += (2.4 - camera.position.z) * 0.08;
      camera.lookAt(0, 0.35, 0);
    } else {
      // 'front'
      camera.position.x += (0 - camera.position.x) * 0.08;
      camera.position.y += (0.35 - camera.position.y) * 0.08;
      camera.position.z += (targetZ - camera.position.z) * 0.08;
      camera.lookAt(0, 0.35, 0);
    }
    camera.updateProjectionMatrix();
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

  return (
    <div
      className="absolute inset-0 w-full h-full pointer-events-auto overflow-hidden bg-transparent"
    >
      {/* Clean backdrop without artificial halos */}

      <Canvas
        camera={{ position: [0, 0.35, 6.2], fov: 50 }}
        gl={{
          antialias: performanceTier !== 'eco',
          alpha: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false,
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
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 7]} intensity={0.6} />

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

        {/* 3D Audio-Reactive Light Ribbons */}
        <AudioRibbons />

        {/* 3D Floating Karaoke Lyrics */}
        <FloatingLyrics3D />

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
