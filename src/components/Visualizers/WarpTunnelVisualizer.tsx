import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayerStore } from '../../stores/playerStore';
import { useAIAudioEngine } from '../../hooks/useAIAudioEngine';

// ── Configuration Constants ──────────────────────────────────────────────────
const RING_COUNT = 32;
const TUNNEL_LENGTH = 140;
const RING_SPACING = TUNNEL_LENGTH / RING_COUNT;
const STAR_COUNT = 1500;
const TUNNEL_RADIUS = 3.8;

// ── Hyperspace Stars / Velocity Streaks ───────────────────────────────────────
const HyperspaceStars: React.FC<{
  primaryColor: string;
  secondaryColor: string;
  speedMultiplier: number;
}> = ({ primaryColor, secondaryColor, speedMultiplier }) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate star positions [x, y, z] and initial random depth
  const [positions, starColors, velocities] = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3);
    const cols = new Float32Array(STAR_COUNT * 3);
    const vels = new Float32Array(STAR_COUNT);

    const color1 = new THREE.Color(primaryColor);
    const color2 = new THREE.Color(secondaryColor);
    const tempColor = new THREE.Color();

    for (let i = 0; i < STAR_COUNT; i++) {
      const idx = i * 3;
      // Cylinder distribution around tunnel perimeter and outside
      const angle = Math.random() * Math.PI * 2;
      const radius = TUNNEL_RADIUS * (0.4 + Math.random() * 2.2);

      pos[idx] = Math.cos(angle) * radius;
      pos[idx + 1] = Math.sin(angle) * radius;
      pos[idx + 2] = -Math.random() * TUNNEL_LENGTH;

      // Color gradient between primary and secondary
      const mixRatio = Math.random();
      tempColor.copy(color1).lerp(color2, mixRatio);
      cols[idx] = tempColor.r;
      cols[idx + 1] = tempColor.g;
      cols[idx + 2] = tempColor.b;

      vels[i] = 0.6 + Math.random() * 0.8;
    }

    return [pos, cols, vels];
  }, [primaryColor, secondaryColor]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const posAttr = geom.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    const dt = Math.min(delta, 0.1);
    const speed = (28 + speedMultiplier * 75) * dt;

    for (let i = 0; i < STAR_COUNT; i++) {
      const zIdx = i * 3 + 2;
      posArray[zIdx] += speed * velocities[i];

      // Reset star when it flies past camera
      if (posArray[zIdx] > 10) {
        posArray[zIdx] = -TUNNEL_LENGTH + (posArray[zIdx] - 10);
        // Randomize radial distance slightly on re-entry
        const angle = Math.random() * Math.PI * 2;
        const radius = TUNNEL_RADIUS * (0.4 + Math.random() * 2.2);
        posArray[i * 3] = Math.cos(angle) * radius;
        posArray[i * 3 + 1] = Math.sin(angle) * radius;
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[starColors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

// ── Polygon Tunnel Rings System ──────────────────────────────────────────────
const TunnelRings: React.FC<{
  primaryColor: string;
  secondaryColor: string;
  bassEnergy: number;
  midEnergy: number;
  speedMultiplier: number;
}> = ({ primaryColor, secondaryColor, bassEnergy, midEnergy, speedMultiplier }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringMeshes = useRef<THREE.LineLoop[]>([]);

  // Octagonal ring geometry
  const ringGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 8; // Octagon
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * TUNNEL_RADIUS, Math.sin(theta) * TUNNEL_RADIUS, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  const color1 = useMemo(() => new THREE.Color(primaryColor), [primaryColor]);
  const color2 = useMemo(() => new THREE.Color(secondaryColor), [secondaryColor]);

  // Initial Z positions
  const zPositions = useRef<number[]>(
    Array.from({ length: RING_COUNT }, (_, i) => -i * RING_SPACING)
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.1);
    const forwardStep = (18 + speedMultiplier * 55) * dt;

    for (let i = 0; i < RING_COUNT; i++) {
      zPositions.current[i] += forwardStep;
      if (zPositions.current[i] > 8) {
        zPositions.current[i] -= TUNNEL_LENGTH;
      }

      const ring = ringMeshes.current[i];
      if (ring) {
        const z = zPositions.current[i];
        ring.position.z = z;

        // Radial scale expands with bass and proximity to camera
        const depthNorm = THREE.MathUtils.clamp((z + TUNNEL_LENGTH) / TUNNEL_LENGTH, 0, 1);
        const bassExpand = 1 + bassEnergy * 0.45 * Math.sin(depthNorm * Math.PI);
        ring.scale.set(bassExpand, bassExpand, 1);

        // Twist ring along Z axis
        ring.rotation.z = (depthNorm * Math.PI * 2) + (midEnergy * 2);

        // Fade out rings far back in the tunnel
        const mat = ring.material as THREE.LineBasicMaterial;
        if (mat) {
          mat.opacity = THREE.MathUtils.lerp(0.08, 0.95, depthNorm);
        }
      }
    }
  });

  // Create and memoize ring meshes and their materials
  const rings = useMemo(() => {
    return Array.from({ length: RING_COUNT }).map((_, i) => {
      const progress = i / RING_COUNT;
      const ringColor = color1.clone().lerp(color2, progress);
      const material = new THREE.LineBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.6,
        linewidth: 2,
        blending: THREE.AdditiveBlending,
      });
      const loop = new THREE.LineLoop(ringGeometry, material);
      return { loop, material };
    });
  }, [ringGeometry, color1, color2]);

  // Clean up materials and ring geometry on unmount
  useEffect(() => {
    return () => {
      rings.forEach(({ material, loop }) => {
        material.dispose();
        loop.geometry.dispose();
      });
      ringGeometry.dispose();
    };
  }, [rings, ringGeometry]);

  return (
    <group ref={groupRef}>
      {rings.map(({ loop }, i) => (
        <primitive
          key={i}
          object={loop}
          ref={(el: THREE.LineLoop) => {
            if (el) ringMeshes.current[i] = el;
          }}
        />
      ))}
    </group>
  );
};

// ── Audio Reactive Camera Controller ─────────────────────────────────────────
const WarpCameraController: React.FC<{
  bass: number;
  highs: number;
}> = ({ bass, highs }) => {
  const { camera } = useThree();
  const mouseEffectsEnabled = usePlayerStore((s) => s.mouseEffectsEnabled);
  const targetFov = useRef(60);
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!mouseEffectsEnabled) {
      mousePos.current = { x: 0, y: 0 };
      return;
    }
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mousePos.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseEffectsEnabled]);

  useFrame((_, delta) => {
    if (!camera || !(camera instanceof THREE.PerspectiveCamera)) return;

    // Bass punch expands field of view (warp acceleration sensation)
    const desiredFov = 60 + bass * 22;
    targetFov.current = THREE.MathUtils.damp(targetFov.current, desiredFov, 8, delta);
    camera.fov = targetFov.current;
    camera.updateProjectionMatrix();

    // Subtle parallax sway from mouse
    const targetX = mousePos.current.x * 0.45;
    const targetY = -mousePos.current.y * 0.45;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 4, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 4, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 2.5 - bass * 0.6, 6, delta);

    // Subtle high frequency camera roll
    camera.rotation.z = THREE.MathUtils.damp(
      camera.rotation.z,
      mousePos.current.x * -0.05 + highs * 0.03,
      3,
      delta
    );
  });

  return null;
};

// ── Main Exported Warp Tunnel Visualizer ──────────────────────────────────────
export const WarpTunnelVisualizer: React.FC = () => {
  const { isLucid, lucidPrimaryColor, lucidSecondaryColor, lucidTheme, performanceTier } = usePlayerStore();
  const { getSmoothedData } = useVisualizer(0.18);
  const { primaryColor: aiPrimary, secondaryColor: aiSecondary } = useAIAudioEngine();

  // Audio reactive values updated per frame
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

  // Determine active colors
  const primaryColor = isLucid
    ? lucidPrimaryColor || lucidTheme.primary || '#00f2fe'
    : aiPrimary || '#00f2fe';
  const secondaryColor = isLucid
    ? lucidSecondaryColor || lucidTheme.secondary || '#ff088a'
    : aiSecondary || '#ff088a';

  const dpr: [number, number] | number =
    performanceTier === 'eco' ? 0.85 : performanceTier === 'medium' ? 1.0 : [1, 1.5];

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-black pointer-events-auto select-none">
      {/* 3D Canvas Scene */}
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 60, near: 0.1, far: 200 }}
        dpr={dpr}
        gl={{
          antialias: performanceTier !== 'eco',
          alpha: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x020308, 1);
        }}
      >
        <WarpCameraController
          bass={audioDataRef.current.bass}
          highs={audioDataRef.current.highs}
        />

        <ambientLight intensity={0.4} />

        {/* Hyperspace Particle Stream */}
        <HyperspaceStars
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          speedMultiplier={audioDataRef.current.energy}
        />

        {/* Neon Octagonal Rings */}
        <TunnelRings
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          bassEnergy={audioDataRef.current.bass}
          midEnergy={audioDataRef.current.mids}
          speedMultiplier={audioDataRef.current.energy}
        />
      </Canvas>

      {/* Cyberpunk Speed Vignette & Chromatic Blur FX */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0, 0, 0, 0.75) 85%, #000 100%)`,
        }}
      />

      {/* Center Event Horizon Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none blur-3xl opacity-40 transition-all duration-150"
        style={{
          background: `radial-gradient(circle, ${primaryColor} 0%, ${secondaryColor} 60%, transparent 100%)`,
          transform: `translate(-50%, -50%) scale(${1 + audioDataRef.current.bass * 0.8})`,
        }}
      />
    </div>
  );
};

export default WarpTunnelVisualizer;
