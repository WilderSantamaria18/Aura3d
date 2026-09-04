import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayerStore } from '../../stores/playerStore';
import { PROFESSIONAL_PALETTES } from '../../types/audio';

interface SphereVisualizerProps {
  particleCount?: number;
}

export const SphereVisualizer: React.FC<SphereVisualizerProps> = React.memo(
  ({ particleCount = 2400 }) => {
    const {
      sphereRadius,
      sphereOpacity,
      showFrequencyBars,
      visualizerShape,
      bassBoomThreshold,
      bassBoomIntensity,
      autoMode,
      isLucid,
      lucidTheme,
      currentPaletteIndex,
      vrMode,
      vrTrackingMode,
      handRotation,
      handGesture,
      handLandmarks,
      poseVelocity,
      leftHandPos,
      headPos,
    } = usePlayerStore();

    const pointsRef = useRef<THREE.Points>(null);
    const particleRingRef = useRef<THREE.Points>(null);
    const prevBassRef = useRef(0);
    const boomImpulseRef = useRef(0);
    const boomFlashRef = useRef(0);
    const frameCounterRef = useRef(0);
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
    const colorLucidPrimary = useMemo(() => new THREE.Color(lucidTheme.primary), [lucidTheme.primary]);
    const colorLucidSecondary = useMemo(() => new THREE.Color(lucidTheme.secondary), [lucidTheme.secondary]);
    const tempColor = useMemo(() => new THREE.Color(), []);
    const autoColor = useMemo(() => new THREE.Color(), []);

    const activePalette = PROFESSIONAL_PALETTES[currentPaletteIndex] || PROFESSIONAL_PALETTES[0];
    const palColor1 = useMemo(() => new THREE.Color(activePalette.colors[0] || '#39FF14'), [activePalette]);
    const palColor2 = useMemo(() => new THREE.Color(activePalette.colors[1] || '#00E5FF'), [activePalette]);
    const palColor3 = useMemo(() => new THREE.Color(activePalette.colors[2] || '#9D00FF'), [activePalette]);

    // Generate initial crystalline points based on selected 3D Shape
    const { initialPositions, baseNormals } = useMemo(() => {
      const positions = new Float32Array(particleCount * 3);
      const normals = new Float32Array(particleCount * 3);
      const phi = Math.PI * (Math.sqrt(5) - 1); // Golden angle

      for (let i = 0; i < particleCount; i++) {
        let x = 0, y = 0, z = 0;
        let nx = 0, ny = 0, nz = 0;

        if (visualizerShape === 'rings') {
          // 5 Concentric Torus Rings on different orbital planes
          const ringIdx = i % 5;
          const ringRadii = [0.7, 1.0, 1.3, 1.6, 1.9];
          const ringR = ringRadii[ringIdx] * sphereRadius * 0.75;
          const tubeR = 0.05 * sphereRadius;
          const u = (Math.floor(i / 5) / (particleCount / 5)) * Math.PI * 2;
          const v = ((i % 24) / 24) * Math.PI * 2;
          const tilt = ringIdx * (Math.PI / 5);

          const rawX = (ringR + tubeR * Math.cos(v)) * Math.cos(u);
          const rawY = tubeR * Math.sin(v);
          const rawZ = (ringR + tubeR * Math.cos(v)) * Math.sin(u);

          // Rotate by tilt angle around X-axis
          x = rawX;
          y = rawY * Math.cos(tilt) - rawZ * Math.sin(tilt);
          z = rawY * Math.sin(tilt) + rawZ * Math.cos(tilt);

          const len = Math.sqrt(x * x + y * y + z * z) || 1;
          nx = x / len; ny = y / len; nz = z / len;
        } else if (visualizerShape === 'spikes') {
          // Radial hedgehog spikes: core sphere with 64 spike spikes extending out
          const yVal = 1 - (i / (particleCount - 1)) * 2;
          const radiusAtY = Math.sqrt(Math.max(0, 1 - yVal * yVal));
          const theta = phi * i;
          nx = Math.cos(theta) * radiusAtY;
          ny = yVal;
          nz = Math.sin(theta) * radiusAtY;

          // Spike modulation
          const spikeFreq = 18;
          const isSpike = Math.pow(Math.abs(Math.sin(nx * spikeFreq) * Math.cos(ny * spikeFreq) * Math.sin(nz * spikeFreq)), 3.5);
          const spikeLen = sphereRadius * (0.85 + isSpike * 1.4);
          x = nx * spikeLen;
          y = ny * spikeLen;
          z = nz * spikeLen;
        } else if (visualizerShape === 'cloud') {
          // Organic 3D Brownian particle swarm
          const r = sphereRadius * (0.5 + Math.pow(Math.random(), 0.5) * 1.4);
          const theta = Math.random() * Math.PI * 2;
          const p = Math.acos(2 * Math.random() - 1);
          x = r * Math.sin(p) * Math.cos(theta);
          y = r * Math.sin(p) * Math.sin(theta);
          z = r * Math.cos(p);
          const len = Math.sqrt(x * x + y * y + z * z) || 1;
          nx = x / len; ny = y / len; nz = z / len;
        } else if (visualizerShape === 'torus') {
          const u = (i / particleCount) * Math.PI * 2 * 14;
          const v = ((i % 100) / 100) * Math.PI * 2;
          const R = sphereRadius * 0.95;
          const r = sphereRadius * 0.42;
          x = (R + r * Math.cos(v)) * Math.cos(u);
          y = r * Math.sin(v);
          z = (R + r * Math.cos(v)) * Math.sin(u);
          const len = Math.sqrt(x * x + y * y + z * z) || 1;
          nx = x / len; ny = y / len; nz = z / len;
        } else if (visualizerShape === 'icosahedron' || visualizerShape === 'octahedron') {
          const yVal = 1 - (i / (particleCount - 1)) * 2;
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
          x = nx * sphereRadius; y = ny * sphereRadius; z = nz * sphereRadius;
        } else if (visualizerShape === 'wave') {
          const gridSize = Math.floor(Math.sqrt(particleCount)) || 50;
          const row = Math.floor(i / gridSize);
          const col = i % gridSize;
          x = ((col - gridSize / 2) / (gridSize / 2)) * sphereRadius * 1.8;
          z = ((row - gridSize / 2) / (gridSize / 2)) * sphereRadius * 1.8;
          y = Math.sin(x * 2.5) * Math.cos(z * 2.5) * 0.4;
          nx = 0; ny = 1; nz = 0;
        } else {
          // Default Fibonacci Crystalline Sphere
          const yVal = 1 - (i / (particleCount - 1)) * 2;
          const radiusAtY = Math.sqrt(Math.max(0, 1 - yVal * yVal));
          const theta = phi * i;
          x = Math.cos(theta) * radiusAtY;
          y = yVal;
          z = Math.sin(theta) * radiusAtY;
          nx = x; ny = y; nz = z;
          const jitter = 0.95 + Math.random() * 0.1;
          x *= sphereRadius * jitter;
          y *= sphereRadius * jitter;
          z *= sphereRadius * jitter;
        }

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        normals[i * 3] = nx;
        normals[i * 3 + 1] = ny;
        normals[i * 3 + 2] = nz;
      }

      return { initialPositions: positions, baseNormals: normals };
    }, [particleCount, sphereRadius, visualizerShape]);

    // Buffer geometry for main shape particles
    const { geometry } = useMemo(() => {
      const geo = new THREE.BufferGeometry();
      const posArray = new Float32Array(initialPositions);
      const colArray = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const t = (posArray[i * 3 + 1] / sphereRadius + 1) * 0.5;
        tempColor.copy(colorCyan).lerp(colorMagenta, t);
        colArray[i * 3] = tempColor.r;
        colArray[i * 3 + 1] = tempColor.g;
        colArray[i * 3 + 2] = tempColor.b;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
      return { geometry: geo };
    }, [initialPositions, particleCount, sphereRadius, colorCyan, colorMagenta, tempColor]);

    // 2000 Concentric Cosmic Sand Particle Rings (Organic FFT Bars)
    const ringCount = 2000;
    const { ringPositions, ringBasePositions, ringColors } = useMemo(() => {
      const positions = new Float32Array(ringCount * 3);
      const basePositions = new Float32Array(ringCount * 3);
      const colors = new Float32Array(ringCount * 3);

      for (let i = 0; i < ringCount; i++) {
        const rad = sphereRadius * (1.25 + Math.random() * 2.2);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = rad * Math.sin(phi) * Math.cos(theta);
        const y = (rad * 0.45) * Math.sin(phi) * Math.sin(theta);
        const z = rad * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        basePositions[i * 3] = x;
        basePositions[i * 3 + 1] = y;
        basePositions[i * 3 + 2] = z;

        // Gradient colors
        const t = Math.random();
        tempColor.copy(colorCyan).lerp(colorEmerald, t);
        colors[i * 3] = tempColor.r;
        colors[i * 3 + 1] = tempColor.g;
        colors[i * 3 + 2] = tempColor.b;
      }

      return { ringPositions: positions, ringBasePositions: basePositions, ringColors: colors };
    }, [ringCount, sphereRadius, colorCyan, colorEmerald, tempColor]);

    const { ringGeometry } = useMemo(() => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ringPositions), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ringColors), 3));
      return { ringGeometry: geo };
    }, [ringPositions, ringColors]);

    useEffect(() => {
      return () => {
        geometry.dispose();
        ringGeometry.dispose();
        if (pointsRef.current) {
          (pointsRef.current.material as THREE.Material)?.dispose();
        }
        if (particleRingRef.current) {
          (particleRingRef.current.material as THREE.Material)?.dispose();
        }
      };
    }, [geometry, ringGeometry]);

    // High performance animation loop with 2-frame Analyser throttling
    useFrame((state, delta) => {
      frameCounterRef.current++;
      if (frameCounterRef.current % 2 === 0) {
        cachedAudioRef.current = getSmoothedData();
      }
      const { bass, mids, highs, energy, raw } = cachedAudioRef.current;
      const time = state.clock.getElapsedTime();

      // Bass Transient Detection for Explosive "BOOM"
      const bassDelta = bass - prevBassRef.current;
      const threshold = bassBoomThreshold || 0.45;
      const intensity = bassBoomIntensity || 1.0;

      if (bass > threshold && bassDelta > 0.035) {
        const impulseKick = Math.pow(bass, 1.25) * 1.6 * intensity;
        boomImpulseRef.current = Math.min(2.5, boomImpulseRef.current + impulseKick);
        boomFlashRef.current = Math.min(1.5, 1.0 * intensity);
      }
      prevBassRef.current = bass;

      // Snappy spring decay
      boomImpulseRef.current *= 0.84;
      boomFlashRef.current *= 0.78;
      const boomPunch = boomImpulseRef.current * intensity;

      // Dynamic Camera Punch on Boom Drop & Heavy Bass with Responsive Aspect Fit
      if (state.camera) {
        const aspect = state.size.width / Math.max(1, state.size.height);
        const baseZ = aspect < 1.0 ? 6.2 / Math.max(0.45, aspect * 0.92) : 6.2;
        state.camera.position.z = THREE.MathUtils.lerp(
          state.camera.position.z,
          baseZ - boomPunch * 0.9 - bass * 0.35,
          0.3
        );
      }

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
        const autoHue = (maxIdx / raw.length) * 0.85 + 0.15;
        autoColor.setHSL(autoHue, 1, 0.55 + energy * 0.3);
      }

      // Animate Main Particles + VR Gesture Control
      if (pointsRef.current) {
        const positionAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const colorAttr = pointsRef.current.geometry.attributes.color as THREE.BufferAttribute;
        const positions = positionAttr.array as Float32Array;
        const colors = colorAttr.array as Float32Array;

        // Base continuous rotation (faster in Lucid mode + boost on boom + Dance Velocity Speedup)
        const rotMultiplier = isLucid ? 1.8 : 1.0;
        const danceSpeedBoost = 1.0 + (poseVelocity || 0) * 0.95;
        pointsRef.current.rotation.y += delta * (0.15 + mids * 0.85 + boomPunch * 0.45) * rotMultiplier * danceSpeedBoost;

        // VR Full-Body Dance & Hand Tracking: smooth continuous lerp to keypoints
        if (vrMode) {
          if (handRotation) {
            pointsRef.current.rotation.y += (handRotation.y - pointsRef.current.rotation.y) * 0.15;
            pointsRef.current.rotation.x += (handRotation.x - pointsRef.current.rotation.x) * 0.15;
          }
        } else {
          pointsRef.current.rotation.x = Math.sin(time * 0.3) * (0.1 + mids * 0.2);
          pointsRef.current.rotation.z = Math.cos(time * 0.2) * (0.05 + bass * 0.15);
        }

        // Layer 1: Auto-Fit Base Scale (dynamically calculated to occupy 60% of shortest viewport side)
        const shortestSide = Math.min(state.size.width, state.size.height);
        const autoFitBaseScale = Math.max(0.75, Math.min(1.4, shortestSide / 650));

        // Layer 2: User Multiplier from localStorage (range 0.5x - 2.0x, default 1.0)
        const userMultiplier = sphereRadius || 1.0;

        // Gesture Closed/Fist Boost + Left Hand Subwoofer Boost + Dynamic Subwoofer Pump
        const gestureBoost = (handGesture === 'closed' || handGesture === 'fist') ? 0.35 : 0;
        const leftHandBoost = (vrTrackingMode === 'body' && leftHandPos && leftHandPos.y < 0) ? 0.35 : 0;
        const bassPump = 0.75 + Math.pow(bass, 1.08) * (1.15 + (isLucid ? 0.35 : 0)) + boomPunch * 1.25 + gestureBoost + leftHandBoost;

        const finalMeshScale = autoFitBaseScale * userMultiplier * bassPump;

        // Apply scale in Three.js without moving camera or mutating base geometry
        pointsRef.current.scale.set(finalMeshScale, finalMeshScale, finalMeshScale);

        if (particleRingRef.current) {
          const ringScale = autoFitBaseScale * userMultiplier * (1.0 + bass * 0.35 + boomPunch * 0.6 + leftHandBoost * 0.5);
          particleRingRef.current.scale.set(ringScale, ringScale, ringScale);
        }

        const headYOffset = headPos ? (headPos.y / 6) * 0.18 : 0;

        for (let i = 0; i < particleCount; i++) {
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

          // Idle organic breathing component (keeps shapes alive even in silence)
          const idleBreathe = Math.sin(time * 1.2 + nx * 2) * 0.05;

          if (visualizerShape === 'rings') {
            const ringIdx = i % 5;
            const ringPulse = 1.0 + Math.sin(time * 2.2 + ringIdx * 1.3) * 0.07 + (bass * 0.65);
            const orbitWobble = Math.sin(time * 1.5 + ringIdx * 0.8) * 0.06;
            px = ix * (ringPulse + orbitWobble);
            py = iy * ringPulse + Math.sin(time * 1.8 + ringIdx) * (0.08 + bass * 0.35);
            pz = iz * (ringPulse + orbitWobble);
          } else if (visualizerShape === 'spikes') {
            const isSpikeTip = Math.sqrt(ix * ix + iy * iy + iz * iz) > sphereRadius * 1.1;
            const idleSpike = Math.sin(time * 2.5 + i * 0.3) * 0.06;
            const spikeStretch = isSpikeTip
              ? 1.0 + idleSpike + bass * 1.35 + highs * 0.5
              : 1.0 + idleBreathe + bass * 0.45;
            px = ix * spikeStretch;
            py = iy * spikeStretch;
            pz = iz * spikeStretch;
          } else if (visualizerShape === 'cloud') {
            const brownian = Math.sin(time * 1.6 + i * 0.1) * 0.12;
            const brownianY = Math.cos(time * 1.4 + i * 0.1) * 0.12;
            const attract = (1.0 - bass * 0.35);
            px = (ix + brownian) * attract;
            py = (iy + brownianY) * attract;
            pz = (iz + brownian) * attract;
          } else if (visualizerShape === 'wave') {
            const waveY = Math.sin(ix * 2.0 + time * 2.2) * (0.2 + bass * 0.8) + Math.cos(iz * 2.0 + time * 1.8) * (0.15 + mids * 0.5);
            px = ix;
            py = waveY;
            pz = iz;
          } else if (visualizerShape === 'torus') {
            const torusPulse = 1.0 + Math.sin(time * 2.0 + ny * 3) * 0.06 + bass * 0.55;
            px = ix * torusPulse;
            py = iy * torusPulse;
            pz = iz * torusPulse;
          } else {
            // Default Sphere & 3D Crystals
            const wave =
              Math.sin(nx * 4.0 + time * 2.2) *
              Math.cos(ny * 4.0 + time * 1.8) *
              Math.sin(nz * 4.0 + time * 1.6);

            const displacement = 1.0 + idleBreathe + wave * (0.12 + mids * 0.55) + Math.pow(bass, 1.3) * 0.35;
            px = nx * displacement;
            py = ny * displacement;
            pz = nz * displacement;
          }

          positions[i3] = px;
          positions[i3 + 1] = py;
          positions[i3 + 2] = pz;

          if (autoMode) {
            colors[i3] = autoColor.r;
            colors[i3 + 1] = autoColor.g;
            colors[i3 + 2] = autoColor.b;
          } else if (isLucid) {
            const heightNorm = (ny + 1) * 0.5;
            tempColor.copy(colorLucidPrimary).lerp(colorLucidSecondary, heightNorm).lerp(colorMagenta, (Math.sin(time * 3 + i) + 1) * 0.5 * (highs + 0.25));
            colors[i3] = tempColor.r;
            colors[i3 + 1] = tempColor.g;
            colors[i3 + 2] = tempColor.b;
          } else {
            const heightNorm = (ny + 1) * 0.5;
            tempColor.copy(palColor1).lerp(palColor2, heightNorm).lerp(palColor3, (Math.sin(time * 2 + i) + 1) * 0.5 * (highs + 0.2));
            colors[i3] = tempColor.r;
            colors[i3 + 1] = tempColor.g;
            colors[i3 + 2] = tempColor.b;
          }
        }

        positionAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
      }

      // Animate 2000 Concentric Particle Rings (Organic Sand FFT Waves)
      if (particleRingRef.current && showFrequencyBars) {
        particleRingRef.current.rotation.y += delta * 0.2 * (isLucid ? 1.5 : 1.0);
        const ringPosAttr = particleRingRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const ringPositionsArray = ringPosAttr.array as Float32Array;

        const avg = energy;
        const targetWaveDist = avg * (isLucid ? 1.1 : 0.8);

        for (let i = 0; i < ringCount; i++) {
          const i3 = i * 3;
          const bx = ringBasePositions[i3];
          const by = ringBasePositions[i3 + 1];
          const bz = ringBasePositions[i3 + 2];

          const dist = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
          const normX = bx / dist;
          const normY = by / dist;
          const normZ = bz / dist;

          const harmonic = Math.sin(time * 2.5 + dist * 3) * (0.1 + bass * 0.4);
          const newDist = dist + targetWaveDist + harmonic;

          let handForceX = 0;
          let handForceY = 0;
          if (vrMode && handLandmarks && handLandmarks.length > 0) {
            const handX = (handLandmarks[0].x - 0.5) * 4;
            const handY = (0.5 - handLandmarks[0].y) * 4;
            handForceX = (handX - bx) * 0.08;
            handForceY = (handY - by) * 0.08;
          }

          ringPositionsArray[i3] = normX * newDist + handForceX;
          ringPositionsArray[i3 + 1] = normY * newDist + handForceY;
          ringPositionsArray[i3 + 2] = normZ * newDist;
        }

        ringPosAttr.needsUpdate = true;
      }
    });

    return (
      <group>
        {/* Main 3D Shape Particles */}
        <points ref={pointsRef} geometry={geometry}>
          <pointsMaterial
            size={isLucid ? 0.062 : 0.052}
            vertexColors={true}
            transparent={true}
            opacity={isLucid ? 1.0 : sphereOpacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            sizeAttenuation={true}
          />
        </points>

        {/* 2000 Concentric Cosmic Sand Particle Rings */}
        {showFrequencyBars && (
          <points ref={particleRingRef} geometry={ringGeometry}>
            <pointsMaterial
              size={isLucid ? 0.045 : 0.038}
              vertexColors={true}
              transparent={true}
              opacity={isLucid ? 0.95 : 0.82}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              sizeAttenuation={true}
            />
          </points>
        )}
      </group>
    );
  }
);

export default SphereVisualizer;
