import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayerStore } from '../../stores/playerStore';

export interface SphereAudioRefData {
  sBass: number;
  sMids: number;
  sHighs: number;
  sEnergy: number;
  raw: Uint8Array;
}

interface SphereHaloProps {
  audioRef: React.MutableRefObject<SphereAudioRefData>;
}

// Custom Shader for 3D Rainbow Conic Gradient Halo
const HaloShader = {
  vertexShader: `
    varying vec3 vPosition;
    void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uBass;
    uniform float uIsLucid;
    uniform float uAutoMode;
    uniform vec3 uLucidPrimary;
    uniform vec3 uLucidSecondary;
    uniform vec3 uDynamicColor;
    uniform float uOpacity;

    varying vec3 vPosition;

    #define PI 3.14159265359

    // 6 Rainbow stops from RainbowBlobVisualizer:
    // #ff088a, #8a2be2, #00f2fe, #00ffb3, #ffe600, #ff5e00
    vec3 getRainbowColor(float t) {
      t = fract(t);
      vec3 c0 = vec3(1.000, 0.031, 0.541); // #ff088a
      vec3 c1 = vec3(0.541, 0.169, 0.886); // #8a2be2
      vec3 c2 = vec3(0.000, 0.949, 0.996); // #00f2fe
      vec3 c3 = vec3(0.000, 1.000, 0.702); // #00ffb3
      vec3 c4 = vec3(1.000, 0.902, 0.000); // #ffe600
      vec3 c5 = vec3(1.000, 0.369, 0.000); // #ff5e00

      float seg = t * 6.0;
      if (seg < 1.0) return mix(c0, c1, seg);
      if (seg < 2.0) return mix(c1, c2, seg - 1.0);
      if (seg < 3.0) return mix(c2, c3, seg - 2.0);
      if (seg < 4.0) return mix(c3, c4, seg - 3.0);
      if (seg < 5.0) return mix(c4, c5, seg - 4.0);
      return mix(c5, c0, seg - 5.0);
    }

    void main() {
      // Calculate polar angle around Z
      float angle = atan(vPosition.y, vPosition.x);
      float normAngle = (angle + PI) / (2.0 * PI);

      // Rotate gradient slowly over time
      float rotatedAngle = normAngle - uTime * 0.12;

      vec3 color;
      if (uIsLucid > 0.5) {
        float wave = sin(rotatedAngle * PI * 2.0) * 0.5 + 0.5;
        color = mix(uLucidPrimary, uLucidSecondary, wave);
      } else if (uAutoMode > 0.5) {
        color = uDynamicColor;
      } else {
        color = getRainbowColor(rotatedAngle);
      }

      // Distance from ring center for smooth inner and outer radial feathering
      float dist = length(vPosition.xy);
      // Ring spans from 1.15 to 2.45
      float innerEdge = smoothstep(1.15, 1.45, dist);
      float outerEdge = 1.0 - smoothstep(1.75, 2.45, dist);
      float radialGlow = innerEdge * outerEdge;

      float alpha = radialGlow * (uOpacity + uBass * 0.25);
      gl_FragColor = vec4(color * (1.1 + uBass * 0.4), alpha);
    }
  `,
};

export const SphereHalo: React.FC<SphereHaloProps> = React.memo(({ audioRef }) => {
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme.primary);
  const lucidSecondary = usePlayerStore((s) => s.lucidSecondaryColor || s.lucidTheme.secondary);
  const autoMode = usePlayerStore((s) => s.autoMode);
  const dynamicColor = usePlayerStore((s) => s.dynamicColor || '#00f2fe');

  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: HaloShader.vertexShader,
      fragmentShader: HaloShader.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uIsLucid: { value: isLucid ? 1.0 : 0.0 },
        uAutoMode: { value: autoMode ? 1.0 : 0.0 },
        uLucidPrimary: { value: new THREE.Color(lucidPrimary) },
        uLucidSecondary: { value: new THREE.Color(lucidSecondary) },
        uDynamicColor: { value: new THREE.Color(dynamicColor) },
        uOpacity: { value: 0.65 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true,
    });
  }, [isLucid, autoMode, lucidPrimary, lucidSecondary, dynamicColor]);

  // Geometry: Smooth Ring surrounding the sphere
  const geometry = useMemo(() => new THREE.RingGeometry(1.15, 2.45, 64), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const sBass = audioRef.current.sBass;

    material.uniforms.uTime.value = time;
    material.uniforms.uBass.value = sBass;
    material.uniforms.uIsLucid.value = isLucid ? 1.0 : 0.0;
    material.uniforms.uAutoMode.value = autoMode ? 1.0 : 0.0;

    // Billboard orientation: align gently with camera so halo is always fully visible
    if (meshRef.current) {
      meshRef.current.quaternion.copy(state.camera.quaternion);
      // Soft breathing scale with bass
      const targetScale = 1.0 + sBass * 0.14;
      meshRef.current.scale.set(targetScale, targetScale, 1.0);
    }
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} renderOrder={-1} />;
});

export default SphereHalo;
