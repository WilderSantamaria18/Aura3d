import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayerStore } from '../../stores/playerStore';
import type { SphereAudioRefData } from './SphereHalo';

interface SphereOrbitalRingsProps {
  audioRef: React.MutableRefObject<SphereAudioRefData>;
}

const NUM_RINGS = 5;
const BASE_RADII = [1.38, 1.62, 1.88, 2.14, 2.40];
const RING_TILTS = [
  { x: 0.12, z: 0.08 },
  { x: -0.15, z: 0.18 },
  { x: 0.22, z: -0.14 },
  { x: -0.18, z: -0.20 },
  { x: 0.08, z: 0.25 },
];

export const SphereOrbitalRings: React.FC<SphereOrbitalRingsProps> = React.memo(({ audioRef }) => {
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme.primary);
  const autoMode = usePlayerStore((s) => s.autoMode);
  const dynamicColor = usePlayerStore((s) => s.dynamicColor || '#00f2fe');

  const groupRef = useRef<THREE.Group>(null);
  const ringMeshesRef = useRef<(THREE.Mesh | null)[]>([]);
  const satMeshesRef = useRef<(THREE.Mesh | null)[]>([]);

  // Geometries for rings and satellites (shared across rings)
  const ringGeometries = useMemo(() => {
    return BASE_RADII.map((radius) => new THREE.TorusGeometry(radius, 0.011, 8, 80));
  }, []);

  const satGeometry = useMemo(() => new THREE.SphereGeometry(0.042, 16, 16), []);
  const satMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  // Materials for 5 rings
  const ringMaterials = useMemo(() => {
    return Array.from({ length: NUM_RINGS }, () => {
      return new THREE.MeshBasicMaterial({
        color: '#00f2fe',
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
      });
    });
  }, []);

  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const sBass = audioRef.current.sBass;

    for (let rIdx = 0; rIdx < NUM_RINGS; rIdx++) {
      const ringMesh = ringMeshesRef.current[rIdx];
      const satMesh = satMeshesRef.current[rIdx];
      const mat = ringMaterials[rIdx];

      // Dynamic Hue rotation matching RainbowBlobVisualizer:
      // (rIdx * 55 + timeSec * 35) % 360
      const ringHue = isLucid ? (rIdx * 45) % 360 : (rIdx * 55 + time * 35) % 360;
      const ringAlpha = Math.min(0.9, 0.45 + Math.sin(time * 3 + rIdx) * 0.18 + sBass * 0.28);

      if (isLucid) {
        tempColor.set(lucidPrimary);
      } else if (autoMode) {
        tempColor.set(dynamicColor);
      } else {
        tempColor.setHSL(ringHue / 360, 0.88, 0.62);
      }

      mat.color.copy(tempColor);
      mat.opacity = ringAlpha;

      // Pulse ring radius with bass
      const ringScale = 1.0 + sBass * 0.12;
      const baseR = BASE_RADII[rIdx];
      const currentR = baseR * ringScale;

      if (ringMesh) {
        ringMesh.scale.set(ringScale, ringScale, ringScale);
        ringMesh.rotation.z += 0.002 * (rIdx % 2 === 0 ? 1 : -1);
      }

      // Orbital satellite motion
      if (satMesh) {
        const satAngle = time * (0.75 + rIdx * 0.28) + rIdx;
        const tilt = RING_TILTS[rIdx];

        // Position on tilted circular orbit
        const localX = Math.cos(satAngle) * currentR;
        const localY = Math.sin(satAngle) * currentR;

        // Apply tilt rotation
        const cosX = Math.cos(tilt.x);
        const sinX = Math.sin(tilt.x);
        const cosZ = Math.cos(tilt.z);
        const sinZ = Math.sin(tilt.z);

        const x1 = localX * cosZ - localY * sinZ;
        const y1 = localX * sinZ + localY * cosZ;
        const z1 = 0;

        const finalX = x1;
        const finalY = y1 * cosX - z1 * sinX;
        const finalZ = y1 * sinX + z1 * cosX;

        satMesh.position.set(finalX, finalY, finalZ);
        const satScale = 1.0 + sBass * 0.55;
        satMesh.scale.set(satScale, satScale, satScale);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {BASE_RADII.map((_, i) => (
        <group key={`orbital-ring-${i}`} rotation={[RING_TILTS[i].x, 0, RING_TILTS[i].z]}>
          <mesh
            ref={(el) => (ringMeshesRef.current[i] = el)}
            geometry={ringGeometries[i]}
            material={ringMaterials[i]}
          />
        </group>
      ))}

      {/* 5 Orbital white satellites */}
      {BASE_RADII.map((_, i) => (
        <mesh
          key={`satellite-${i}`}
          ref={(el) => (satMeshesRef.current[i] = el)}
          geometry={satGeometry}
          material={satMaterial}
        />
      ))}
    </group>
  );
});

export default SphereOrbitalRings;
