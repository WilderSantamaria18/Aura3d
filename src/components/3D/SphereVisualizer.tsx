import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { usePlayerStore } from '../../stores/playerStore';
import { PROFESSIONAL_PALETTES } from '../../types/audio';

interface SphereVisualizerProps {
  particleCount?: number;
}

const MAX_PARTICLES = 2400;
const MAX_RINGS = 1200;

export const SphereVisualizer: React.FC<SphereVisualizerProps> = React.memo(
  ({ particleCount = 2400 }) => {
    // Stable configuration subscriptions (only re-renders on low-frequency config changes)
    const visualizerShape = usePlayerStore((s) => s.visualizerShape);
    const currentPaletteIndex = usePlayerStore((s) => s.currentPaletteIndex);
    const isLucid = usePlayerStore((s) => s.isLucid);
    const lucidPrimary = usePlayerStore((s) => s.lucidTheme.primary);
    const lucidSecondary = usePlayerStore((s) => s.lucidTheme.secondary);
    const autoMode = usePlayerStore((s) => s.autoMode);
    const vrMode = usePlayerStore((s) => s.vrMode);
    const vrTrackingMode = usePlayerStore((s) => s.vrTrackingMode);
    const showFrequencyBars = usePlayerStore((s) => s.showFrequencyBars);

    const {
      isEco,
      isUltraEco,
      particleBudget,
      ringParticleBudget,
    } = usePerformanceMonitor();

    const activeParticleCount = Math.min(particleCount, particleBudget, MAX_PARTICLES);
    const ringCount = Math.min(ringParticleBudget, MAX_RINGS);

    const groupRef = useRef<THREE.Group>(null);
    const pointsRef = useRef<THREE.Points>(null);
    const particleRingRef = useRef<THREE.Points>(null);
    const frameCounterRef = useRef(0);
    const smoothScaleVec = useMemo(() => new THREE.Vector3(1, 1, 1), []);
    const smoothRingScaleVec = useMemo(() => new THREE.Vector3(1, 1, 1), []);

    // Audio smoothing filters (Exponential Moving Averages) for natural, fluid motion
    const smoothedBassRef = useRef(0);
    const smoothedMidsRef = useRef(0);
    const smoothedHighsRef = useRef(0);
    const smoothedEnergyRef = useRef(0);

    const cachedAudioRef = useRef<{
      bass: number;
      mids: number;
      highs: number;
      energy: number;
      raw: Uint8Array;
    }>({
      bass: 0,
      mids: 0,
      highs: 0,
      energy: 0,
      raw: new Uint8Array(32),
    });
    const { getSmoothedData } = useVisualizer(0.2);

    // Color instances for smooth lerping
    const colorCyan = useMemo(() => new THREE.Color('#00f2fe'), []);
    const colorMagenta = useMemo(() => new THREE.Color('#ff088a'), []);
    const colorEmerald = useMemo(() => new THREE.Color('#00ffb3'), []);
    const colorLucidPrimary = useMemo(() => new THREE.Color(lucidPrimary), [lucidPrimary]);
    const colorLucidSecondary = useMemo(() => new THREE.Color(lucidSecondary), [lucidSecondary]);
    const tempColor = useMemo(() => new THREE.Color(), []);
    const autoColor = useMemo(() => new THREE.Color(), []);

    const activePalette = PROFESSIONAL_PALETTES[currentPaletteIndex] || PROFESSIONAL_PALETTES[0];
    const palColor1 = useMemo(() => new THREE.Color(activePalette.colors[0] || '#39FF14'), [activePalette]);
    const palColor2 = useMemo(() => new THREE.Color(activePalette.colors[1] || '#00E5FF'), [activePalette]);
    const palColor3 = useMemo(() => new THREE.Color(activePalette.colors[2] || '#9D00FF'), [activePalette]);

    // Pre-allocated static PointsMaterials with depthWrite: false to eliminate Z-fighting
    const mainMaterial = useMemo(
      () =>
        new THREE.PointsMaterial({
          size: 0.052,
          vertexColors: true,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: true,
          sizeAttenuation: true,
        }),
      []
    );

    const ringMaterial = useMemo(
      () =>
        new THREE.PointsMaterial({
          size: 0.038,
          vertexColors: true,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: true,
          sizeAttenuation: true,
        }),
      []
    );

    // Generate normalized base points for MAX_PARTICLES (Unit Scale = 1.0)
    // Only re-runs when the visualizer geometry shape changes!
    const { initialPositions, baseNormals } = useMemo(() => {
      const positions = new Float32Array(MAX_PARTICLES * 3);
      const normals = new Float32Array(MAX_PARTICLES * 3);
      const phi = Math.PI * (Math.sqrt(5) - 1); // Golden angle

      for (let i = 0; i < MAX_PARTICLES; i++) {
        let x = 0, y = 0, z = 0;
        let nx = 0, ny = 0, nz = 0;

        if (visualizerShape === 'rings') {
          // 5 Concentric Torus Rings on different orbital planes
          const ringIdx = i % 5;
          const ringRadii = [0.65, 0.9, 1.15, 1.4, 1.65];
          const ringR = ringRadii[ringIdx] * 0.8;
          const tubeR = 0.05;
          const u = (Math.floor(i / 5) / (MAX_PARTICLES / 5)) * Math.PI * 2;
          const v = ((i % 24) / 24) * Math.PI * 2;
          const tilt = ringIdx * (Math.PI / 5);

          const rawX = (ringR + tubeR * Math.cos(v)) * Math.cos(u);
          const rawY = tubeR * Math.sin(v);
          const rawZ = (ringR + tubeR * Math.cos(v)) * Math.sin(u);

          x = rawX;
          y = rawY * Math.cos(tilt) - rawZ * Math.sin(tilt);
          z = rawY * Math.sin(tilt) + rawZ * Math.cos(tilt);

          const len = Math.sqrt(x * x + y * y + z * z) || 1;
          nx = x / len; ny = y / len; nz = z / len;
        } else if (visualizerShape === 'spikes') {
          // Radial spikes: core sphere with 64 spikes
          const yVal = 1 - (i / (MAX_PARTICLES - 1)) * 2;
          const radiusAtY = Math.sqrt(Math.max(0, 1 - yVal * yVal));
          const theta = phi * i;
          nx = Math.cos(theta) * radiusAtY;
          ny = yVal;
          nz = Math.sin(theta) * radiusAtY;

          const spikeFreq = 16;
          const isSpike = Math.pow(Math.abs(Math.sin(nx * spikeFreq) * Math.cos(ny * spikeFreq) * Math.sin(nz * spikeFreq)), 3.0);
          const spikeLen = 0.9 + isSpike * 0.8;
          x = nx * spikeLen;
          y = ny * spikeLen;
          z = nz * spikeLen;
        } else if (visualizerShape === 'cloud') {
          // Organic 3D Brownian particle swarm
          const r = 0.5 + Math.pow(Math.random(), 0.5) * 0.9;
          const theta = Math.random() * Math.PI * 2;
          const p = Math.acos(2 * Math.random() - 1);
          x = r * Math.sin(p) * Math.cos(theta);
          y = r * Math.sin(p) * Math.sin(theta);
          z = r * Math.cos(p);
          const len = Math.sqrt(x * x + y * y + z * z) || 1;
          nx = x / len; ny = y / len; nz = z / len;
        } else if (visualizerShape === 'torus') {
          const u = (i / MAX_PARTICLES) * Math.PI * 2 * 12;
          const v = ((i % 80) / 80) * Math.PI * 2;
          const R = 0.9;
          const r = 0.38;
          x = (R + r * Math.cos(v)) * Math.cos(u);
          y = r * Math.sin(v);
          z = (R + r * Math.cos(v)) * Math.sin(u);
          const len = Math.sqrt(x * x + y * y + z * z) || 1;
          nx = x / len; ny = y / len; nz = z / len;
        } else if (visualizerShape === 'icosahedron' || visualizerShape === 'octahedron') {
          const yVal = 1 - (i / (MAX_PARTICLES - 1)) * 2;
          const radiusAtY = Math.sqrt(Math.max(0, 1 - yVal * yVal));
          const theta = phi * i;
          x = Math.cos(theta) * radiusAtY;
          y = yVal;
          z = Math.sin(theta) * radiusAtY;

          const facetFactor = visualizerShape === 'octahedron' ? 4 : 8;
          x = Math.round(x * facetFactor) / facetFactor;
          y = Math.round(y * facetFactor) / facetFactor;
          z = Math.round(z * facetFactor) / facetFactor;

          const len = Math.sqrt(x * x + y * y + z * z) || 1;
          nx = x / len; ny = y / len; nz = z / len;
          x = nx * 1.0; y = ny * 1.0; z = nz * 1.0;
        } else if (visualizerShape === 'wave') {
          const gridSize = Math.floor(Math.sqrt(MAX_PARTICLES)) || 45;
          const row = Math.floor(i / gridSize);
          const col = i % gridSize;
          x = ((col - gridSize / 2) / (gridSize / 2)) * 1.6;
          z = ((row - gridSize / 2) / (gridSize / 2)) * 1.6;
          y = Math.sin(x * 2.0) * Math.cos(z * 2.0) * 0.3;
          nx = 0; ny = 1; nz = 0;
        } else {
          // Default Fibonacci Crystalline Sphere
          const yVal = 1 - (i / (MAX_PARTICLES - 1)) * 2;
          const radiusAtY = Math.sqrt(Math.max(0, 1 - yVal * yVal));
          const theta = phi * i;
          x = Math.cos(theta) * radiusAtY;
          y = yVal;
          z = Math.sin(theta) * radiusAtY;
          nx = x; ny = y; nz = z;
          const jitter = 0.96 + Math.random() * 0.08;
          x *= jitter;
          y *= jitter;
          z *= jitter;
        }

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        normals[i * 3] = nx;
        normals[i * 3 + 1] = ny;
        normals[i * 3 + 2] = nz;
      }

      return { initialPositions: positions, baseNormals: normals };
    }, [visualizerShape]);

    // Permanent single BufferGeometry with dynamic setDrawRange (0 shader recompilations)
    const { geometry } = useMemo(() => {
      const geo = new THREE.BufferGeometry();
      const posArray = new Float32Array(initialPositions);
      const colArray = new Float32Array(MAX_PARTICLES * 3);

      for (let i = 0; i < MAX_PARTICLES; i++) {
        const t = (posArray[i * 3 + 1] + 1) * 0.5;
        tempColor.copy(colorCyan).lerp(colorMagenta, t);
        colArray[i * 3] = tempColor.r;
        colArray[i * 3 + 1] = tempColor.g;
        colArray[i * 3 + 2] = tempColor.b;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
      geo.setDrawRange(0, activeParticleCount);
      return { geometry: geo };
    }, [initialPositions, colorCyan, colorMagenta, tempColor]);

    // Permanent single BufferGeometry for Concentric Rings
    const { ringBasePositions, ringGeometry } = useMemo(() => {
      const positions = new Float32Array(MAX_RINGS * 3);
      const basePositions = new Float32Array(MAX_RINGS * 3);
      const colors = new Float32Array(MAX_RINGS * 3);

      for (let i = 0; i < MAX_RINGS; i++) {
        const rad = 1.35 + Math.random() * 1.75; // Offset > 1.35 to eliminate Z-fighting with core (1.0)
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = rad * Math.sin(phi) * Math.cos(theta);
        const y = (rad * 0.4) * Math.sin(phi) * Math.sin(theta);
        const z = rad * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        basePositions[i * 3] = x;
        basePositions[i * 3 + 1] = y;
        basePositions[i * 3 + 2] = z;

        const t = Math.random();
        tempColor.copy(colorCyan).lerp(colorEmerald, t);
        colors[i * 3] = tempColor.r;
        colors[i * 3 + 1] = tempColor.g;
        colors[i * 3 + 2] = tempColor.b;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
      geo.setDrawRange(0, ringCount);

      return {
        ringPositions: positions,
        ringBasePositions: basePositions,
        ringColors: colors,
        ringGeometry: geo,
      };
    }, [colorCyan, colorEmerald, tempColor]);

    // Cleanup resources on unmount
    useEffect(() => {
      return () => {
        geometry.dispose();
        ringGeometry.dispose();
        mainMaterial.dispose();
        ringMaterial.dispose();
      };
    }, [geometry, ringGeometry, mainMaterial, ringMaterial]);

    // Ultra-smooth animation loop directly manipulating Three.js objects (0 React state re-renders)
    useFrame((state, delta) => {
      frameCounterRef.current++;
      if (frameCounterRef.current % 2 === 0) {
        cachedAudioRef.current = getSmoothedData();
      }
      const { bass, mids, highs, energy, raw } = cachedAudioRef.current;
      const time = state.clock.getElapsedTime();

      // Exponential moving average filter for natural organic motion
      smoothedBassRef.current += (bass - smoothedBassRef.current) * 0.16;
      smoothedMidsRef.current += (mids - smoothedMidsRef.current) * 0.16;
      smoothedHighsRef.current += (highs - smoothedHighsRef.current) * 0.16;
      smoothedEnergyRef.current += (energy - smoothedEnergyRef.current) * 0.16;

      const sBass = smoothedBassRef.current;
      const sMids = smoothedMidsRef.current;
      const sHighs = smoothedHighsRef.current;
      const sEnergy = smoothedEnergyRef.current;

      const playerState = usePlayerStore.getState();
      const sphereRadius = playerState.sphereRadius || 1.0;
      const sphereOpacity = playerState.sphereOpacity ?? 0.9;
      const handRotation = playerState.handRotation;
      const handGesture = playerState.handGesture;
      const poseVelocity = playerState.poseVelocity;
      const leftHandPos = playerState.leftHandPos;
      const headPos = playerState.headPos;
      const handLandmarks = playerState.handLandmarks;

      // Update material properties directly without triggering React re-renders
      mainMaterial.opacity = isLucid ? 1.0 : isUltraEco ? Math.min(1.0, sphereOpacity + 0.1) : sphereOpacity;
      mainMaterial.size = isLucid ? 0.058 : isUltraEco ? 0.065 : isEco ? 0.056 : 0.048;

      ringMaterial.opacity = isLucid ? 0.95 : 0.8;
      ringMaterial.size = isLucid ? 0.042 : isUltraEco ? 0.046 : isEco ? 0.040 : 0.035;

      // Update draw range instantly with 0 shader recompilation
      geometry.setDrawRange(0, activeParticleCount);
      ringGeometry.setDrawRange(0, ringCount);

      // Auto AI Color Mode calculation
      if (autoMode) {
        let maxVal = 0;
        let maxIdx = 0;
        raw.forEach((v, i) => {
          if (v > maxVal) {
            maxVal = v;
            maxIdx = i;
          }
        });
        const autoHue = (maxIdx / Math.max(1, raw.length)) * 0.85 + 0.15;
        autoColor.setHSL(autoHue, 1, 0.55 + sEnergy * 0.25);
      }

      // Animate Main Particles
      if (pointsRef.current) {
        const positionAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const colorAttr = pointsRef.current.geometry.attributes.color as THREE.BufferAttribute;
        const positions = positionAttr.array as Float32Array;
        const colors = colorAttr.array as Float32Array;

        // Base continuous rotation
        const rotMultiplier = isLucid ? 1.6 : 1.0;
        const danceSpeedBoost = 1.0 + (poseVelocity || 0) * 0.75;
        pointsRef.current.rotation.y += delta * (0.12 + sMids * 0.45) * rotMultiplier * danceSpeedBoost;

        // VR Full-Body Dance & Hand Tracking: smooth continuous lerp
        if (vrMode) {
          if (handRotation) {
            pointsRef.current.rotation.y += (handRotation.y - pointsRef.current.rotation.y) * 0.12;
            pointsRef.current.rotation.x += (handRotation.x - pointsRef.current.rotation.x) * 0.12;
          }
        } else {
          pointsRef.current.rotation.x = Math.sin(time * 0.25) * (0.08 + sMids * 0.15);
          pointsRef.current.rotation.z = Math.cos(time * 0.2) * (0.04 + sBass * 0.1);
        }

        // Layer 1: Auto-Fit Base Scale
        const shortestSide = Math.min(state.size.width, state.size.height);
        const autoFitBaseScale = Math.max(0.85, Math.min(1.4, shortestSide / 620));

        // Layer 2: User Multiplier from localStorage / Pinch Slider
        const userMultiplier = sphereRadius || 1.0;

        // Soft music breathing pump
        const gestureBoost = (handGesture === 'closed' || handGesture === 'fist') ? 0.25 : 0;
        const leftHandBoost = (vrTrackingMode === 'body' && leftHandPos && leftHandPos.y < 0) ? 0.25 : 0;
        const bassPump = 0.92 + Math.pow(sBass, 1.1) * (0.32 + (isLucid ? 0.15 : 0)) + gestureBoost + leftHandBoost;

        const targetScaleVal = autoFitBaseScale * userMultiplier * bassPump;
        smoothScaleVec.set(targetScaleVal, targetScaleVal, targetScaleVal);
        pointsRef.current.scale.lerp(smoothScaleVec, 0.14);

        if (particleRingRef.current) {
          const targetRingScaleVal = autoFitBaseScale * userMultiplier * (1.0 + sBass * 0.2 + leftHandBoost * 0.3);
          smoothRingScaleVec.set(targetRingScaleVal, targetRingScaleVal, targetRingScaleVal);
          particleRingRef.current.scale.lerp(smoothRingScaleVec, 0.14);
        }

        const headYOffset = headPos ? (headPos.y / 6) * 0.15 : 0;

        // Natural and smooth particle displacement loop
        for (let i = 0; i < activeParticleCount; i++) {
          const i3 = i * 3;
          const nx = baseNormals[i3];
          const ny = baseNormals[i3 + 1];
          const nz = baseNormals[i3 + 2];
          const ix = initialPositions[i3];
          const iy = initialPositions[i3 + 1];
          const iz = initialPositions[i3 + 2];

          let px = ix;
          let py = iy + headYOffset;
          let pz = iz;

          // Idle organic breathing component
          const idleBreathe = Math.sin(time * 1.3 + nx * 2.2 + ny * 1.5) * 0.04;

          if (visualizerShape === 'rings') {
            const ringIdx = i % 5;
            const ringPulse = 1.0 + Math.sin(time * 1.8 + ringIdx * 1.2) * 0.05 + (sBass * 0.35);
            const orbitWobble = Math.sin(time * 1.2 + ringIdx * 0.8) * 0.04;
            px = ix * (ringPulse + orbitWobble);
            py = iy * ringPulse + Math.sin(time * 1.5 + ringIdx) * (0.05 + sBass * 0.2);
            pz = iz * (ringPulse + orbitWobble);
          } else if (visualizerShape === 'spikes') {
            const idleSpike = Math.sin(time * 2.0 + nx * 5.0 + ny * 5.0) * 0.04;
            const spikeStretch = 1.0 + idleSpike + sBass * 0.5 + sHighs * 0.3;
            px = ix * spikeStretch;
            py = iy * spikeStretch;
            pz = iz * spikeStretch;
          } else if (visualizerShape === 'cloud') {
            const brownian = Math.sin(time * 1.4 + nx * 3.0) * 0.08;
            const brownianY = Math.cos(time * 1.2 + ny * 3.0) * 0.08;
            const attract = (1.0 - sBass * 0.18);
            px = (ix + brownian) * attract;
            py = (iy + brownianY) * attract;
            pz = (iz + brownian) * attract;
          } else if (visualizerShape === 'wave') {
            const waveY = Math.sin(ix * 2.5 + time * 1.8) * (0.15 + sBass * 0.4) + Math.cos(iz * 2.5 + time * 1.5) * (0.1 + sMids * 0.3);
            px = ix;
            py = waveY;
            pz = iz;
          } else if (visualizerShape === 'torus') {
            const torusPulse = 1.0 + Math.sin(time * 1.8 + ny * 3.0) * 0.05 + sBass * 0.3;
            px = ix * torusPulse;
            py = iy * torusPulse;
            pz = iz * torusPulse;
          } else {
            // Default Smooth Fibonacci Crystalline Sphere
            const wave1 = Math.sin(nx * 3.2 + time * 1.4 + ny * 2.0) * 0.06;
            const wave2 = Math.cos(nz * 3.2 + time * 1.2 + nx * 2.0) * 0.06;
            const displacement = 1.0 + idleBreathe + (wave1 + wave2) * (0.2 + sMids * 0.4) + Math.pow(sBass, 1.2) * 0.25;
            px = nx * displacement;
            py = ny * displacement;
            pz = nz * displacement;
          }

          positions[i3] = px;
          positions[i3 + 1] = py;
          positions[i3 + 2] = pz;

          // Smooth harmonic colors
          if (autoMode) {
            colors[i3] = autoColor.r;
            colors[i3 + 1] = autoColor.g;
            colors[i3 + 2] = autoColor.b;
          } else if (isLucid) {
            const heightNorm = (ny + 1) * 0.5;
            const waveColor = (Math.sin(time * 2.0 + nx * 2.5 + ny * 2.5) + 1) * 0.5;
            tempColor.copy(colorLucidPrimary).lerp(colorLucidSecondary, heightNorm).lerp(colorMagenta, waveColor * (sHighs + 0.2));
            colors[i3] = tempColor.r;
            colors[i3 + 1] = tempColor.g;
            colors[i3 + 2] = tempColor.b;
          } else {
            const heightNorm = (ny + 1) * 0.5;
            const waveColor = (Math.sin(time * 1.5 + nx * 2.0 + ny * 2.0) + 1) * 0.5;
            tempColor.copy(palColor1).lerp(palColor2, heightNorm).lerp(palColor3, waveColor * (sHighs + 0.15));
            colors[i3] = tempColor.r;
            colors[i3 + 1] = tempColor.g;
            colors[i3 + 2] = tempColor.b;
          }
        }

        positionAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
      }

      // Animate Concentric Particle Rings (Organic Sand FFT Waves)
      if (particleRingRef.current && showFrequencyBars) {
        particleRingRef.current.rotation.y += delta * 0.15 * (isLucid ? 1.4 : 1.0);
        const ringPosAttr = particleRingRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const ringPositionsArray = ringPosAttr.array as Float32Array;

        const targetWaveDist = sEnergy * (isLucid ? 0.65 : 0.45);

        for (let i = 0; i < ringCount; i++) {
          const i3 = i * 3;
          const bx = ringBasePositions[i3];
          const by = ringBasePositions[i3 + 1];
          const bz = ringBasePositions[i3 + 2];

          const dist = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
          const normX = bx / dist;
          const normY = by / dist;
          const normZ = bz / dist;

          const harmonic = Math.sin(time * 2.0 + dist * 2.5) * (0.05 + sBass * 0.2);
          const newDist = dist + targetWaveDist + harmonic;

          let handForceX = 0;
          let handForceY = 0;
          if (vrMode && handLandmarks && handLandmarks.length > 0) {
            const handX = (handLandmarks[0].x - 0.5) * 3;
            const handY = (0.5 - handLandmarks[0].y) * 3;
            handForceX = (handX - bx) * 0.05;
            handForceY = (handY - by) * 0.05;
          }

          ringPositionsArray[i3] = normX * newDist + handForceX;
          ringPositionsArray[i3 + 1] = normY * newDist + handForceY;
          ringPositionsArray[i3 + 2] = normZ * newDist;
        }

        ringPosAttr.needsUpdate = true;
      }
    });

    return (
      <group ref={groupRef}>
        {/* Main 3D Shape Particles */}
        <points ref={pointsRef} geometry={geometry} material={mainMaterial} />

        {/* Concentric Cosmic Sand Particle Rings (Shown only when 3D Bars are toggled ON) */}
        {showFrequencyBars && (
          <points ref={particleRingRef} geometry={ringGeometry} material={ringMaterial} />
        )}
      </group>
    );
  }
);

export default SphereVisualizer;
