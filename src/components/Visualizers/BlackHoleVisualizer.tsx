import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayerStore } from '../../stores/playerStore';
import { useAIAudioEngine } from '../../hooks/useAIAudioEngine';

// ── Black Hole Accretion Disk Custom Shader ──────────────────────────────────
const AccretionDiskShader = {
  uniforms: {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uTreble: { value: 0 },
    uPrimaryColor: { value: new THREE.Color('#00e5ff') },
    uSecondaryColor: { value: new THREE.Color('#ff0055') },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    uniform float uTreble;
    uniform vec3 uPrimaryColor;
    uniform vec3 uSecondaryColor;

    varying vec2 vUv;
    varying vec3 vPosition;

    // Simplex Noise helpers
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m;
      m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      // Distance from center on the disk
      float dist = length(vPosition.xz);
      float innerRadius = 1.35;
      float outerRadius = 5.2 + uBass * 1.2;

      if (dist < innerRadius || dist > outerRadius) {
        discard;
      }

      // Normalized radial coordinate [0..1]
      float rNorm = (dist - innerRadius) / (outerRadius - innerRadius);

      // Polar angle
      float angle = atan(vPosition.z, vPosition.x);

      // Keplerian differential rotation: inner orbits faster (1/r^1.5)
      float keplerSpeed = 2.2 / pow(max(0.6, dist), 1.2);
      float rotation = angle + uTime * keplerSpeed;

      // Multi-octave procedural plasma turbulence
      vec2 uvNoise = vec2(cos(rotation) * dist * 1.5, sin(rotation) * dist * 1.5);
      float n1 = snoise(uvNoise * 1.2 + vec2(uTime * 0.4));
      float n2 = snoise(uvNoise * 2.8 - vec2(uTime * 0.7));
      float plasma = n1 * 0.65 + n2 * 0.35;

      // Relativistic Doppler beaming (left side approaches camera -> brighter & blue-shifted)
      float doppler = 1.0 + 0.65 * sin(angle);

      // Radial density profile with glowing inner photon edge
      float innerGlow = pow(1.0 - smoothstep(innerRadius, innerRadius + 0.3, dist), 2.0) * 3.5;
      float diskBody = sin(rNorm * 3.14159);
      diskBody = pow(diskBody, 0.8) * (0.8 + plasma * 0.45);

      float intensity = (diskBody + innerGlow) * doppler * (1.0 + uBass * 0.8);

      // Color thermal gradient: Core white/cyan -> Body cyan/purple -> Outer amber/crimson
      vec3 coreColor = vec3(1.0, 1.0, 1.0);
      vec3 midColor = uPrimaryColor;
      vec3 edgeColor = uSecondaryColor;

      vec3 color = mix(coreColor, midColor, smoothstep(0.0, 0.35, rNorm));
      color = mix(color, edgeColor, smoothstep(0.35, 1.0, rNorm));

      // Extra kick flash on sub-bass
      color += vec3(0.2, 0.1, 0.3) * uBass;

      float alpha = clamp(intensity * 0.9, 0.0, 1.0);
      gl_FragColor = vec4(color * intensity, alpha);
    }
  `,
};

// ── Gravitational Lensing Halo (Photonic Ring) Shader ─────────────────────────
const PhotonicRingShader = {
  uniforms: {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uColor: { value: new THREE.Color('#00e5ff') },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uBass;
    uniform vec3 uColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);

      // Rim / Fresnel effect representing curved light paths around Schwarzschild radius
      float fresnel = 1.0 - abs(dot(normal, viewDir));
      fresnel = pow(fresnel, 4.5);

      float pulse = 1.0 + uBass * 0.9;
      vec3 glowColor = mix(uColor, vec3(1.0, 1.0, 1.0), 0.4);

      gl_FragColor = vec4(glowColor * pulse * 2.0, fresnel * 0.95);
    }
  `,
};

// ── Cosmic Background Stars with Gravitational Deflection ─────────────────────
const LensedStarfield: React.FC<{ count?: number }> = ({ count = 900 }) => {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 16.0 + Math.random() * 24.0;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const colorVariance = Math.random();
      if (colorVariance > 0.7) {
        cols[i * 3] = 0.6;
        cols[i * 3 + 1] = 0.8;
        cols[i * 3 + 2] = 1.0; // Cool blue
      } else if (colorVariance > 0.4) {
        cols[i * 3] = 1.0;
        cols[i * 3 + 1] = 0.9;
        cols[i * 3 + 2] = 0.7; // Warm amber
      } else {
        cols[i * 3] = 1.0;
        cols[i * 3 + 1] = 1.0;
        cols[i * 3 + 2] = 1.0; // Pure white
      }
    }
    return [pos, cols];
  }, [count]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.18}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// ── Black Hole Singularity Core & Accretion System ────────────────────────────
const BlackHoleCore: React.FC<{
  primaryColor: string;
  secondaryColor: string;
}> = ({ primaryColor, secondaryColor }) => {
  const diskMeshRef = useRef<THREE.Mesh>(null);
  const verticalDiskRef = useRef<THREE.Mesh>(null);
  const photonicSphereRef = useRef<THREE.Mesh>(null);
  const jetPointsRef = useRef<THREE.Points>(null);

  const { getSmoothedData } = useVisualizer();
  const diskMatRef = useRef<THREE.ShaderMaterial>(null);
  const verticalDiskMatRef = useRef<THREE.ShaderMaterial>(null);
  const photonicMatRef = useRef<THREE.ShaderMaterial>(null);

  // Relativistic Jets Particles (Ejected from north and south poles on heavy beats)
  const [jetPositions, jetVelocities] = useMemo(() => {
    const pCount = 300;
    const pos = new Float32Array(pCount * 3);
    const vel = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      const isNorth = i % 2 === 0;
      pos[i * 3] = (Math.random() - 0.5) * 0.2;
      pos[i * 3 + 1] = isNorth ? 1.0 + Math.random() * 0.5 : -1.0 - Math.random() * 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

      vel[i * 3] = (Math.random() - 0.5) * 0.1;
      vel[i * 3 + 1] = isNorth ? 4.0 + Math.random() * 6.0 : -4.0 - Math.random() * 6.0;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    }
    return [pos, vel];
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const audioData = getSmoothedData();
    const bass = audioData ? audioData.bass * 1.3 : 0.0;
    const mid = audioData ? audioData.mids : 0.0;
    const treble = audioData ? audioData.highs : 0.0;

    // Update Accretion Disk Shader uniforms
    if (diskMatRef.current) {
      diskMatRef.current.uniforms.uTime.value = time;
      diskMatRef.current.uniforms.uBass.value = bass;
      diskMatRef.current.uniforms.uMid.value = mid;
      diskMatRef.current.uniforms.uTreble.value = treble;
      diskMatRef.current.uniforms.uPrimaryColor.value.set(primaryColor);
      diskMatRef.current.uniforms.uSecondaryColor.value.set(secondaryColor);
    }

    // Update Vertical Lensed Projection (Gargantua gravitational bending over the top)
    if (verticalDiskMatRef.current) {
      verticalDiskMatRef.current.uniforms.uTime.value = time;
      verticalDiskMatRef.current.uniforms.uBass.value = bass;
      verticalDiskMatRef.current.uniforms.uMid.value = mid;
      verticalDiskMatRef.current.uniforms.uTreble.value = treble;
      verticalDiskMatRef.current.uniforms.uPrimaryColor.value.set(primaryColor);
      verticalDiskMatRef.current.uniforms.uSecondaryColor.value.set(secondaryColor);
    }

    if (photonicMatRef.current) {
      photonicMatRef.current.uniforms.uTime.value = time;
      photonicMatRef.current.uniforms.uBass.value = bass;
      photonicMatRef.current.uniforms.uColor.value.set(primaryColor);
    }

    // Disk gentle tilt animation
    if (diskMeshRef.current) {
      diskMeshRef.current.rotation.z = Math.sin(time * 0.15) * 0.08;
    }

    // Animate Relativistic Jet Particles
    if (jetPointsRef.current) {
      const geom = jetPointsRef.current.geometry;
      const attr = geom.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;

      const boost = 1.0 + bass * 2.0;

      for (let i = 0; i < jetPositions.length / 3; i++) {
        const yIdx = i * 3 + 1;
        arr[yIdx] += jetVelocities[yIdx] * delta * boost;

        // Reset when reaching bounds
        if (Math.abs(arr[yIdx]) > 8.0) {
          const isNorth = i % 2 === 0;
          arr[i * 3] = (Math.random() - 0.5) * 0.2;
          arr[yIdx] = isNorth ? 1.0 : -1.0;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
        }
      }
      attr.needsUpdate = true;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Event Horizon: True Black Void Sphere */}
      <mesh>
        <sphereGeometry args={[1.25, 64, 64]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* 2. Photonic Ring (Gravitational Lensing Light Boundary) */}
      <mesh ref={photonicSphereRef}>
        <sphereGeometry args={[1.32, 64, 64]} />
        <shaderMaterial
          ref={photonicMatRef}
          vertexShader={PhotonicRingShader.vertexShader}
          fragmentShader={PhotonicRingShader.fragmentShader}
          uniforms={PhotonicRingShader.uniforms}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>

      {/* 3. Primary Accretion Disk (Horizontal Plane) */}
      <mesh ref={diskMeshRef} rotation={[-Math.PI * 0.42, 0, 0]}>
        <planeGeometry args={[12, 12, 1, 1]} />
        <shaderMaterial
          ref={diskMatRef}
          vertexShader={AccretionDiskShader.vertexShader}
          fragmentShader={AccretionDiskShader.fragmentShader}
          uniforms={AccretionDiskShader.uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 4. Gravitationally Lensed Vertical Arc (Interstellar curved halo around top) */}
      <mesh ref={verticalDiskRef} rotation={[0, 0, 0]}>
        <planeGeometry args={[11, 11, 1, 1]} />
        <shaderMaterial
          ref={verticalDiskMatRef}
          vertexShader={AccretionDiskShader.vertexShader}
          fragmentShader={AccretionDiskShader.fragmentShader}
          uniforms={AccretionDiskShader.uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 5. Relativistic Jets (Polar particle ejecta) */}
      <points ref={jetPointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[jetPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          color={primaryColor}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

// ── Cinematic Camera Controller ───────────────────────────────────────────────
const BlackHoleCameraController: React.FC = () => {
  const { camera } = useThree();
  const angleRef = useRef(0);

  useFrame((_, delta) => {
    angleRef.current += delta * 0.15;
    const distance = 8.8;
    const x = Math.sin(angleRef.current) * distance;
    const z = Math.cos(angleRef.current) * distance;
    const y = 1.4 + Math.sin(angleRef.current * 0.5) * 0.6;

    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  });

  return null;
};

// ── Main Exported Visualizer Component ────────────────────────────────────────
export const BlackHoleVisualizer: React.FC = () => {
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme.primary);
  const lucidSecondary = usePlayerStore((s) => s.lucidSecondaryColor || s.lucidTheme.secondary);
  const { primaryColor: aiColor } = useAIAudioEngine();

  const primary = isLucid ? (lucidPrimary || '#00e5ff') : (aiColor || '#00e5ff');
  const secondary = isLucid ? (lucidSecondary || '#ff0055') : '#ff0055';

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-auto bg-[#020205]">
      <Canvas
        camera={{ position: [0, 1.4, 8.8], fov: 48 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        dpr={[1.0, 1.5]}
      >
        <BlackHoleCameraController />
        <ambientLight intensity={0.2} />

        {/* Deep Cosmic Space */}
        <LensedStarfield count={900} />

        {/* Black Hole Singularity */}
        <BlackHoleCore primaryColor={primary} secondaryColor={secondary} />
      </Canvas>
    </div>
  );
};

export default BlackHoleVisualizer;
