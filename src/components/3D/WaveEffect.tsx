import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayerStore } from '../../stores/playerStore';
import { PROFESSIONAL_PALETTES } from '../../types/audio';
import type { WaveEffectMode } from '../../types/audio';

interface WaveEffectProps {
  particleCount?: number;
}

export const WaveEffect: React.FC<WaveEffectProps> = ({ particleCount = 2000 }) => {
  const {
    waveEffectMode,
    waveEffectIntensity,
    isLucid,
    lucidTheme,
    currentPaletteIndex,
    sphereRadius,
  } = usePlayerStore();

  const pointsRef = useRef<THREE.Points>(null);
  const { getSmoothedData } = useVisualizer(0.2);

  // Transition smoothing state
  const [prevMode, setPrevMode] = useState<WaveEffectMode>(waveEffectMode);
  const [targetMode, setTargetMode] = useState<WaveEffectMode>(waveEffectMode);
  const transitionRef = useRef(1); // 1 = fully targetMode

  useEffect(() => {
    if (waveEffectMode !== targetMode) {
      setPrevMode(targetMode);
      setTargetMode(waveEffectMode);
      transitionRef.current = 0;
    }
  }, [waveEffectMode, targetMode]);

  // Initial base coordinates in spherical coordinates (r, theta, phi)
  const { basePositions, baseAngles, colors } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const angles = new Float32Array(particleCount * 2); // theta, phi
    const col = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 1.9 + Math.random() * 2.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      angles[i * 2] = theta;
      angles[i * 2 + 1] = phi;

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);

      // Gradient color initialization
      col[i * 3] = 0.0;
      col[i * 3 + 1] = 0.95;
      col[i * 3 + 2] = 1.0;
    }

    return { basePositions: pos, baseAngles: angles, colors: col };
  }, [particleCount]);

  // Palette colors for lerp
  const pal = PROFESSIONAL_PALETTES[currentPaletteIndex] || PROFESSIONAL_PALETTES[0];
  const palColor1 = useMemo(() => new THREE.Color(pal.colors[0] || '#39FF14'), [pal]);
  const palColor2 = useMemo(() => new THREE.Color(pal.colors[1] || '#00E5FF'), [pal]);
  const palColor3 = useMemo(() => new THREE.Color(pal.colors[2] || '#9D00FF'), [pal]);
  const lucidColor1 = useMemo(() => new THREE.Color(lucidTheme.primary), [lucidTheme.primary]);
  const lucidColor2 = useMemo(() => new THREE.Color(lucidTheme.secondary), [lucidTheme.secondary]);
  const tempCol = useMemo(() => new THREE.Color(), []);

  // Compute radial distance offset for a specific mode
  const computeModeOffset = (
    mode: WaveEffectMode,
    r: number,
    theta: number,
    phi: number,
    time: number,
    speed: number,
    waveAmp: number,
    bass: number,
    highs: number
  ) => {
    switch (mode) {
      case 'concentric':
        // Spherical expanding rings pulsing outwards
        return (
          Math.sin(r * 4.2 - time * speed * 2.0) * waveAmp * 0.38 +
          Math.cos(phi * 3.0 + time * speed) * bass * 0.25
        );
      case 'sinusoidal':
        // Undulating vertical ripple curtain
        return (
          Math.sin(theta * 6.0 + time * speed * 1.5) * waveAmp * 0.32 +
          Math.cos(phi * 4.0 - time * speed) * 0.18
        );
      case 'spiral':
        // Vortex spiral arms twisting with high frequencies
        return (
          Math.sin(theta * 5.0 + r * 2.8 - time * speed * 2.2) * waveAmp * 0.35 +
          Math.sin(phi * 8.0 + highs * 4.0) * 0.15
        );
      case 'void':
        // Deep breathing particle expansion / void aura
        return (
          Math.sin(time * speed * 1.2) * waveAmp * 0.45 +
          Math.sin(r * 2.0 + theta * 3.0) * bass * 0.3
        );
      case 'off':
      default:
        return 0;
    }
  };

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;

    const { bass, mids, highs, energy } = getSmoothedData();
    const posAttr = pointsRef.current.geometry.attributes.position;
    const colAttr = pointsRef.current.geometry.attributes.color;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;

    const time = clock.getElapsedTime();
    const speed = 0.6 + waveEffectIntensity * 0.6;
    const waveAmp = 0.25 + (energy * 0.7 + mids * 0.3) * waveEffectIntensity;

    // Advance transition progress smoothly
    if (transitionRef.current < 1) {
      transitionRef.current = Math.min(1, transitionRef.current + 0.04);
    }
    const tProgress = transitionRef.current;

    // Dynamic color lerp
    const c1 = isLucid ? lucidColor1 : palColor1;
    const c2 = isLucid ? lucidColor2 : palColor2;
    const c3 = palColor3;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const theta = baseAngles[i * 2];
      const phi = baseAngles[i * 2 + 1];

      // Base radius scaled by sphere radius
      const baseR = (1.8 + (i % 100) * 0.024) * sphereRadius;

      // Compute offsets for both previous and target modes, then lerp
      const offPrev = computeModeOffset(
        prevMode,
        baseR,
        theta,
        phi,
        time,
        speed,
        waveAmp,
        bass,
        highs
      );
      const offTarget = computeModeOffset(
        targetMode,
        baseR,
        theta,
        phi,
        time,
        speed,
        waveAmp,
        bass,
        highs
      );

      const combinedOffset = THREE.MathUtils.lerp(offPrev, offTarget, tProgress);
      const finalR = Math.max(0.2, baseR + combinedOffset);

      // Convert back to cartesian coordinates
      posArr[idx] = finalR * Math.sin(phi) * Math.cos(theta);
      posArr[idx + 1] = finalR * Math.sin(phi) * Math.sin(theta);
      posArr[idx + 2] = finalR * Math.cos(phi);

      // Update particle colors based on frequency and elevation
      const normHeight = (Math.sin(phi) + 1) * 0.5;
      if (normHeight < 0.5) {
        tempCol.lerpColors(c1, c2, normHeight * 2);
      } else {
        tempCol.lerpColors(c2, c3, (normHeight - 0.5) * 2);
      }

      // Brightness boost on bass hits
      const lum = 0.4 + bass * 0.6;
      colArr[idx] = tempCol.r * lum;
      colArr[idx + 1] = tempCol.g * lum;
      colArr[idx + 2] = tempCol.b * lum;
    }

    posAttr.needsUpdate = true;
    // Continuous celestial rotation even at idle
    pointsRef.current.rotation.y = time * 0.08 * (isLucid ? 1.5 : 1.0);
    pointsRef.current.rotation.x = Math.sin(time * 0.15) * 0.06;

    // Material animation
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    if (mat) {
      const isOff = targetMode === 'off' && tProgress === 1;
      const targetOpacity = isOff ? 0 : 0.65 + energy * 0.35;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.1);
      mat.size = 0.038 + energy * 0.032;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[basePositions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        vertexColors
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export default WaveEffect;
