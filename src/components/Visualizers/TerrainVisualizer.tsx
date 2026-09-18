import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayerStore } from '../../stores/playerStore';
import { useAIAudioEngine } from '../../hooks/useAIAudioEngine';

// ── Terrain Grid Mesh Settings ───────────────────────────────────────────────
const GRID_WIDTH = 28;
const GRID_DEPTH = 55;
const SEG_X = 48;
const SEG_Z = 64;
const VERT_COUNT = (SEG_X + 1) * (SEG_Z + 1);

const AudioTerrainMesh: React.FC<{
  primaryColor: string;
  secondaryColor: string;
  bass: number;
  mids: number;
  highs: number;
  energy: number;
}> = ({ primaryColor, secondaryColor, bass, mids, highs, energy }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  // Build plane geometry and initial base vertex positions
  const [geometry, originalZ] = useMemo(() => {
    const geo = new THREE.PlaneGeometry(GRID_WIDTH, GRID_DEPTH, SEG_X, SEG_Z);
    geo.rotateX(-Math.PI / 2); // Lay flat on XZ plane

    const pos = geo.attributes.position.array as Float32Array;
    const orig = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i++) {
      orig[i] = pos[i];
    }

    // Vertex colors buffer
    const colors = new Float32Array(pos.length);
    const col1 = new THREE.Color(primaryColor);
    const col2 = new THREE.Color(secondaryColor);
    const tempCol = new THREE.Color();

    for (let i = 0; i < VERT_COUNT; i++) {
      const idx = i * 3;
      const x = pos[idx];
      const z = pos[idx + 2];
      const distFromCenter = Math.abs(x) / (GRID_WIDTH * 0.5);
      const depthRatio = (z + GRID_DEPTH * 0.5) / GRID_DEPTH;

      tempCol.copy(col1).lerp(col2, (distFromCenter + depthRatio) * 0.5);
      colors[idx] = tempCol.r;
      colors[idx + 1] = tempCol.g;
      colors[idx + 2] = tempCol.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return [geo, orig];
  }, [primaryColor, secondaryColor]);

  // Clean up geometry in GPU memory
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.1);
    timeRef.current += (1.2 + energy * 2.8) * dt;

    const posAttr = meshRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;

    const t = timeRef.current;
    const bassMultiplier = 1.0 + bass * 3.2;
    const midMultiplier = 0.8 + mids * 2.0;

    for (let i = 0; i < VERT_COUNT; i++) {
      const idx = i * 3;
      const x = originalZ[idx];
      const z = originalZ[idx + 2];

      // Normalized lateral distance (0 at center highway, 1 at mountains)
      const latNorm = Math.min(1.0, Math.abs(x) / (GRID_WIDTH * 0.42));
      const mountainMask = Math.pow(latNorm, 1.8);

      // Waves traveling towards viewer (-Z to +Z)
      const wave1 = Math.sin(z * 0.35 + t * 2.0 + x * 0.2) * 0.8;
      const wave2 = Math.cos(z * 0.65 - t * 3.0 + x * 0.4) * 0.45;
      const mountainPeaks = Math.sin(x * 0.8 + t * 0.5) * Math.cos(z * 0.4 + t) * 2.2;

      // Center valley is flatter, lateral edges form dramatic rhythmic mountains
      const valleyHeight = (wave1 + wave2) * 0.35 * (0.2 + highs * 0.8);
      const ridgeHeight = (mountainPeaks + wave1 * 1.5) * mountainMask * bassMultiplier * midMultiplier;

      pos[idx + 1] = valleyHeight + ridgeHeight;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -0.6, -GRID_DEPTH * 0.28]}>
      <meshBasicMaterial
        wireframe
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

// ── Distant Horizon Neon Sun & Glow ──────────────────────────────────────────
const HorizonSun: React.FC<{
  primaryColor: string;
  secondaryColor: string;
  bass: number;
}> = ({ primaryColor, secondaryColor, bass }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const scale = 1.0 + bass * 0.28;
    meshRef.current.scale.set(scale, scale, 1);
  });

  return (
    <group position={[0, 2.8, -GRID_DEPTH * 0.85]}>
      <mesh ref={meshRef}>
        <circleGeometry args={[5.5, 32]} />
        <meshBasicMaterial
          color={secondaryColor}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Corona Outer Ring */}
      <mesh position={[0, 0, -0.1]}>
        <ringGeometry args={[5.6, 7.8, 32]} />
        <meshBasicMaterial
          color={primaryColor}
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

// ── Terrain Camera Controller ────────────────────────────────────────────────
const TerrainCameraController: React.FC<{
  bass: number;
  energy: number;
}> = ({ bass, energy }) => {
  const { camera } = useThree();
  const cameraPreset = usePlayerStore((s) => s.cameraPreset);
  const mouseEffectsEnabled = usePlayerStore((s) => s.mouseEffectsEnabled);
  const mousePos = useRef({ x: 0, y: 0 });
  const orbitAngleRef = useRef(0);

  useEffect(() => {
    if (!mouseEffectsEnabled) {
      mousePos.current = { x: 0, y: 0 };
      return;
    }
    const onMove = (e: MouseEvent) => {
      mousePos.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mousePos.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [mouseEffectsEnabled]);

  useFrame((_, delta) => {
    if (!camera || !(camera instanceof THREE.PerspectiveCamera)) return;

    if (cameraPreset === 'driver') {
      // Driver cockpit mode: low, fast speed directly on the road
      const targetX = mousePos.current.x * 0.8;
      const targetY = 0.25 - bass * 0.15;
      const targetZ = 1.0;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 5, delta);
      camera.lookAt(targetX * 0.5, 0.2, -GRID_DEPTH * 0.45);
    } else if (cameraPreset === 'top') {
      // High-altitude bird's eye view
      const targetX = mousePos.current.x * 2.0;
      const targetY = 16.0;
      const targetZ = -4.0;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 3, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 3, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 3, delta);
    } else if (cameraPreset === 'drone') {
      // Dynamic canyon drone flyby with low-altitude sweeps
      orbitAngleRef.current += delta * 0.4;
      const t = orbitAngleRef.current;
      const targetX = Math.sin(t) * 6.0;
      const targetY = 2.0 + Math.sin(t * 1.5) * 1.8 + bass * 0.6;
      const targetPosZ = -3.0 + Math.cos(t * 0.8) * 4.0;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 3, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 3, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPosZ, 3, delta);
      camera.lookAt(0, 0.5, -GRID_DEPTH * 0.4);
    } else if (cameraPreset === 'orbit') {
      // Smooth orbit around the valley
      orbitAngleRef.current += delta * 0.25;
      const radius = 12.0;
      const targetX = Math.sin(orbitAngleRef.current) * radius;
      const targetY = 3.5 + Math.sin(orbitAngleRef.current * 0.5) * 1.5;
      const targetPosZ = Math.cos(orbitAngleRef.current) * radius - 8.0;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 3, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 3, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPosZ, 3, delta);
      camera.lookAt(0, 0, -GRID_DEPTH * 0.3);
    } else {
      // Frontal classic perspective
      const targetX = mousePos.current.x * 1.5;
      const targetY = 1.6 + mousePos.current.y * -0.5 - bass * 0.35;
      const targetZ = 3.5 + energy * 0.8;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 4, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 4, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 4, delta);
      camera.lookAt(targetX * 0.4, 0.4, -GRID_DEPTH * 0.4);
    }
  });

  return null;
};

// ── Exported Terrain Visualizer Component ─────────────────────────────────────
export const TerrainVisualizer: React.FC = () => {
  const { isLucid, lucidPrimaryColor, lucidSecondaryColor, lucidTheme, performanceTier } = usePlayerStore();
  const { getSmoothedData } = useVisualizer(0.16);
  const { primaryColor: aiPrimary, secondaryColor: aiSecondary } = useAIAudioEngine();

  const audioDataRef = useRef({ bass: 0, mids: 0, highs: 0, energy: 0 });
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const loop = () => {
      const data = getSmoothedData();
      audioDataRef.current = {
        bass: data.bass,
        mids: data.mids,
        highs: data.highs,
        energy: data.energy,
      };
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [getSmoothedData]);

  const primaryColor = isLucid
    ? lucidPrimaryColor || lucidTheme.primary || '#00f2fe'
    : aiPrimary || '#00f2fe';
  const secondaryColor = isLucid
    ? lucidSecondaryColor || lucidTheme.secondary || '#ff088a'
    : aiSecondary || '#ff088a';

  const dpr: [number, number] | number =
    performanceTier === 'eco' ? 0.85 : performanceTier === 'medium' ? 1.0 : [1, 1.5];

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#03050d] pointer-events-auto select-none">
      <Canvas
        camera={{ position: [0, 1.6, 3.5], fov: 65, near: 0.1, far: 180 }}
        dpr={dpr}
        gl={{
          antialias: performanceTier !== 'eco',
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x03050d, 1);
          scene.fog = new THREE.FogExp2(0x03050d, 0.024);
        }}
      >
        <TerrainCameraController
          bass={audioDataRef.current.bass}
          energy={audioDataRef.current.energy}
        />

        <ambientLight intensity={0.5} />

        <HorizonSun
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          bass={audioDataRef.current.bass}
        />

        <AudioTerrainMesh
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          bass={audioDataRef.current.bass}
          mids={audioDataRef.current.mids}
          highs={audioDataRef.current.highs}
          energy={audioDataRef.current.energy}
        />
      </Canvas>

      {/* Cyberpunk Horizon & Edge Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(3, 5, 13, 0.8) 0%, transparent 40%, rgba(3, 5, 13, 0.6) 100%)',
        }}
      />
    </div>
  );
};

export default TerrainVisualizer;
