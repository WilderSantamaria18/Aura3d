import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { usePlayerStore } from '../../stores/playerStore';
import { PROFESSIONAL_PALETTES } from '../../types/audio';
import { aiSceneDirector } from '../../services/aiSceneDirectorService';

interface SphereVisualizerProps {
  particleCount?: number;
}

const MAX_PARTICLES = 2400;

// Kick Shockwave Detector & Radial Propagation Constants
const KICK_THRESHOLD = 0.18;
const KICK_ATTACK_DELTA = 0.06;
const KICK_COOLDOWN_SEC = 0.16; // 160ms (≈ ~375 BPM max)
const WAVE_LIFETIME_SEC = 0.85; // 850ms duration
const WAVE_MAX_RADIUS = 2.2;
const WAVE_BAND_WIDTH = 0.28;
const INV_WAVE_BAND_WIDTH = 1.0 / WAVE_BAND_WIDTH;
const BASE_WAVE_STRENGTH = 0.42;
const SHOCKWAVE_SLOTS = 8;

// Shape numeric identifiers for GPU vertex shader branching
const SHAPE_DEFAULT = 0;
const SHAPE_WAVE = 1;
const SHAPE_RINGS = 2;
const SHAPE_SPIKES = 3;
const SHAPE_CLOUD = 4;
const SHAPE_TORUS = 5;
const SHAPE_FACETED = 6;

const getShapeId = (shape?: string): number => {
  switch (shape) {
    case 'wave':
      return SHAPE_WAVE;
    case 'rings':
      return SHAPE_RINGS;
    case 'spikes':
      return SHAPE_SPIKES;
    case 'cloud':
      return SHAPE_CLOUD;
    case 'torus':
      return SHAPE_TORUS;
    case 'icosahedron':
    case 'octahedron':
      return SHAPE_FACETED;
    default:
      return SHAPE_DEFAULT;
  }
};

// --- GPU SHADERS: Pure Sea-Sand Particles ---
const MainSphereShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uBass;
    uniform float uMids;
    uniform float uHighs;
    uniform float uEnergy;
    uniform int uShape;
    uniform float uSize;
    uniform float uAudioGlow;
    uniform float uHeadYOffset;
    uniform float uInvWaveBandWidth;
    uniform int uNumShockwaves;
    uniform vec2 uShockwaves[8]; // x: waveRadius, y: strengthDecay
    uniform vec4 uVRPush1; // xyz: world pos, w: force
    uniform vec4 uVRPush2; // xyz: world pos, w: force
    uniform float uPixelRatio;

    attribute vec3 color;

    varying vec4 vColor;

    void main() {
      vec3 pos = position;
      vec3 n = normal;

      pos.y += uHeadYOffset;

      if (uShape == 1) {
        // Wave (Onda Sinusoidal 3D) - Fluid water & soft sand ripple
        float w1 = sin(pos.x * 2.0 + uTime * 1.25) * (0.13 + uBass * 0.32);
        float w2 = cos(pos.z * 2.0 + uTime * 1.10) * (0.09 + uMids * 0.25);
        float w3 = sin((pos.x + pos.z) * 1.3 + uTime * 0.85) * 0.05;
        pos.y = w1 + w2 + w3;
      } else if (uShape == 2) {
        // Rings
        float ringPulse = 1.0 + sin(uTime * 1.8 + length(pos.xz) * 2.2) * 0.05 + uBass * 0.32;
        float orbitWobble = sin(uTime * 1.2 + pos.y * 3.0) * 0.04;
        pos.x *= (ringPulse + orbitWobble);
        pos.y = pos.y * ringPulse + sin(uTime * 1.5) * (0.05 + uBass * 0.2);
        pos.z *= (ringPulse + orbitWobble);
      } else if (uShape == 3) {
        // Spikes
        float idleSpike = sin(uTime * 2.0 + n.x * 5.0 + n.y * 5.0) * 0.04;
        float spikeStretch = 1.0 + idleSpike + uBass * 0.45 + uHighs * 0.28;
        pos = pos * spikeStretch;
      } else if (uShape == 4) {
        // Cloud
        float brownianX = sin(uTime * 1.4 + n.x * 3.0) * 0.07;
        float brownianY = cos(uTime * 1.2 + n.y * 3.0) * 0.07;
        float attract = 1.0 - uBass * 0.16;
        pos = (pos + vec3(brownianX, brownianY, brownianY)) * attract;
      } else if (uShape == 5) {
        // Torus
        float torusPulse = 1.0 + sin(uTime * 1.8 + n.y * 3.0) * 0.05 + uBass * 0.28;
        pos *= torusPulse;
      } else if (uShape == 6) {
        // Faceted (icosahedron / octahedron)
        float facetPulse = 1.0 + sin(uTime * 1.5) * 0.03 + uBass * 0.25;
        pos *= facetPulse;
      } else {
        // Default Fibonacci Crystalline Sphere - Organic breathing & smooth rippling
        float idleBreathe = sin(uTime * 1.1 + n.x * 1.8 + n.y * 1.4) * 0.038;
        float surfaceWave1 = sin(n.x * 2.6 + uTime * 1.25 + n.y * 1.6) * 0.052;
        float surfaceWave2 = cos(n.z * 2.6 + uTime * 1.05 + n.x * 1.6) * 0.052;
        float bassPulse = pow(max(0.0, uBass), 1.25) * 0.22;
        float midsMod = (surfaceWave1 + surfaceWave2) * (0.18 + uMids * 0.35);
        float displacement = 1.0 + idleBreathe + midsMod + bassPulse;
        pos = n * displacement;
      }

      // Kick Shockwave Displacement in GPU
      if (uNumShockwaves > 0) {
        float dist = length(pos);
        if (dist > 0.0001) {
          float totalImpact = 0.0;
          for (int i = 0; i < 8; i++) {
            if (i >= uNumShockwaves) break;
            float diff = (dist - uShockwaves[i].x) * uInvWaveBandWidth;
            if (abs(diff) < 2.5) {
              totalImpact += exp(-diff * diff) * uShockwaves[i].y;
            }
          }
          if (totalImpact > 0.0001) {
            float radialDisplacement = totalImpact * (1.0 + totalImpact * 1.2);
            pos += n * radialDisplacement;
          }
        }
      }

      // VR Physical Interactive Push
      if (uVRPush1.w > 0.0) {
        vec3 d = pos - uVRPush1.xyz;
        float d2 = dot(d, d);
        if (d2 < 2.2) {
          float force = (1.0 - sqrt(d2) / 1.48) * uVRPush1.w;
          pos += normalize(d + 0.001) * force;
        }
      }
      if (uVRPush2.w > 0.0) {
        vec3 d = pos - uVRPush2.xyz;
        float d2 = dot(d, d);
        if (d2 < 2.2) {
          float force = (1.0 - sqrt(d2) / 1.48) * uVRPush2.w;
          pos += normalize(d + 0.001) * force;
        }
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Distance attenuated point size with soft bounds
      float pointDist = max(0.4, -mvPosition.z);
      gl_PointSize = clamp(uSize * (360.0 / pointDist) * uPixelRatio, 1.5, 32.0);

      vColor = vec4(color * uAudioGlow, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uOpacity;
    varying vec4 vColor;

    void main() {
      // Soft circular particle disc ("arena del mar" aesthetic)
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;

      // Soft anti-aliased edge falloff
      float alpha = smoothstep(0.5, 0.08, dist) * vColor.a * uOpacity;
      // Subtle luminous sand core
      float core = smoothstep(0.22, 0.0, dist) * 0.42;
      vec3 finalColor = vColor.rgb * (1.0 + core);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

export const SphereVisualizer: React.FC<SphereVisualizerProps> = React.memo(
  ({ particleCount = 2400 }) => {
    // Stable configuration subscriptions
    const sphereShape = usePlayerStore((s) => s.sphereShape || s.visualizerShape);
    const currentPaletteIndex = usePlayerStore((s) => s.currentPaletteIndex);
    const isLucid = usePlayerStore((s) => s.isLucid);
    const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme.primary);
    const lucidSecondary = usePlayerStore((s) => s.lucidSecondaryColor || s.lucidTheme.secondary);
    const autoMode = usePlayerStore((s) => s.autoMode);
    const dynamicColor = usePlayerStore((s) => s.dynamicColor || '#00f2fe');
    const vrMode = usePlayerStore((s) => s.vrMode);

    const { isEco, isUltraEco } = usePerformanceMonitor();

    // Maintain full ~2400 particle resolution across all tiers to eliminate pixelation
    const activeParticleCount = Math.min(particleCount, MAX_PARTICLES);

    const groupRef = useRef<THREE.Group>(null);
    const pointsRef = useRef<THREE.Points>(null);
    const smoothScaleVec = useMemo(() => new THREE.Vector3(1, 1, 1), []);

    // Kick Shockwave Tracking Refs
    const prevBassRef = useRef(0);
    const lastKickTimeRef = useRef(0);
    const shockWavesRef = useRef<Float32Array>(new Float32Array(SHOCKWAVE_SLOTS).fill(-999));
    const nextWaveIdxRef = useRef(0);

    // Audio smoothing filters (EMA)
    const smoothedBassRef = useRef(0);
    const smoothedMidsRef = useRef(0);
    const smoothedHighsRef = useRef(0);
    const smoothedEnergyRef = useRef(0);

    const { getSmoothedData } = useVisualizer(0.2);

    // Color instances for palette handling
    const colorLucidPrimary = useMemo(() => new THREE.Color(lucidPrimary), [lucidPrimary]);
    const colorLucidSecondary = useMemo(() => new THREE.Color(lucidSecondary), [lucidSecondary]);
    const autoPrimaryColor = useMemo(() => new THREE.Color(dynamicColor), [dynamicColor]);

    const activePalette = PROFESSIONAL_PALETTES[currentPaletteIndex] || PROFESSIONAL_PALETTES[0];
    const palColor1 = useMemo(() => new THREE.Color(activePalette.colors[0] || '#39FF14'), [activePalette]);
    const palColor2 = useMemo(() => new THREE.Color(activePalette.colors[1] || '#00E5FF'), [activePalette]);
    const palColor3 = useMemo(() => new THREE.Color(activePalette.colors[2] || '#9D00FF'), [activePalette]);

    // Shockwave GPU uniform array references
    const shockwavesUniform = useMemo(
      () => Array.from({ length: 8 }, () => new THREE.Vector2(0, 0)),
      []
    );

    // High-performance GPU ShaderMaterial for main particles
    const mainShaderMaterial = useMemo(() => {
      return new THREE.ShaderMaterial({
        vertexShader: MainSphereShader.vertexShader,
        fragmentShader: MainSphereShader.fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uBass: { value: 0 },
          uMids: { value: 0 },
          uHighs: { value: 0 },
          uEnergy: { value: 0 },
          uShape: { value: getShapeId(sphereShape) },
          uSize: { value: 0.052 },
          uOpacity: { value: 0.9 },
          uAudioGlow: { value: 1.0 },
          uHeadYOffset: { value: 0.0 },
          uInvWaveBandWidth: { value: INV_WAVE_BAND_WIDTH },
          uNumShockwaves: { value: 0 },
          uShockwaves: { value: shockwavesUniform },
          uVRPush1: { value: new THREE.Vector4(0, 0, 0, 0) },
          uVRPush2: { value: new THREE.Vector4(0, 0, 0, 0) },
          uPixelRatio: { value: 1.0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
      });
    }, [shockwavesUniform, sphereShape]);

    // Generate normalized base points for activeParticleCount (Unit Scale = 1.0)
    // Run ONLY on shape or count changes, NEVER in frame loop!
    const { initialPositions, baseNormals } = useMemo(() => {
      const count = activeParticleCount;
      const positions = new Float32Array(count * 3);
      const normals = new Float32Array(count * 3);
      const phi = Math.PI * (Math.sqrt(5) - 1); // Golden angle

      for (let i = 0; i < count; i++) {
        let x = 0, y = 0, z = 0;
        let nx = 0, ny = 0, nz = 0;

        if (sphereShape === 'rings') {
          const ringIdx = i % 5;
          const ringRadii = [0.65, 0.9, 1.15, 1.4, 1.65];
          const ringR = ringRadii[ringIdx] * 0.8;
          const tubeR = 0.05;
          const particlesPerRing = Math.max(1, Math.floor(count / 5));
          const ringParticleIdx = Math.floor(i / 5);
          const u = (ringParticleIdx / particlesPerRing) * Math.PI * 2;
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
        } else if (sphereShape === 'spikes') {
          const yVal = 1 - (i / Math.max(1, count - 1)) * 2;
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
        } else if (sphereShape === 'cloud') {
          const rand1 = ((i * 12345 + 6789) % 10000) / 10000;
          const rand2 = ((i * 54321 + 9876) % 10000) / 10000;
          const rand3 = ((i * 31415 + 9265) % 10000) / 10000;
          const r = 0.5 + Math.pow(rand1, 0.5) * 0.9;
          const theta = rand2 * Math.PI * 2;
          const p = Math.acos(2 * rand3 - 1);
          x = r * Math.sin(p) * Math.cos(theta);
          y = r * Math.sin(p) * Math.sin(theta);
          z = r * Math.cos(p);
          const len = Math.sqrt(x * x + y * y + z * z) || 1;
          nx = x / len; ny = y / len; nz = z / len;
        } else if (sphereShape === 'torus') {
          const u = (i / Math.max(1, count)) * Math.PI * 2 * 12;
          const v = ((i % 80) / 80) * Math.PI * 2;
          const R = 0.9;
          const r = 0.38;
          x = (R + r * Math.cos(v)) * Math.cos(u);
          y = r * Math.sin(v);
          z = (R + r * Math.cos(v)) * Math.sin(u);
          const len = Math.sqrt(x * x + y * y + z * z) || 1;
          nx = x / len; ny = y / len; nz = z / len;
        } else if (sphereShape === 'icosahedron' || sphereShape === 'octahedron') {
          const yVal = 1 - (i / Math.max(1, count - 1)) * 2;
          const radiusAtY = Math.sqrt(Math.max(0, 1 - yVal * yVal));
          const theta = phi * i;
          x = Math.cos(theta) * radiusAtY;
          y = yVal;
          z = Math.sin(theta) * radiusAtY;

          const facetFactor = sphereShape === 'octahedron' ? 4 : 8;
          x = Math.round(x * facetFactor) / facetFactor;
          y = Math.round(y * facetFactor) / facetFactor;
          z = Math.round(z * facetFactor) / facetFactor;

          const len = Math.sqrt(x * x + y * y + z * z) || 1;
          nx = x / len; ny = y / len; nz = z / len;
          x = nx * 1.0; y = ny * 1.0; z = nz * 1.0;
        } else if (sphereShape === 'wave') {
          const gridSize = Math.floor(Math.sqrt(count)) || 45;
          const row = Math.floor(i / gridSize);
          const col = i % gridSize;
          x = ((col - gridSize / 2) / (gridSize / 2)) * 1.6;
          z = ((row - gridSize / 2) / (gridSize / 2)) * 1.6;
          y = 0; // Wave y-displacement calculated in vertex shader
          nx = 0; ny = 1; nz = 0;
        } else {
          // Default Fibonacci Crystalline Sphere
          const yVal = 1 - (i / Math.max(1, count - 1)) * 2;
          const radiusAtY = Math.sqrt(Math.max(0, 1 - yVal * yVal));
          const theta = phi * i;
          x = Math.cos(theta) * radiusAtY;
          y = yVal;
          z = Math.sin(theta) * radiusAtY;
          nx = x; ny = y; nz = z;
          const pseudoRand = ((i * 9301 + 49297) % 233280) / 233280;
          const jitter = 0.96 + pseudoRand * 0.08;
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
    }, [sphereShape, activeParticleCount]);

    // Static Base Colors Precalculation Function
    // Run ONLY on mode/palette/count changes, NEVER on per-frame loops!
    const precalculatedColors = useMemo(() => {
      const colors = new Float32Array(activeParticleCount * 3);
      const helper = new THREE.Color();

      for (let i = 0; i < activeParticleCount; i++) {
        const i3 = i * 3;
        const ny = baseNormals[i3 + 1];
        const nx = baseNormals[i3];
        const heightNorm = (ny + 1) * 0.5;

        if (autoMode) {
          const waveHarmonic = (Math.sin(nx * 2.5 + ny * 2.0) + 1) * 0.5;
          const luminanceMod = 0.78 + heightNorm * 0.28 + waveHarmonic * 0.15;
          helper.copy(autoPrimaryColor).multiplyScalar(luminanceMod);
        } else if (isLucid) {
          helper.copy(colorLucidPrimary).lerp(colorLucidSecondary, heightNorm);
        } else {
          helper.copy(palColor1).lerp(palColor2, heightNorm).lerp(palColor3, Math.abs(nx) * 0.4);
        }

        colors[i3] = helper.r;
        colors[i3 + 1] = helper.g;
        colors[i3 + 2] = helper.b;
      }

      return colors;
    }, [
      activeParticleCount,
      baseNormals,
      autoMode,
      isLucid,
      autoPrimaryColor,
      colorLucidPrimary,
      colorLucidSecondary,
      palColor1,
      palColor2,
      palColor3,
    ]);

    // BufferGeometry with static usage for zero CPU->GPU per-frame transfer
    const { geometry } = useMemo(() => {
      const geo = new THREE.BufferGeometry();
      const posAttr = new THREE.BufferAttribute(initialPositions, 3);
      posAttr.setUsage(THREE.StaticDrawUsage);

      const normAttr = new THREE.BufferAttribute(baseNormals, 3);
      normAttr.setUsage(THREE.StaticDrawUsage);

      const colAttr = new THREE.BufferAttribute(precalculatedColors, 3);
      colAttr.setUsage(THREE.StaticDrawUsage);

      geo.setAttribute('position', posAttr);
      geo.setAttribute('normal', normAttr);
      geo.setAttribute('color', colAttr);
      geo.setDrawRange(0, activeParticleCount);
      return { geometry: geo };
    }, [initialPositions, baseNormals, precalculatedColors, activeParticleCount]);

    // Cleanup WebGL resources on unmount
    useEffect(() => {
      return () => {
        geometry.dispose();
        mainShaderMaterial.dispose();
      };
    }, [geometry, mainShaderMaterial]);

    // High-performance animation loop: 0 CPU particle loops, 0 buffer re-allocations
    useFrame((state, delta) => {
      const { bass, mids, highs, energy } = getSmoothedData();
      const time = state.clock.getElapsedTime();
      const dpr = state.viewport.dpr || 1;

      // Read store configuration
      const storeState = usePlayerStore.getState();
      const musicSens = storeState.musicSensitivity ?? 1.0;
      const sphereScale = storeState.sphereScale || 1.0;
      const sphereOpacity = storeState.sphereOpacity ?? 0.9;
      const sphereWaveIntensity = storeState.sphereWaveIntensity ?? 0.85;
      const sphereBassBoomThreshold = storeState.sphereBassBoomThreshold ?? 0.45;
      const sphereBassBoomIntensity = storeState.sphereBassBoomIntensity ?? 1.0;
      const handRotation = storeState.handRotation || { x: 0, y: 0 };
      const handGesture = storeState.handGesture;
      const poseVelocity = storeState.poseVelocity || 0;
      const leftHandPos = storeState.leftHandPos;
      const rightHandPos = storeState.rightHandPos;
      const headPos = storeState.headPos;
      const handLandmarks = storeState.handLandmarks;
      const isInteracting = storeState.userInteracting;
      const vrTrackingMode = storeState.vrTrackingMode;
      const isVrActive = storeState.vrMode;

      // Exponential moving average filter scaled by sensitivity
      const effectiveBass = bass * musicSens;
      const effectiveMids = mids * musicSens;
      const effectiveHighs = highs * musicSens;
      const effectiveEnergy = energy * musicSens;

      smoothedBassRef.current += (effectiveBass - smoothedBassRef.current) * 0.28;
      smoothedMidsRef.current += (effectiveMids - smoothedMidsRef.current) * 0.28;
      smoothedHighsRef.current += (effectiveHighs - smoothedHighsRef.current) * 0.28;
      smoothedEnergyRef.current += (effectiveEnergy - smoothedEnergyRef.current) * 0.28;

      const sBass = smoothedBassRef.current;
      const sMids = smoothedMidsRef.current;
      const sHighs = smoothedHighsRef.current;
      const sEnergy = smoothedEnergyRef.current;

      // Kick transient onset & attack envelope detection
      const attackEnv = Math.max(0, sBass - prevBassRef.current);
      const effectiveKickThresh = KICK_THRESHOLD * (sphereBassBoomThreshold ? sphereBassBoomThreshold / 0.45 : 1.0);
      if (
        sBass > effectiveKickThresh &&
        attackEnv > KICK_ATTACK_DELTA &&
        time - lastKickTimeRef.current > KICK_COOLDOWN_SEC
      ) {
        shockWavesRef.current[nextWaveIdxRef.current] = time;
        nextWaveIdxRef.current = (nextWaveIdxRef.current + 1) % SHOCKWAVE_SLOTS;
        lastKickTimeRef.current = time;
      }
      prevBassRef.current = sBass;

      // Pack active shockwaves into GPU uniforms
      let activeWaveCount = 0;
      if (!isUltraEco) {
        const baseWaveStrength = BASE_WAVE_STRENGTH * (sphereWaveIntensity ?? 1.0) * (sphereBassBoomIntensity ?? 1.0);
        const effectiveWaveStrength = isEco ? baseWaveStrength * 0.5 : vrMode ? baseWaveStrength * 0.4 : baseWaveStrength;

        for (let w = 0; w < SHOCKWAVE_SLOTS; w++) {
          const waveTime = shockWavesRef.current[w];
          const age = time - waveTime;
          if (age > 0 && age <= WAVE_LIFETIME_SEC) {
            const progress = age / WAVE_LIFETIME_SEC;
            const waveRadius = progress * WAVE_MAX_RADIUS;
            const decay = 1.0 - progress;
            shockwavesUniform[activeWaveCount].set(waveRadius, effectiveWaveStrength * decay);
            activeWaveCount++;
            if (activeWaveCount >= 8) break;
          }
        }
      }

      // Fill remaining uniform slots
      for (let w = activeWaveCount; w < 8; w++) {
        shockwavesUniform[w].set(0, 0);
      }

      // Base continuous rotation & VR Tracking
      const aiMetrics = autoMode ? aiSceneDirector.getMetrics() : null;
      const rotMultiplier = (isLucid ? 1.6 : 1.0) * (aiMetrics ? aiMetrics.rotationSpeedMultiplier : 1.0);
      if (pointsRef.current) {
        if (!isInteracting) {
          if (isVrActive) {
            pointsRef.current.rotation.y += (handRotation.y - pointsRef.current.rotation.y) * 0.25;
            pointsRef.current.rotation.x += (handRotation.x - pointsRef.current.rotation.x) * 0.25;
          } else {
            pointsRef.current.rotation.y += delta * (0.12 + sMids * 0.45) * rotMultiplier;
            pointsRef.current.rotation.x = Math.sin(time * 0.25) * (0.08 + sMids * 0.15);
            pointsRef.current.rotation.z = Math.cos(time * 0.2) * (0.04 + sBass * 0.1);
          }
        }

        // Layer 1: Auto-Fit Base Scale & Breathing Pump
        const shortestSide = Math.min(state.size.width, state.size.height);
        const autoFitBaseScale = Math.max(0.85, Math.min(1.4, shortestSide / 620));
        const userMultiplier = sphereScale || 1.0;

        const danceBoost = isVrActive ? 1.0 + poseVelocity * 0.55 : 1.0;
        const gestureBoost = handGesture === 'closed' || handGesture === 'fist' ? 0.25 : 0;
        const leftHandBoost = vrTrackingMode === 'body' && leftHandPos && leftHandPos.y < 0 ? 0.35 : 0;
        const bassPump = (0.92 + Math.pow(Math.max(0, sBass), 1.1) * (0.32 + (isLucid ? 0.15 : 0)) + gestureBoost + leftHandBoost) * danceBoost;

        const targetScaleVal = autoFitBaseScale * userMultiplier * bassPump;
        smoothScaleVec.set(targetScaleVal, targetScaleVal, targetScaleVal);
        pointsRef.current.scale.lerp(smoothScaleVec, 0.14);

        // VR Push vectors setup
        const vrPush1 = mainShaderMaterial.uniforms.uVRPush1.value as THREE.Vector4;
        const vrPush2 = mainShaderMaterial.uniforms.uVRPush2.value as THREE.Vector4;
        vrPush1.set(0, 0, 0, 0);
        vrPush2.set(0, 0, 0, 0);

        if (isVrActive) {
          if (vrTrackingMode === 'body') {
            if (rightHandPos) {
              vrPush1.set(rightHandPos.x * 0.25, rightHandPos.y * 0.25, (rightHandPos.z || 0) * 0.25, 0.25);
            }
            if (leftHandPos) {
              vrPush2.set(leftHandPos.x * 0.25, leftHandPos.y * 0.25, (leftHandPos.z || 0) * 0.25, 0.25 + sBass * 0.3);
            }
          } else if (handLandmarks && handLandmarks.length > 0) {
            const tip = handLandmarks[8] || handLandmarks[0];
            const hx = (1.0 - tip.x - 0.5) * 2.8;
            const hy = (0.5 - tip.y) * 2.8;
            vrPush1.set(hx, hy, 0, 0.35);
          }
        }

        // Update GPU Uniforms (Instant, 0 CPU loop)
        const turb = aiMetrics ? aiMetrics.turbulenceFactor : 1.0;
        const u = mainShaderMaterial.uniforms;
        u.uTime.value = time;
        u.uBass.value = sBass * turb;
        u.uMids.value = sMids * turb;
        u.uHighs.value = sHighs * turb;
        u.uEnergy.value = sEnergy * turb;
        u.uShape.value = getShapeId(sphereShape);
        u.uSize.value = isLucid ? 0.058 : isUltraEco ? 0.054 : isEco ? 0.050 : 0.046;
        u.uOpacity.value = isLucid ? 1.0 : isUltraEco ? Math.min(1.0, sphereOpacity + 0.1) : sphereOpacity;
        u.uAudioGlow.value = 1.0 + sHighs * 0.35 + (sBass > 0.45 ? 0.2 : 0.0);
        u.uHeadYOffset.value = headPos ? (headPos.y / 6) * 0.15 : 0;
        u.uNumShockwaves.value = activeWaveCount;
        u.uPixelRatio.value = dpr;
      }
    });

    return (
      <group ref={groupRef}>
        {/* Pure Elegant 3D Shape Particles ("Arena de Mar") */}
        <points
          ref={pointsRef}
          renderOrder={1}
          geometry={geometry}
          material={mainShaderMaterial}
        />
      </group>
    );
  }
);

export default SphereVisualizer;
