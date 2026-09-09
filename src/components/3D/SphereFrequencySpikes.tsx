import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayerStore } from '../../stores/playerStore';
import type { SphereAudioRefData } from './SphereHalo';

interface SphereFrequencySpikesProps {
  audioRef: React.MutableRefObject<SphereAudioRefData>;
}

const BAR_COUNT = 48;

export const SphereFrequencySpikes: React.FC<SphereFrequencySpikesProps> = React.memo(
  ({ audioRef }) => {
    const isLucid = usePlayerStore((s) => s.isLucid);
    const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme.primary);
    const autoMode = usePlayerStore((s) => s.autoMode);
    const dynamicColor = usePlayerStore((s) => s.dynamicColor || '#00f2fe');

    const linesRef = useRef<THREE.LineSegments>(null);

    const { geometry, positions, colors } = useMemo(() => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(BAR_COUNT * 2 * 3);
      const col = new Float32Array(BAR_COUNT * 2 * 3);

      const posAttr = new THREE.BufferAttribute(pos, 3);
      posAttr.setUsage(THREE.DynamicDrawUsage);
      const colAttr = new THREE.BufferAttribute(col, 3);
      colAttr.setUsage(THREE.DynamicDrawUsage);

      geo.setAttribute('position', posAttr);
      geo.setAttribute('color', colAttr);

      return { geometry: geo, positions: pos, colors: col };
    }, []);

    const material = useMemo(() => {
      return new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
      });
    }, []);

    const tempColor = useMemo(() => new THREE.Color(), []);

    useFrame((state) => {
      const time = state.clock.getElapsedTime();
      const { raw, sBass } = audioRef.current;

      for (let i = 0; i < BAR_COUNT; i++) {
        const barAngle = (i / BAR_COUNT) * Math.PI * 2 + time * 0.15;
        const rawVal = raw[i % raw.length] || 0;
        const barLen = 0.06 + (rawVal / 255) * 0.72 * (1 + sBass * 0.45);

        const baseRadius = 1.04;
        const outerRadius = baseRadius + barLen;

        const cosA = Math.cos(barAngle);
        const sinA = Math.sin(barAngle);

        const vIdx = i * 2 * 3;

        // Inner vertex
        positions[vIdx] = cosA * baseRadius;
        positions[vIdx + 1] = sinA * baseRadius;
        positions[vIdx + 2] = 0;

        // Outer vertex
        positions[vIdx + 3] = cosA * outerRadius;
        positions[vIdx + 4] = sinA * outerRadius;
        positions[vIdx + 5] = 0;

        // Rainbow Hue rotation: (i * (360 / BAR_COUNT) + time * 25) % 360
        const barHue = (i * (360 / BAR_COUNT) + time * 25) % 360;

        if (isLucid) {
          tempColor.set(lucidPrimary);
        } else if (autoMode) {
          tempColor.set(dynamicColor);
        } else {
          tempColor.setHSL(barHue / 360, 0.9, 0.62);
        }

        // Inner color slightly darker, outer color full bright
        colors[vIdx] = tempColor.r * 0.6;
        colors[vIdx + 1] = tempColor.g * 0.6;
        colors[vIdx + 2] = tempColor.b * 0.6;

        colors[vIdx + 3] = tempColor.r;
        colors[vIdx + 4] = tempColor.g;
        colors[vIdx + 5] = tempColor.b;
      }

      if (linesRef.current) {
        const posAttr = linesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const colAttr = linesRef.current.geometry.attributes.color as THREE.BufferAttribute;
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
      }
    });

    return <lineSegments ref={linesRef} geometry={geometry} material={material} renderOrder={2} />;
  }
);

export default SphereFrequencySpikes;
