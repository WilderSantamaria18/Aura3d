import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useLyrics } from '../../hooks/useLyrics';
import { usePlayerStore } from '../../stores/playerStore';

export const FloatingLyrics3D: React.FC = () => {
  const { lyricsData, activeLineIndex } = useLyrics();
  const isLyrics3DActive = usePlayerStore((s) => s.isLyrics3DActive);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidPrimary = usePlayerStore((s) => s.lucidPrimaryColor || s.lucidTheme.primary || '#00e5ff');
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const groupRef = useRef<THREE.Group>(null);
  const targetYRef = useRef(0);
  const currentYRef = useRef(0);

  // Smooth vertical lerp on line changes
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const lerpSpeed = Math.min(1, delta * 8);
    currentYRef.current += (targetYRef.current - currentYRef.current) * lerpSpeed;
    groupRef.current.position.y = currentYRef.current;
  });

  if (!isLyrics3DActive) return null;

  const lines = lyricsData.lines;
  const hasLyrics = lines && lines.length > 0 && activeLineIndex >= 0;

  // Active color based on lucid or cyan
  const activeColor = isLucid ? lucidPrimary : '#00e5ff';
  const inactiveColor = '#ffffff';

  // Window of lines around active index (-2 to +3)
  const windowLines: { lineIndex: number; text: string; offset: number }[] = [];
  if (hasLyrics) {
    for (let offset = -2; offset <= 3; offset++) {
      const idx = activeLineIndex + offset;
      if (idx >= 0 && idx < lines.length) {
        windowLines.push({
          lineIndex: idx,
          text: lines[idx].text,
          offset,
        });
      }
    }
  }

  return (
    <Billboard
      position={[0, 0.4, -2.4]}
      follow={true}
      lockX={false}
      lockY={false}
      lockZ={false}
    >
      <group ref={groupRef}>
        {!hasLyrics ? (
          // Ambient 3D floating track card when no lyrics are available
          <group position={[0, 0, 0]}>
            <Text
              fontSize={0.24}
              color={activeColor}
              anchorX="center"
              anchorY="middle"
              maxWidth={5.5}
              textAlign="center"
              fillOpacity={0.65}
              outlineWidth={0.012}
              outlineColor="#000000"
            >
              {currentTrack?.title || 'Aura3D Music'}
            </Text>
            <Text
              position={[0, -0.32, 0]}
              fontSize={0.15}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              maxWidth={5.0}
              textAlign="center"
              fillOpacity={0.35}
              outlineWidth={0.008}
              outlineColor="#000000"
            >
              {currentTrack?.artist || 'Modo Inmersivo 3D'}
            </Text>
          </group>
        ) : (
          // Synchronized Floating 3D Karaoke Verses
          windowLines.map(({ lineIndex, text, offset }) => {
            const isActive = offset === 0;
            const isPast = offset < 0;
            const isFuture = offset > 0;

            // Compute vertical slot: active is centered at y = 0
            // Past lines ascend (y > 0), future lines descend (y < 0)
            const posY = -offset * 0.42;

            // Opacity & Scale curve
            const opacity = isActive
              ? 1.0
              : Math.abs(offset) === 1
              ? 0.45
              : 0.20;

            const fontSize = isActive ? 0.28 : Math.abs(offset) === 1 ? 0.20 : 0.16;

            return (
              <group key={lineIndex} position={[0, posY, 0]}>
                <Text
                  fontSize={fontSize}
                  color={isActive ? activeColor : inactiveColor}
                  anchorX="center"
                  anchorY="middle"
                  maxWidth={6.2}
                  textAlign="center"
                  fillOpacity={opacity}
                  outlineWidth={isActive ? 0.015 : 0.008}
                  outlineColor="#000000"
                >
                  {text}
                </Text>
              </group>
            );
          })
        )}
      </group>
    </Billboard>
  );
};

export default FloatingLyrics3D;
