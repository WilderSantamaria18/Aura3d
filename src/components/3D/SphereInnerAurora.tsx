import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayerStore } from '../../stores/playerStore';
import type { SphereAudioRefData } from './SphereHalo';

interface SphereInnerAuroraProps {
  audioRef: React.MutableRefObject<SphereAudioRefData>;
}

const AuroraShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uBass;
    uniform float uEnergy;
    uniform float uIsLucid;
    uniform vec3 uLucidPrimary;
    uniform vec3 uLucidSecondary;

    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      // Soft radial gradient from center-up (cyan) to center-down (magenta) through violet
      float height = clamp((vPosition.y + 0.8) / 1.6, 0.0, 1.0);
      float organicWave = sin(vPosition.x * 2.5 + uTime * 1.5) * 0.15;
      float t = clamp(height + organicWave, 0.0, 1.0);

      // Rainbow Aurora palette: Cyan -> Violet -> Magenta
      vec3 colCyan = vec3(0.000, 0.949, 0.996);
      vec3 colViolet = vec3(0.541, 0.169, 0.886);
      vec3 colMagenta = vec3(1.000, 0.031, 0.541);

      vec3 color;
      if (uIsLucid > 0.5) {
        color = mix(uLucidPrimary, uLucidSecondary, t);
      } else {
        if (t < 0.5) {
          color = mix(colMagenta, colViolet, t * 2.0);
        } else {
          color = mix(colViolet, colCyan, (t - 0.5) * 2.0);
        }
      }

      // Soft rim / volume fresnel falloff for gas-like atmospheric appearance
      vec3 viewDir = vec3(0.0, 0.0, 1.0);
      float fresnel = 1.0 - abs(dot(vNormal, viewDir));
      float coreGlow = smoothstep(0.0, 0.9, fresnel) * 0.7 + 0.3;

      float baseAlpha = 0.32 + uBass * 0.18 + uEnergy * 0.1;
      float alpha = clamp(coreGlow * baseAlpha, 0.0, 0.65);

      gl_FragColor = vec4(color * (1.0 + uBass * 0.3), alpha);
    }
  `,
};

export const SphereInnerAurora: React.FC<SphereInnerAuroraProps> = React.memo(
  ({ audioRef }) => {
    const isLucid = usePlayerStore((s) => s.isLucid);
    const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme.primary);
    const lucidSecondary = usePlayerStore((s) => s.lucidSecondaryColor || s.lucidTheme.secondary);

    const meshRef = useRef<THREE.Mesh>(null);

    const material = useMemo(() => {
      return new THREE.ShaderMaterial({
        vertexShader: AuroraShader.vertexShader,
        fragmentShader: AuroraShader.fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uBass: { value: 0 },
          uEnergy: { value: 0 },
          uIsLucid: { value: isLucid ? 1.0 : 0.0 },
          uLucidPrimary: { value: new THREE.Color(lucidPrimary) },
          uLucidSecondary: { value: new THREE.Color(lucidSecondary) },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: true,
      });
    }, [isLucid, lucidPrimary, lucidSecondary]);

    const geometry = useMemo(() => new THREE.SphereGeometry(0.82, 32, 32), []);

    useFrame((state) => {
      const time = state.clock.getElapsedTime();
      const sBass = audioRef.current.sBass;
      const sEnergy = audioRef.current.sEnergy;

      material.uniforms.uTime.value = time;
      material.uniforms.uBass.value = sBass;
      material.uniforms.uEnergy.value = sEnergy;
      material.uniforms.uIsLucid.value = isLucid ? 1.0 : 0.0;

      if (meshRef.current) {
        // Internal organic breathing rotation and scale
        meshRef.current.rotation.y += 0.006;
        meshRef.current.rotation.x = Math.sin(time * 0.6) * 0.08;
        const breathScale = 0.82 + sBass * 0.12 + Math.sin(time * 1.6) * 0.03;
        meshRef.current.scale.set(breathScale, breathScale, breathScale);
      }
    });

    return <mesh ref={meshRef} geometry={geometry} material={material} renderOrder={0} />;
  }
);

export default SphereInnerAurora;
