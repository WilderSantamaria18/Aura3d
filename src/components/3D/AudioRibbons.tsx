import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayerStore } from '../../stores/playerStore';
import { audioEngine } from '../../services/audioEngine';

/**
 * AudioRibbons
 * Cintas flotantes de luz 3D que serpentean alrededor del espacio de la escena
 * moduladas en tiempo real por los agudos (voces/melodías) y medios.
 */
export const AudioRibbons: React.FC = React.memo(() => {
  const showAudioRibbons = usePlayerStore((s) => s.showAudioRibbons);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme.primary || '#00f2fe');
  const lucidSecondary = usePlayerStore((s) => s.lucidSecondaryColor || s.lucidTheme.secondary || '#ff088a');

  const ribbon1Ref = useRef<THREE.Mesh>(null);
  const ribbon2Ref = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Generate toroidal / helical ribbon geometry
  const [geom1, geom2] = useMemo(() => {
    const curvePoints1: THREE.Vector3[] = [];
    const curvePoints2: THREE.Vector3[] = [];
    const segments = 90;

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      // Ribbon 1: Horizontal tilted orbit
      const r1 = 2.8 + Math.sin(t * 3) * 0.45;
      const x1 = Math.cos(t) * r1;
      const y1 = Math.sin(t * 2) * 0.85;
      const z1 = Math.sin(t) * r1;
      curvePoints1.push(new THREE.Vector3(x1, y1, z1));

      // Ribbon 2: Vertical helical loop
      const r2 = 3.2 + Math.cos(t * 2) * 0.4;
      const x2 = Math.sin(t) * r2;
      const y2 = Math.cos(t) * (r2 * 0.9);
      const z2 = Math.sin(t * 3) * 0.9;
      curvePoints2.push(new THREE.Vector3(x2, y2, z2));
    }

    const c1 = new THREE.CatmullRomCurve3(curvePoints1, true);
    const c2 = new THREE.CatmullRomCurve3(curvePoints2, true);

    const g1 = new THREE.TubeGeometry(c1, 80, 0.035, 6, true);
    const g2 = new THREE.TubeGeometry(c2, 80, 0.03, 6, true);

    return [g1, g2];
  }, []);

  const color1 = useMemo(() => new THREE.Color(isLucid ? lucidPrimary : '#00f2fe'), [isLucid, lucidPrimary]);
  const color2 = useMemo(() => new THREE.Color(isLucid ? lucidSecondary : '#ff088a'), [isLucid, lucidSecondary]);

  useFrame((state, delta) => {
    if (!showAudioRibbons || !groupRef.current) return;

    const t = state.clock.getElapsedTime();
    const freq = audioEngine.getFrequencyData();
    const highs = freq.highs || 0;
    const mids = freq.mids || 0;

    // Fluid orbital rotation modulated by treble
    groupRef.current.rotation.y += delta * (0.25 + mids * 0.6);
    groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.25;

    if (ribbon1Ref.current) {
      ribbon1Ref.current.rotation.z += delta * (0.4 + highs * 0.8);
      const scale1 = 1.0 + highs * 0.22;
      ribbon1Ref.current.scale.set(scale1, scale1, scale1);
    }

    if (ribbon2Ref.current) {
      ribbon2Ref.current.rotation.y -= delta * (0.3 + mids * 0.7);
      const scale2 = 1.0 + mids * 0.18;
      ribbon2Ref.current.scale.set(scale2, scale2, scale2);
    }
  });

  if (!showAudioRibbons) return null;

  return (
    <group ref={groupRef} position={[0, 0.35, 0]}>
      {/* Ribbon 1: Cyan / Primary Emissive Ribbon */}
      <mesh ref={ribbon1Ref} geometry={geom1}>
        <meshStandardMaterial
          color={color1}
          emissive={color1}
          emissiveIntensity={1.4}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Ribbon 2: Magenta / Secondary Emissive Ribbon */}
      <mesh ref={ribbon2Ref} geometry={geom2}>
        <meshStandardMaterial
          color={color2}
          emissive={color2}
          emissiveIntensity={1.2}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
});

export default AudioRibbons;
